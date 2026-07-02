import StyleSelect from "@/components/Canvas/CanvasHeader/StyleSelect.jsx";
import useCanvasStore from "@/store/canvasStore";
import { getParamChineseName } from "@/utils/paramsMap.js";
import {
  ArrowUpOutlined,
  NotificationOutlined,
  SoundOutlined,
  StarOutlined,
} from "@ant-design/icons";
import { Button, Dropdown, Popover, Radio, Space, Switch } from "antd";
import { useEffect, useRef, useState } from "react";

// 比例数据源：固定 key、展示文案、宽高比值
// 底层公式：height = width ÷ (w / h)
// 预览框宽度固定 20px，高度由 aspect-ratio 原生 CSS 自动计算
const RATIO_LIST = [
  { key: "auto", label: "Auto", ratio: null },
  { key: "16:9", label: "16:9", ratio: "16 / 9" },
  { key: "4:3", label: "4 / 3", ratio: "4 / 3" },
  { key: "1:1", label: "1:1", ratio: "1 / 1" },
  { key: "3:4", label: "3:4", ratio: "3 / 4" },
  { key: "9:16", label: "9:16", ratio: "9 / 16" },
  { key: "21:9", label: "21:9", ratio: "21 / 9" },
];

const BottomParamToolbar = ({
  sizeConfig,
  onChangeSize,
  preset,
  onChangePreset,
  cameraMode,
  onChangeCamera,
  imageCount,
  onChangeImageCount,
  steps,
  onChangeSteps,
  onSubmit,
}) => {
  // 直接从仓库拿全部模型
  const modelList = useCanvasStore((state) => state.modelList);

  // 节点编辑相关
  const activeNodeId = useCanvasStore((state) => state.activeNodeId);
  const nodeEditors = useCanvasStore((state) => state.nodeEditors);
  const updateNodeEditorData = useCanvasStore(
    (state) => state.setNodeEditorData,
  );

  const editor = activeNodeId ? nodeEditors[activeNodeId] : null;
  const paramValues = editor?.data || {};

  // 根据当前节点 data.model_id 从 modelList 中查找对应的模型
  const currentModelId = paramValues.model_id;
  const currentSelectModel =
    modelList.find((m) => m.id === currentModelId) || null;

  //  prop_list 从当前节点对应的模型里取，而不是全局状态
  const propList = currentSelectModel?.prop_list || [];
  // 积分映射表
  const pointMap = currentSelectModel?.point_list || {};

  // 比例选中状态：优先从已保存参数里恢复
  const [currentRatio, setCurrentRatio] = useState(
    paramValues.aspect_ratio || "auto",
  );

  // 同步外部 paramValues 变化到比例状态
  useEffect(() => {
    if (paramValues?.aspect_ratio !== undefined) {
      setCurrentRatio(paramValues.aspect_ratio);
    }
  }, [paramValues?.aspect_ratio]);

  // 节点首次打开且 modelList 加载完成后，自动填入第一个模型 + 第一个参数
  const initRef = useRef(false);
  useEffect(() => {
    initRef.current = false;
  }, [activeNodeId]);

  useEffect(() => {
    console.log("[Init] trigger", {
      activeNodeId,
      hasEditor: !!editor,
      modelListLen: modelList.length,
      hasModelId: !!paramValues.model_id,
      initRef: initRef.current,
    });
    if (!activeNodeId || !editor || modelList.length === 0) return;
    if (paramValues.model_id) return;
    if (initRef.current) return;
    initRef.current = true;

    const firstModel = modelList[0];
    console.log("[Init] firstModel", firstModel);
    if (!firstModel) return;

    const newData = { ...paramValues, model_id: firstModel.id };
    firstModel.prop_list?.forEach((prop) => {
      if (
        Array.isArray(prop.prop_values_list) &&
        prop.prop_values_list.length > 0
      ) {
        const firstVal = prop.prop_values_list[0];
        newData[prop.prop_str] = firstVal.prop_value_id;
        console.log(
          "[Init] set",
          prop.prop_str,
          "=",
          firstVal.prop_value_id,
          firstVal.prop_value_name,
        );
      }
    });
    console.log("[Init] newData", newData);
    updateNodeEditorData(activeNodeId, newData);
  }, [activeNodeId, editor, modelList]);

  // 参数修改回调
  const handleParamChange = (propKey, value) => {
    if (!editor || !activeNodeId) return;
    const newEditorData = {
      ...editor.data,
      [propKey]: value,
    };
    updateNodeEditorData(activeNodeId, newEditorData);
  };

  // 生成参数摘要：每个参数用 span 展示
  const getParamSummary = () => {
    if (!propList.length) {
      return [{ label: "参数设置", key: "placeholder" }];
    }

    return propList
      .map((prop) => {
        const currentVal = paramValues[prop.prop_str];
        if (
          currentVal === undefined ||
          currentVal === null ||
          currentVal === ""
        ) {
          return null;
        }

        let label = currentVal;
        if (prop.prop_values_list?.length) {
          const matched = prop.prop_values_list.find(
            (item) =>
              item.prop_value_id === currentVal ||
              item.prop_value_name === currentVal,
          );
          if (matched) {
            label = matched.prop_value_name;
          }
        }

        const title = getParamChineseName(prop.prop_str, prop.prop_name);

        // 音频开关类型，返回图标标识
        if (prop.prop_viewtype === 4) {
          // 兜底无选项直接返回空
          if (
            !Array.isArray(prop.prop_values_list) ||
            prop.prop_values_list.length === 0
          ) {
            return null;
          }
          const trueItem = prop.prop_values_list.find(
            (item) => String(item.prop_value_name) === "true",
          );
          const isOpen = String(currentVal) === trueItem?.prop_value_id;
          return {
            key: prop.prop_str,
            isAudioIcon: true,
            iconNode: isOpen ? <NotificationOutlined /> : <SoundOutlined />,
          };
        }

        // 普通文字参数
        return {
          label: `${title}: ${label}`,
          key: prop.prop_str,
          isAudioIcon: false,
        };
      })
      .filter(Boolean);
  };

  const paramSummary = getParamSummary();

  const getConsumePoint = () => {
    if (!currentSelectModel?.point_list || propList.length === 0) {
      console.log("[积分计算] 无模型/无积分配置/无参数", {
        currentSelectModel,
        propList,
      });
      return 0;
    }
    const valueIds = [];
    propList.forEach((prop) => {
      const val = paramValues[prop.prop_str];
      // 值为空直接跳过
      if (val === null || val === undefined || val === "") return;
      // 所有参数存储的val本身就是prop_value_id，直接推入数组
      valueIds.push(val);
    });
    // 数字升序拼接key
    const combineKey = valueIds.sort((a, b) => Number(a) - Number(b)).join(",");
    const point = currentSelectModel.point_list[combineKey] ?? 0;
    console.log("[积分计算日志] ", {
      所有选中valueId: valueIds,
      拼接key: combineKey,
      point_list对照表: currentSelectModel.point_list,
      当前匹配积分: point,
    });
    return point;
  };
  const consumePoint = getConsumePoint();

  // 预览小方框样式
  // 公式：height = 20px ÷ (宽比值 / 高比值)
  // 例：21:9 → 40 ÷ (21/9) ≈ 17.14px；1:1 → 40 ÷ 1 = 40px
  const getPreviewBoxStyle = (ratioStr) => ({
    width: "20px",
    aspectRatio: ratioStr || "auto",
    border: "1px solid #888",
    borderRadius: "2px",
    background: "transparent",
    boxSizing: "border-box",
  });

  // 按钮样式
  const getButtonStyle = (isSelected) => ({
    display: "inline-flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    padding: "10px 4px",
    borderRadius: "8px",
    border: isSelected ? "2px solid #fff" : "1px solid #555",
    background: isSelected ? "#333" : "#2c2c2c",
    color: "#ddd",
    cursor: "pointer",
    transition: "all 0.2s ease",
    minWidth: "64px",
    flex: "1 1 auto",
    height: "65px",
  });

  // 网格布局：5 列自适应
  const ratioGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: "10px",
    marginTop: "12px",
  };

  // 渲染单条参数
  const renderSingleParam = (prop) => {
    const {
      prop_id,
      prop_str,
      prop_name,
      prop_viewtype,
      prop_values_list = [],
    } = prop;
    const title = getParamChineseName(prop_str, prop_name);
    const currentVal = paramValues[prop_str];

    if (prop_str === "aspect_ratio" && prop_values_list.length) {
      // 将后端 prop_values_list 映射到固定 RATIO_LIST
      // 通过 label 匹配比例，确保预览图标与数据一致
      const options = prop_values_list.map((item) => {
        const matchedRatio = RATIO_LIST.find(
          (r) =>
            r.label === item.prop_value_name || r.key === item.prop_value_id,
        );
        return {
          label: item.prop_value_name,
          value: item.prop_value_id,
          ratio: matchedRatio?.ratio || null,
          key: matchedRatio?.key || item.prop_value_id,
        };
      });

      return (
        <div style={{ marginBottom: "16px" }} key={prop_id}>
          <div
            style={{
              fontSize: "16px",
              color: "#cccccc",
              marginBottom: "8px",
            }}
          >
            {title}
          </div>
          {/* 比例选择网格：5 列布局 */}
          <div style={ratioGridStyle}>
            {options.map((opt) => {
              const isSelected = currentRatio === opt.key;
              return (
                <div
                  key={opt.value}
                  style={getButtonStyle(isSelected)}
                  onClick={() => {
                    setCurrentRatio(opt.key);
                    handleParamChange("aspect_ratio", opt.value);
                  }}
                >
                  {/* 比例预览小图标：宽度固定 20px，高度由 aspect-ratio 自动计算 */}
                  <div style={getPreviewBoxStyle(opt.ratio)} />
                  <span
                    style={{
                      fontSize: "12px",
                      color: "inherit",
                      textAlign: "center",
                    }}
                  >
                    {opt.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if ([1, 2, 3].includes(prop_viewtype)) {
      const options = prop_values_list.map((item) => ({
        label: item.prop_value_name,
        value: item.prop_value_id,
      }));
      return (
        <div style={{ marginBottom: "16px" }} key={prop_id}>
          <div
            style={{
              fontSize: "16px",
              color: "#cccccc",
              marginBottom: "8px",
            }}
          >
            {title}
          </div>
          <Radio.Group
            value={currentVal}
            onChange={(e) => handleParamChange(prop_str, e.target.value)}
            buttonStyle="solid"
          >
            <Space wrap size={8}>
              {options.map((opt) => (
                <Radio.Button key={opt.value} value={opt.value}>
                  {opt.label}
                </Radio.Button>
              ))}
            </Space>
          </Radio.Group>
        </div>
      );
    }

    if (prop.prop_viewtype === 4) {
      // 拿到开关对应的两个id
      const trueItem = prop.prop_values_list.find(
        (item) => String(item.prop_value_name) === "true",
      );
      const falseItem = prop.prop_values_list.find(
        (item) => String(item.prop_value_name) === "false",
      );
      return (
        <div style={{ marginBottom: "16px" }} key={prop_id}>
          <div
            style={{
              fontSize: "16px",
              color: "#cccccc",
              marginBottom: "8px",
            }}
          >
            {title}
          </div>
          <Space>
            <Switch
              checked={String(currentVal) === trueItem?.prop_value_id}
              onChange={(checked) => {
                const saveId = checked
                  ? trueItem.prop_value_id
                  : falseItem.prop_value_id;
                handleParamChange(prop.prop_str, saveId);
              }}
            />
            <span>
              {String(currentVal) === trueItem?.prop_value_id ? "开启" : "关闭"}
            </span>
          </Space>
        </div>
      );
    }

    return null;
  };

  // 参数弹窗面板
  const renderParamPanel = () => {
    return (
      <div
        style={{
          width: "420px",
          padding: "16px",
          backgroundColor: "#1e1e1e",
          borderRadius: "8px",
          display: "flex",
          flexDirection: "column",
          gap: "28px",
        }}
      >
        {propList.map((prop) => renderSingleParam(prop))}
      </div>
    );
  };

  // 下拉菜单：点击写入当前节点 data.model_id
  const modelMenuItems = (modelList || []).map((item) => ({
    label: item.model_title,
    key: item.id,
    onClick: () => {
      if (!editor || !activeNodeId) return;
      const newEditorData = {
        ...editor.data,
        model_id: item.id,
      };
      updateNodeEditorData(activeNodeId, newEditorData);
    },
  }));

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
        paddingTop: 12,
        borderTop: "1px solid #303030",
      }}
    >
      <Space size={16}>
        <Dropdown
          menu={{ items: modelMenuItems }}
          trigger={["click"]}
          getPopupContainer={() => document.body}
        >
          <Button
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "transparent",
              border: "none",
              boxShadow: "none",
              fontSize: "18px",
            }}
          >
            {/* 读取仓库全局选中模型展示文字 */}
            {currentSelectModel?.model_title || "请选择模型"}
          </Button>
        </Dropdown>

        {propList.length > 0 && (
          <Popover
            trigger="click"
            placement="bottom"
            content={renderParamPanel()}
          >
            <Button
              style={{
                background: "transparent",
                border: "none",
                boxShadow: "none",
              }}
            >
              {paramSummary.map((item) => (
                <span
                  key={item.key}
                  style={{
                    display: "inline-block",
                    padding: "0 4px",
                    height: "20px",
                    lineHeight: "20px",
                    fontSize: "18px",
                    borderRadius: "4px",
                    background: "transparent",
                    color: "#fff",
                    marginRight: "4px",
                  }}
                >
                  {item.isAudioIcon ? item.iconNode : item.label}
                </span>
              ))}
            </Button>
          </Popover>
        )}
      </Space>
      <Space size={16} align="center">
        <StyleSelect isGlobal />
        {/* 积分标签 */}
        <span
          style={{
            padding: "2px 10px",
            color: "#00c4f9",
            fontSize: "16px",
          }}
        >
          <StarOutlined style={{ color: "#00c4f9" }} />
          {consumePoint}
        </span>
        <Button
          shape="circle"
          onClick={onSubmit}
          icon={<ArrowUpOutlined />}
          style={{
            background: "#2c2c2c",
            borderColor: "#2c2c2c",
            color: "#fff",
          }}
        />
      </Space>
    </div>
  );
};

export default BottomParamToolbar;
