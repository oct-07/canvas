import { createContent } from "@/api";
import StyleSelect from "@/components/Canvas/CanvasHeader/StyleSelect.jsx";
import useCanvasStore from "@/store/canvasStore";
import { getAspectRatioSize } from "@/utils/aspectRatioMap";
import { buildMediaBody } from "@/utils/generateParams.js";
import {
  getParamChineseName,
  getParamValueChinese,
} from "@/utils/paramsMap.js";
import {
  adaptModel,
  calcPoint,
  migrateParams,
  getValidOptions,
  getParamLabel,
} from "@/utils/modelAdapter";
import {
  ArrowUpOutlined,
  LoadingOutlined,
  NotificationOutlined,
  SoundOutlined,
  StarOutlined,
} from "@ant-design/icons";
import { Button, Dropdown, message, Popover, Radio, Space, Switch } from "antd";
import { useEffect, useRef, useState } from "react";

// 比例数据源：固定 key、展示文案、宽高比值
// 底层公式：height = width ÷ (w / h)
// 预览框宽度固定 20px，高度由 aspect-ratio 原生 CSS 自动计算
const RATIO_LIST = [
  { key: "auto", label: "auto", ratio: null },
  { key: "1:1", label: "1:1", ratio: "1 / 1" },
  { key: "4:3", label: "4:3", ratio: "4 / 3" },
  { key: "3:4", label: "3:4", ratio: "3 / 4" },
  { key: "16:9", label: "16:9", ratio: "16 / 9" },
  { key: "9:16", label: "9:16", ratio: "9 / 16" },
  { key: "3:2", label: "3:2", ratio: "3 / 2" },
  { key: "2:3", label: "2:3", ratio: "2 / 3" },
  { key: "5:4", label: "5:4", ratio: "5 / 4" },
  { key: "4:5", label: "4:5", ratio: "4 / 5" },
  { key: "2:1", label: "2:1", ratio: "2 / 1" },
  { key: "1:2", label: "1:2", ratio: "1 / 2" },
  { key: "21:9", label: "21:9", ratio: "21 / 9" },
  { key: "9:21", label: "9:21", ratio: "9 / 21" },
  { key: "3:1", label: "3:1", ratio: "3 / 1" },
  { key: "1:3", label: "1:3", ratio: "1 / 3" },
];

