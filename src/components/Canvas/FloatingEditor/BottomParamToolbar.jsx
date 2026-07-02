import StyleSelect from "@/components/Canvas/CanvasHeader/StyleSelect.jsx";
import useCanvasStore from "@/store/canvasStore";
import { getParamChineseName } from "@/utils/paramsMap.js";
import {
  ArrowUpOutlined,
  CloseCircleOutlined,
  NotificationOutlined,
} from "@ant-design/icons";
import { Button, Dropdown, Popover, Radio, Space, Switch } from "antd";
import { useEffect, useState } from "react";

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
  // 直接从仓库拿全部模型、当前选中模型、切换模型方法
  const modelList = useCanvasStore((state) => state.modelList);
  const currentSelectModel = useCanvasStore(
    (state) => state.currentSelectModel,
  );
  const setCurrentSelectModel = useCanvasStore(
    (state) => state.setCurrentSelectModel,
  );

  // 节点编辑相关
  const activeNodeId = useCanvasStore((state) => state.activeNodeId);
  const nodeEditors = useCanvasStore((state) => state.nodeEditors);
  const updateNodeEditorData = useCanvasStore(
    (state) => state.setNodeEditorData,
  );

  const editor = activeNodeId ? nodeEditors[activeNodeId] : null;
  const paramValues = editor?.data || {};

  // 比例选中状态：优先从已保存参数里恢复
  const [currentRatio, setCurrentRatio] = useState(
    paramValues.aspect_ratio || "auto",
  );

  //  参数列表
  const propList = currentSelectModel?.prop_list || [];

  // 同步外部 paramValues 变化到比例状态
  useEffect(() => {
    if (paramValues?.aspect_ratio !== undefined) {
      setCurrentRatio(paramValues.aspect_ratio);
    }
  }, [paramValues?.aspect_ratio]);

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
          return {
            key: prop.prop_str,
            isAudioIcon: true,
            iconNode: Boolean(currentVal) ? (
              <NotificationOutlined />
            ) : (
              <CloseCircleOutlined />
            ),
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
                    handleParamChange("aspect_ratio", opt.key);
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

    if (prop_viewtype === 4) {
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
              checked={Boolean(currentVal)}
              onChange={(checked) => handleParamChange(prop_str, checked)}
            />
            <span>{currentVal ? "开启" : "关闭"}</span>
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

  // 下拉菜单：点击直接调用仓库setCurrentSelectModel
  const modelMenuItems = (modelList || []).map((item) => ({
    label: item.model_title,
    key: item.id,
    onClick: () => {
      setCurrentSelectModel(item);
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
          <Button onClick={(e) => e.stopPropagation()}>
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
            <Button>
              {paramSummary.map((item) => (
                <span
                  key={item.key}
                  style={{
                    display: "inline-block",
                    padding: "0 4px",
                    height: "20px",
                    lineHeight: "20px",
                    fontSize: "12px",
                    borderRadius: "4px",
                    background: "#333",
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
      <StyleSelect />
      <Button
        type="primary"
        shape="circle"
        onClick={onSubmit}
        icon={<ArrowUpOutlined />}
      />
    </div>
  );
};

export default BottomParamToolbar;
