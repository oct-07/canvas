// 参数字段名映射
export const PARAM_NAME_MAP = {
  count: "图片数量",
  resolution_tier: "分辨率",
  aspect_ratio: "比例",
  duration: "时长",
  quality_mode: "质量",
  audio_enabled: "音频开关",
  result_mode: "结果模式",
  prompt_enhance: "提示词增强",
  web_search: "联网搜索",
};

// 参数选项值中英文映射
export const PARAM_VALUE_MAP = {
  high: "高质量",
  medium: "中等",
  low: "低质量",
};

// 获取参数标题中文
export function getParamChineseName(str, backendCnName) {
  return PARAM_NAME_MAP[str] || backendCnName || str;
}

// 新增：获取选项值中文
export function getParamValueChinese(val) {
  return PARAM_VALUE_MAP[val] || val;
}
