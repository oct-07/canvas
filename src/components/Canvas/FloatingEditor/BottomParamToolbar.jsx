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

  // 用 ref 跟踪参数值变化，只在真正变化时触发积分计算
  const paramValuesRef = useRef(null);
  const prevParamValuesStr = useRef("");

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
  const currentSelectModel =
    modelList.find((m) => m.id === currentModelId) || null;

  //  prop_list 从当前节点对应的模型里取，而不是全局状态
  const propList = currentSelectModel?.prop_list || [];
  // 积分映射表
  const pointMap = currentSelectModel?.point_list || {};

  // 比例选中状态：优先从已保存参数里恢复（存储格式是 prop_value_name）
  const getInitialRatioKey = () => {
    if (paramValues.aspect_ratio == null) return "auto";
    return String(paramValues.aspect_ratio);
  };
  const [currentRatio, setCurrentRatio] = useState(getInitialRatioKey);
  // 调用 AI 生成接口
  const handleApiSubmit = async () => {
    if (!editor || !activeNodeId) return;

    if (isGenerating) return;
    const params = {};
    propList.forEach((prop) => {
      const val = editor.data[prop.prop_str];
      if (val === undefined || val === null || val === "") return;
      params[prop.prop_str] = val;
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
      provider: currentSelectModel?.model_company ?? "",
      model_name: currentSelectModel?.model_name ?? "",
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

    const newData = {
      ...paramValues,
      model_id: firstModel.id,
      model_name: firstModel.model_name,
      model_frame: firstModel.model_frame,
    };
    firstModel.prop_list?.forEach((prop) => {
      if (
        Array.isArray(prop.prop_values_list) &&
        prop.prop_values_list.length > 0
      ) {
        // 仅当节点 data 中没有该 prop 的值时才写入默认值
        if (newData[prop.prop_str] === undefined) {
          const firstVal = prop.prop_values_list[0];
          newData[prop.prop_str] = firstVal.prop_value_id;
        }
      }
    });
    updateNodeEditorData(activeNodeId, newData);
  };

  // 主触发：节点切换时立即尝试初始化
  useEffect(() => {
    initNodeDefaults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNodeId]);

  // 兜底：modelList 异步到达后重新尝试初始化（覆盖 loadModelSkuParams
  // 尚未完成时首次打开的场景）
  useEffect(() => {
    initNodeDefaults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelList.length]);

  // 积分计算相关状态
  const consumePointRef = useRef(0);
  const lastCalcKeyRef = useRef(""); // 存储上一次的 combineKey，用于判断是否真正变化

  // 积分计算函数
  const calculatePoint = () => {
    if (!currentSelectModel?.point_list || propList.length === 0) {
      return { key: "", point: 0 };
    }

    const valueIds = [];
    propList.forEach((prop) => {
      const val = paramValues[prop.prop_str];
      if (val === null || val === undefined || val === "") return;
      valueIds.push(val);
    });

    if (valueIds.length === 0) {
      return { key: "", point: 0 };
    }

    // 使用安全的数字排序，优先按数字排序，非数字值按字符串排序
    const sortedValueIds = [...valueIds].sort((a, b) => {
      const numA = Number(a);
      const numB = Number(b);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return String(a).localeCompare(String(b));
    });
    const combineKey = sortedValueIds.join(",");
    const point = currentSelectModel.point_list[combineKey] ?? 0;

    return { key: combineKey, point, valueIds };
  };

  // 使用 useEffect 监听参数和模型变化，确保在 React 重新渲染后再计算
  // 这样可以避免闭包捕获旧值的问题
  useEffect(() => {
    const { key, point, valueIds } = calculatePoint();

    // 只有 combineKey 真正变化时才更新并打印日志
    if (lastCalcKeyRef.current !== key) {
      lastCalcKeyRef.current = key;
      consumePointRef.current = point;
      console.log("[积分计算日志]", {
        所有选中valueId: valueIds,
        排序后key: key,
        当前匹配积分: point,
      });
    }
  }, [activeNodeId, currentSelectModel?.id, JSON.stringify(paramValues)]);

  const consumePoint = consumePointRef.current;

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
            label = getParamValueChinese(matched.prop_value_name);
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
            iconNode: isOpen ? <SoundOutlined /> : <NotificationOutlined />,
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
      // options 的 value 用 prop_value_id，存储和匹配都统一用 id
      const options = prop_values_list.map((item) => {
        const matchedRatio = RATIO_LIST.find(
          (r) => r.label === item.prop_value_name,
        );
        return {
          label: item.prop_value_name,
          value: item.prop_value_id,
          ratio: matchedRatio?.ratio || null,
        };
      });
      const currentId = paramValues[prop_str];
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
                  {getParamValueChinese(opt.label)}
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
                handleParamChange(
                  prop.prop_str,
                  checked ? trueItem.prop_value_id : falseItem.prop_value_id,
                );
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

  // 下拉菜单：点击写入当前节点 data.model_id
  const modelMenuItems = (modelList || []).map((item) => ({
    label: item.model_name,
    key: item.id,
    onClick: () => {
      if (!editor || !activeNodeId) return;
      const newEditorData = {
        ...editor.data,
        model_id: item.id,
        model_name: item.model_name,
        model_frame: item.model_frame,
      };
      updateNodeEditorData(activeNodeId, newEditorData);
      // 积分计算由 useEffect 自动处理，无需手动调用
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
            {currentSelectModel?.model_name || "请选择模型"}
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
