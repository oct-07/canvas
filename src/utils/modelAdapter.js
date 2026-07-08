import { getParamValueChinese } from './paramsMap.js';

/**
 * 推断参数类型
 * @param {number} viewType - 后端视图类型
 * @param {string} propStr - 参数标识符
 * @returns {'duration' | 'ratio' | 'resolution' | 'switch' | 'radio'}
 */
export function inferViewType(viewType, propStr) {
  if (propStr === 'duration') return 'duration';
  if (propStr === 'aspect_ratio') return 'ratio';
  if (propStr === 'resolution_tier') return 'resolution';
  if (viewType === 4) return 'switch';
  return 'radio';
}

/**
 * 适配后端模型数据
 * @param {object} raw - 后端原始数据
 * @returns {object|null}
 */
export function adaptModel(raw) {
  if (!raw) return null;
  const propSpecs = raw.prop_list.map((prop, index) => ({
    propId: prop.prop_id,
    propKey: prop.prop_str,
    propName: prop.prop_name,
    viewType: inferViewType(prop.prop_viewtype, prop.prop_str),
    options: prop.prop_values_list.map((v) => ({
      id: v.prop_value_id,
      name: v.prop_value_name,
      label: getParamValueChinese(v.prop_value_name),
    })),
    keyIndex: index,
  }));
  return {
    id: raw.id,
    name: raw.model_name,
    type: raw.model_type,
    company: raw.model_company,
    frame: raw.model_frame,
    propSpecs,
    pointMap: raw.point_list || {},
  };
}

/**
 * 构建积分 key
 * @param {object} spec - 模型规格
 * @param {object} values - 参数值映射
 * @returns {string}
 */
export function buildPointKey(spec, values) {
  if (!spec) return '';
  return spec.propSpecs
    .map((p) => {
      const val = values[p.propKey];
      return val == null || val === '' ? '' : String(val);
    })
    .join(',');
}

/**
 * 计算积分
 * @param {object} spec - 模型规格
 * @param {object} values - 参数值映射
 * @returns {{ point: number, key: string, hit: boolean }}
 */
export function calcPoint(spec, values) {
  if (!spec) return { point: 0, key: '', hit: false };
  const key = buildPointKey(spec, values);
  const point = spec.pointMap[key];
  if (point !== undefined) return { point, key, hit: true };
  return { point: 0, key, hit: false };
}

/**
 * 切换模型时迁移参数
 * @param {object} oldSpec - 旧模型规格
 * @param {object} oldValues - 旧参数值
 * @param {object} newSpec - 新模型规格
 * @returns {object}
 */
export function migrateParams(oldSpec, oldValues, newSpec) {
  const result = {};
  for (const newProp of newSpec.propSpecs) {
    const newPropKey = newProp.propKey;
    const oldValue = oldValues?.[newPropKey];
    // 情况1：旧值存在且在新模型中有效
    if (oldValue && newProp.options.some((o) => o.id === oldValue)) {
      result[newPropKey] = oldValue;
      continue;
    }
    // 情况2：旧值存在但在新模型中无效，按 name 匹配
    if (oldValue) {
      let oldName = null;
      if (oldSpec) {
        const oldProp = oldSpec.propSpecs.find((p) => p.propKey === newPropKey);
        if (oldProp) {
          const oldOption = oldProp.options.find((o) => o.id === oldValue);
          if (oldOption) oldName = oldOption.name;
        }
      }
      if (oldName) {
        const matchedOption = newProp.options.find((o) => o.name === oldName);
        if (matchedOption) {
          result[newPropKey] = matchedOption.id;
          continue;
        }
      }
    }
    // 情况3：找不到匹配，使用新模型默认值
    result[newPropKey] = newProp.options[0]?.id;
  }
  // 清除新模型中不存在的参数（避免旧模型残留字段影响渲染）
  const newKeys = new Set(newSpec.propSpecs.map((p) => p.propKey));
  for (const key of Object.keys(result)) {
    if (!newKeys.has(key)) delete result[key];
  }
  return result;
}

/**
 * 获取参数的有效选项列表
 * @param {object} spec - 模型规格
 * @param {string} propKey - 参数标识符
 * @returns {Array}
 */
export function getValidOptions(spec, propKey) {
  if (!spec) return [];
  const paramSpec = spec.propSpecs.find((p) => p.propKey === propKey);
  return paramSpec?.options || [];
}

/**
 * 获取参数的中文标签
 * @param {object} spec - 模型规格
 * @param {object} values - 参数值映射
 * @param {string} propKey - 参数标识符
 * @returns {string|null}
 */
export function getParamLabel(spec, values, propKey) {
  if (!spec || !values) return null;
  const val = values[propKey];
  if (val == null || val === '') return null;
  const paramSpec = spec.propSpecs.find((p) => p.propKey === propKey);
  if (!paramSpec) return null;
  const option = paramSpec.options.find((o) => o.id === val);
  return option?.label || null;
}
