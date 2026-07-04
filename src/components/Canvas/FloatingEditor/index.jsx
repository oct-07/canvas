import useCanvasStore from "@/store/canvasStore";
import { useViewport } from "@xyflow/react";
import { ConfigProvider, theme } from "antd";
import { useEffect, useMemo, useState } from "react";

import BottomParamToolbar from "./BottomParamToolbar";
import PromptInputArea from "./PromptInputArea";
import TopActionBar from "./TopActionBar";

import { getAspectRatioSize } from "@/utils/aspectRatioMap";
import { ArrowsAltOutlined, ShrinkOutlined } from "@ant-design/icons";
import { Button } from "antd";

const FloatingEditor = ({ visible, position, onSubmit, onClose, nodeType }) => {
  const activeNodeId = useCanvasStore((state) => state.activeNodeId);
  const nodeEditors = useCanvasStore((state) => state.nodeEditors);
  const editor = activeNodeId ? nodeEditors[activeNodeId] : null;
  // 实时缩放比：节点在画布内的高度增量需按 zoom 换算到屏幕像素
  const { zoom } = useViewport();

  const [isFullScreen, setIsFullScreen] = useState(false);

  const openFullScreen = () => {
    setIsFullScreen(true);
  };

  const closeFullScreen = () => {
    setIsFullScreen(false);
  };

  // 全局状态统一放在父组件
  const [prompt, setPrompt] = useState("");
  const [styleValue, setStyleValue] = useState("default");
  const [imageUrl, setImageUrl] = useState("");
  const [params, setParams] = useState({
    width: 1024,
    height: 1024,
    steps: 18,
    cfg: 7,
    seed: -1,
  });
  const [model, setModel] = useState("Lib Image");
  const [sizeConfig, setSizeConfig] = useState("自适应·标准画质·2K");
  const [preset, setPreset] = useState("");
  const [cameraMode, setCameraMode] = useState(false);
  const [imageCount, setImageCount] = useState(1);

  // 编辑数据回填（仅在 activeNodeId 变化时执行，避免 BottomParamToolbar 的
  // handleParamChange 副作用覆盖用户实时输入；与下游 PromptInputArea 的
  // useEffect([html]) 联动，根本解决"切比例时输入框跳回旧值"的体验问题）
  useEffect(() => {
    if (!editor?.data) return;
    const data = editor.data;
    setPrompt(data.prompt ?? "");
    setStyleValue(data.style ?? "default");
    setImageUrl(data.imageUrl ?? "");
    setParams(data.params ?? params);
  }, [activeNodeId]);

  // 节点因比例变化产生的高度增量（画布坐标），用于让提示词框同步下移，
  // 始终与节点底边保持默认间距，避免高比例时节点与提示词框重叠。
  // 图片/视频节点默认宽度均为 260，默认比例 1:1 → 默认高度 260。
  const NODE_WIDTH = 260;
  const NODE_DEFAULT_HEIGHT = 260;
  const nodeHeightDelta = useMemo(() => {
    const aspectRatio = editor?.data?.aspect_ratio;
    if (!aspectRatio) return 0;
    const size = getAspectRatioSize(aspectRatio);
    const height = Math.round((NODE_WIDTH * size.height) / size.width);
    return Math.max(0, height - NODE_DEFAULT_HEIGHT);
  }, [editor?.data?.aspect_ratio]);

  // 弹窗定位样式
  const wrapperStyle = useMemo(() => {
    if (!visible) return { display: "none" };
    const baseStyle = {
      position: "fixed",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 9999,
      borderRadius: 12,
      background: "#262626",
      border: "1px solid #303030",
      boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
      padding: 20,
      overflow: "hidden",
      transition: "all 0.25s ease",
      display: "flex",
      flexDirection: "column",
    };

    if (isFullScreen) {
      return {
        ...baseStyle,
        top: 0,
        left: 0,
        transform: "translateX(-50%)",
        width: "900px",
        height: "700px",
        borderRadius: "10px",
      };
    }

    return {
      ...baseStyle,
      // 基础位置 + 节点高度增量（按 zoom 换算为屏幕像素），使提示词框随节点变高同步下移
      top: `calc(50% + 160px + ${nodeHeightDelta * zoom}px)`,
      width: 900,
      height: 400,
    };
  }, [visible, isFullScreen, nodeHeightDelta, zoom]);

  // 提交生成
  const handleSend = () => {
    const aspectRatio = editor?.data?.aspect_ratio;
    const updatedParams = aspectRatio
      ? {
          ...params,
          width: getAspectRatioSize(aspectRatio).width,
          height: getAspectRatioSize(aspectRatio).height,
        }
      : params;

    const submitData = {
      prompt: prompt || undefined,
      style: styleValue,
      imageUrl: imageUrl || undefined,
      params: updatedParams,
      model,
      sizeConfig,
      preset,
      cameraMode,
      imageCount,
      aspectRatio: aspectRatio || undefined,
    };
    onSubmit(submitData);
    // 不再清空本地 state：editor.data 已通过 useEffect 回填到 setPrompt/setImageUrl
  };

  if (!visible) return null;

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: "#1677ff",
          colorBgContainer: "#0d0d0d",
          colorBgElevated: "#1f1f1f",
          colorBorder: "#303030",
          colorText: "#fff",
          borderRadius: 8,
        },
      }}
    >
      <div
        style={wrapperStyle}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
      >
        {/* 全屏切换按钮 */}
        {!isFullScreen ? (
          <Button
            icon={<ArrowsAltOutlined />}
            size="small"
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              zIndex: 10,
              background: "#2a2a30",
              borderColor: "#303030",
              color: "#fff",
            }}
            onClick={(e) => {
              e.stopPropagation();
              openFullScreen();
            }}
          />
        ) : (
          <Button
            icon={<ShrinkOutlined />}
            size="small"
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              zIndex: 10,
              background: "#2a2a30",
              borderColor: "#303030",
              color: "#fff",
            }}
            onClick={(e) => {
              e.stopPropagation();
              closeFullScreen();
            }}
          />
        )}

        {/*  顶部按钮栏 */}
        <TopActionBar
          styleValue={styleValue}
          onChangeStyle={setStyleValue}
          onOpenMark={() => console.log("打开标记面板")}
        />

        <div
          style={{
            flex: 1,
            minHeight: 0,
            margin: "4px 0",
          }}
        >
          <PromptInputArea
            html={prompt}
            onChangeHtml={setPrompt}
            isFullScreen={isFullScreen}
          />
        </div>

        {/* 底部全部参数工具栏 */}
        <BottomParamToolbar
          key={activeNodeId}
          nodeType={nodeType}
          model={model}
          onChangeModel={setModel}
          sizeConfig={sizeConfig}
          onChangeSize={setSizeConfig}
          preset={preset}
          onChangePreset={setPreset}
          cameraMode={cameraMode}
          onChangeCamera={setCameraMode}
          imageCount={imageCount}
          onChangeImageCount={setImageCount}
          steps={params.steps}
          onChangeSteps={(val) => setParams({ ...params, steps: val })}
          onSubmit={handleSend}
        />
      </div>
    </ConfigProvider>
  );
};

export default FloatingEditor;