const BottomParamToolbar = ({
  nodeType,
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
  promptInputRef,
  activeFrameKey,
}) => {
  //弹框气泡
  const [popoverOpen, setPopoverOpen] = useState(false);

  // 从 modelListMap 中取当前节点 model_type 对应的模型
  const modelListMap = useCanvasStore((state) => state.modelListMap);

  // 节点编辑相关
  const activeNodeId = useCanvasStore((state) => state.activeNodeId);
  const nodes = useCanvasStore((state) => state.nodes);
  const nodeEditors = useCanvasStore((state) => state.nodeEditors);
  const updateNodeEditorData = useCanvasStore(
    (state) => state.setNodeEditorData,
  );
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const registerTask = useCanvasStore((state) => state.registerTask);

  const currentNode = nodes.find((n) => n.id === activeNodeId);
  const editor = activeNodeId ? nodeEditors[activeNodeId] : null;
  // editor.data 可能还没回填，fallback 到 nodes 中的数据
  const paramValues = editor?.data || currentNode?.data || {};

  // 实时读取当前节点的 status，用于控制「生成」按钮的 disabled / loading。
  // pending 时锁住，其它态（未生成 / completed / failed）均允许重新生成。
  const nodeStatus = useCanvasStore((s) => {
    if (!activeNodeId) return undefined;
    const node = s.nodes.find((n) => n.id === activeNodeId);
    return node?.data?.status;
  });
  const isGenerating = nodeStatus === "pending";

  const nodeModelType = paramValues.model_type;
  const modelList = nodeModelType ? modelListMap[nodeModelType] || [] : [];

  // 根据当前节点 data.model_id 从 modelList 中查找对应的模型
  const currentModelId = paramValues.model_id;
  // rawModel：后端原始模型数据，用于接口提交等需要原始字段的场景
  const rawModel = modelList.find((m) => m.id === currentModelId) || null;
  // modelSpec：适配后的统一规格对象，用于 propSpecs / calcPoint / getValidOptions
  const modelSpec = adaptModel(rawModel);
  const propList = modelSpec?.propSpecs || [];

  // 调用 AI 生成接口
  const handleApiSubmit = async () => {
    if (!editor || !activeNodeId) return;

    if (isGenerating) return;
    const params = {};
    propList.forEach((prop) => {
      const val = editor.data[prop.propKey];
      if (val === undefined || val === null || val === "") return;
      params[prop.propKey] = val;
    });

    // 走 ref：让 PromptInputArea 从真实 DOM 解析，把原子块替换为「图片1 / 视频1」纯文本
    // 优先用 ref 拿到的纯文本；若 ref 不可用，再退回 store 的原值
    const storePrompt = editor.data.prompt || "";
    const finalPrompt = promptInputRef?.current?.getPromptText?.() || storePrompt;

    const nodeData = {
      nodeType,
      params,
      model_frame: activeFrameKey ?? "",
      refAssetList: editor.data.refAssetList || [],
      provider: rawModel?.model_company ?? "",
      model_name: rawModel?.model_name ?? "",
      model_id: editor.data.model_id || "",
      prompt: finalPrompt,
      negative_prompt: "",
      team_id: editor.data.team_id || "",
      vip_weight: editor.data.vip_weight || "",
    };
    const body = buildMediaBody(nodeData);
    try {
      const res = await createContent(body);
      // 有 id 才注册 WS 监听（WS 会负责把 pending → completed/failed）
      if (res?.id) {
        updateNodeData(activeNodeId, { status: "pending" });
        registerTask(activeNodeId, res.id);
      }
      message.success("生成任务已提交");
    } catch (err) {
      console.error("[生成失败]", err);
      updateNodeData(activeNodeId, {
        status: "failed",
        error: err?.msg || err?.message || "生成失败，请重试",
      });
      message.error("生成失败，请重试");
    }
  };

  // 节点首次打开时自动填入第一个模型 + 默认参数（时长/比例/分辨率等）
  // 幂等保护：节点 data 已有 model_id 时跳过；不再用模块级 Set 记录节点 ID，
  // 避免跨生命周期误判导致"第二次触发"参数展示丢失。
  const initNodeDefaults = () => {
    if (!activeNodeId || !editor || modelList.length === 0) return;
    if (paramValues.model_id) return;

    const firstModel = modelList[0];
    if (!firstModel) return;

    const firstSpec = adaptModel(firstModel);
    const newData = {
      ...paramValues,
      model_id: firstModel.id,
      model_name: firstModel.model_name,
      model_frame: firstModel.model_frame,
    };
    firstSpec?.propSpecs?.forEach((prop) => {
      if (Array.isArray(prop.options) && prop.options.length > 0) {
        // 仅当节点 data 中没有该 prop 的值时才写入默认值
        if (newData[prop.propKey] === undefined) {
          newData[prop.propKey] = prop.options[0].id;
        }
      }
    });
    updateNodeEditorData(activeNodeId, newData);
  };

  // 主触发：节点切换时立即尝试初始化
  // 同时监听 modelList.length 确保模型数据加载后才初始化
  useEffect(() => {
    initNodeDefaults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNodeId, modelList.length]);

  // 积分计算相关状态
  const [consumePoint, setConsumePoint] = useState(0);

  // 使用 useEffect 监听参数和模型变化，确保在 React 重新渲染后再计算
  useEffect(() => {
    const { point, key, hit } = calcPoint(modelSpec, paramValues);
    setConsumePoint(point);
  }, [modelSpec?.id, JSON.stringify(paramValues)]);

  // 参数修改回调
  const handleParamChange = (propKey, value) => {
    if (!editor || !activeNodeId) return;
    const newEditorData = {
      ...editor.data,
      [propKey]: value,
    };
    updateNodeEditorData(activeNodeId, newEditorData);

    if (propKey === "aspect_ratio") {
      const size = getAspectRatioSize(value);
      const width = Math.round((260 * size.width) / size.height);
      const height = 260;
      updateNodeData(activeNodeId, { aspect_ratio: value, width, height });
    }
    // 积分计算由 useEffect 自动处理，无需手动调用
  };

  // 生成参数摘要：每个参数用 span 展示
  const getParamSummary = () => {
    if (!propList.length) {
      return [{ label: "参数设置", key: "placeholder" }];
    }

    return propList
      .map((prop) => {
        const currentVal = paramValues[prop.propKey];
        if (
          currentVal === undefined ||
          currentVal === null ||
          currentVal === ""
        ) {
          return null;
        }

        // 音频开关类型，返回图标标识
        if (prop.viewType === "switch") {
          if (!prop.options?.length) return null;
          const trueOption = prop.options.find(
            (o) => String(o.name) === "true",
          );
          const isOpen = String(currentVal) === trueOption?.id;
          return {
            key: prop.propKey,
            isAudioIcon: true,
            iconNode: isOpen ? <SoundOutlined /> : <NotificationOutlined />,
          };
        }

        const title = getParamChineseName(prop.propKey, prop.propName);
        const label =
          getParamLabel(modelSpec, paramValues, prop.propKey) || currentVal;

        // 普通文字参数
        return {
          label: `${title}: ${label}`,
          key: prop.propKey,
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
    height: "14px",
    width: "auto",
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
    borderRadius: "8px",
    border: isSelected ? "2px solid #fff" : "1px solid #555",
    background: isSelected ? "#333" : "#2c2c2c",
    color: "#ddd",
    cursor: "pointer",
    transition: "all 0.2s ease",
    width: "50px",
    flex: "1 1 auto",
    height: "40px",
    gap: "4px",
    padding: "2px",
  });

  // 网格布局：5 列自适应
  const ratioGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(50px, 1fr))",
    gap: "10px",
    marginTop: "12px",
  };
  // 渲染单条参数
  const renderSingleParam = (prop) => {
    const { propKey, propName, viewType, options = [] } = prop;
    const title = getParamChineseName(propKey, propName);
    const currentVal = paramValues[propKey];

    if (propKey === "aspect_ratio" && options.length) {
      // options 的 value 用 id，存储和匹配都统一用 id
      const ratioOptions = options.map((opt) => {
        const matchedRatio = RATIO_LIST.find((r) => r.label === opt.name);
        return {
          label: opt.name,
          value: opt.id,
          ratio: matchedRatio?.ratio || null,
        };
      });
      const currentId = paramValues[propKey];
      return (
        <div style={{ marginBottom: "16px" }} key={propKey}>
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
            {ratioOptions.map((opt) => {
              const isSelected = String(currentVal) === String(opt.value);
              return (
                <div
                  key={opt.value}
                  style={getButtonStyle(isSelected)}
                  onClick={() => {
                    handleParamChange("aspect_ratio", opt.value);
                    // 关键：关闭再打开弹窗，强制重新计算定位
                    setPopoverOpen(false);
                    setTimeout(() => setPopoverOpen(true), 0);
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

    if (["radio", "duration", "resolution"].includes(viewType)) {
      const radioOptions = getValidOptions(modelSpec, propKey).map((opt) => ({
        label: opt.name,
        value: opt.id,
      }));
      return (
        <div style={{ marginBottom: "16px" }} key={propKey}>
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
            onChange={(e) => handleParamChange(propKey, e.target.value)}
            buttonStyle="solid"
          >
            <Space wrap size={8}>
              {radioOptions.map((opt) => (
                <Radio.Button key={opt.value} value={opt.value}>
                  {getParamValueChinese(opt.label)}
                </Radio.Button>
              ))}
            </Space>
          </Radio.Group>
        </div>
      );
    }

    if (viewType === "switch") {
      const trueOption = options.find((o) => String(o.name) === "true");
      const falseOption = options.find((o) => String(o.name) === "false");
      return (
        <div style={{ marginBottom: "16px" }} key={propKey}>
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
              checked={String(currentVal) === trueOption?.id}
              onChange={(checked) => {
                handleParamChange(
                  propKey,
                  checked ? trueOption.id : falseOption.id,
                );
              }}
            />
            <span>
              {String(currentVal) === trueOption?.id ? "开启" : "关闭"}
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
          backgroundColor: "#1e1e1e",
          borderRadius: "8px",
          display: "flex",
          flexDirection: "column",
          gap: "5px",
        }}
      >
        {propList.map((prop) => renderSingleParam(prop))}
      </div>
    );
  };

  // 下拉菜单：点击写入当前节点 data.model_id，并迁移参数
  const modelMenuItems = (modelList || []).map((item) => ({
    label: item.model_name,
    key: item.id,
    onClick: () => {
      if (!editor || !activeNodeId) return;
      const newRaw = modelList.find((m) => m.id === item.id);
      const newSpec = adaptModel(newRaw);
      const migrated = migrateParams(modelSpec, editor.data, newSpec);

      updateNodeEditorData(activeNodeId, {
        ...editor.data,
        ...migrated,
        model_id: item.id,
        model_name: item.model_name,
        model_frame: item.model_frame,
      });
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
              background: "#333333",
              border: "none",
              boxShadow: "none",
              borderRadius: "999px",
              padding: "6px 16px",
              height: "auto",
              fontSize: "18px",
              color: "#fff",
              display: "flex",
              alignItems: "center",
            }}
          >
            {/* 读取仓库全局选中模型展示文字 */}
            {modelSpec?.name || "请选择模型"}
          </Button>
        </Dropdown>

        {propList.length > 0 && (
          <Popover
            open={popoverOpen}
            onOpenChange={setPopoverOpen}
            trigger="click"
            placement="bottom"
            forceAlign // 强制每次渲染都重新对齐
            content={renderParamPanel()}
          >
            <Button
              style={{
                background: "#333333",
                border: "none",
                boxShadow: "none",
                borderRadius: "999px",
                padding: "6px 16px",
                height: "auto",
                fontSize: "18px",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                gap: "8px",
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
        <StyleSelect isGlobal={false} nodeId={activeNodeId} />
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
          loading={isGenerating}
          disabled={isGenerating}
          icon={isGenerating ? <LoadingOutlined /> : <ArrowUpOutlined />}
          onClick={handleApiSubmit}
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
