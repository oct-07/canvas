import useCanvasStore from "@/store/canvasStore";
import { ConfigProvider, theme } from "antd";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";

import BottomParamToolbar from "./BottomParamToolbar";
import PromptInputArea from "./PromptInputArea";
import TopActionBar from "./TopActionBar";

import { getAspectRatioSize } from "@/utils/aspectRatioMap";
import { calculateFloatingPosition } from "@/utils/canvasEditor";
import { ArrowsAltOutlined, ShrinkOutlined } from "@ant-design/icons";
import { Button } from "antd";

const FLOATING_WIDTH = 900;
const FLOATING_HEIGHT = 400;
const MARGIN_GAP = 8;

/**
 * 节点悬浮编辑器浮窗组件
 * 通过 React Portal 渲染到 document.body，使用 position prop 计算边界避让定位
 * visible=false 时不渲染任何 DOM（保留内部状态由父组件控制）
 */
const FloatingEditor = ({ visible, position, onSubmit, onClose, nodeType }) => {
  const activeNodeId = useCanvasStore((state) => state.activeNodeId);
  const nodeEditors = useCanvasStore((state) => state.nodeEditors);
  const updateNodeEditorFullScreen = useCanvasStore((state) => state.updateNodeEditorFullScreen);

  const editor = activeNodeId ? nodeEditors[activeNodeId] : null;
  const isFullScreen = editor?.isFullScreen ?? false;

  const wrapperRef = useRef(null);
  // 浮窗实际高度（由 ResizeObserver 驱动，初始用估算值）
  const [floatingHeight, setFloatingHeight] = useState(FLOATING_HEIGHT);

  useEffect(() => {
    if (!wrapperRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const h = Math.round(entry.contentRect.height);
        if (h > 0) setFloatingHeight(h);
      }
    });
    ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, []);

  const openFullScreen = () => {
    if (activeNodeId) updateNodeEditorFullScreen(activeNodeId, true);
  };
  const closeFullScreen = () => {
    if (activeNodeId) updateNodeEditorFullScreen(activeNodeId, false);
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

  // 编辑数据回填
  useEffect(() => {
    if (!editor?.data) return;
    const data = editor.data;
    setPrompt(data.prompt ?? "");
    setStyleValue(data.style ?? "default");
    setImageUrl(data.imageUrl ?? "");
    setParams(data.params ?? params);
  }, [editor?.data]);

  // 浮窗定位样式：full-screen 单独处理；普通模式使用 position prop 计算边界避让
  const wrapperStyle = useMemo(() => {
    if (!visible) return { display: "none" };
    const baseStyle = {
      position: "fixed",
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
        transform: "translateX(0)",
        width: "900px",
        height: "700px",
        borderRadius: "10px",
      };
    }

    // 普通模式：position 指向锚点（节点左边缘屏幕 X, 节点底部屏幕 Y）
    // 由父组件（ImageNode/VideoNode）传入真实计算结果
    if (!position) {
      return { ...baseStyle, display: "none" };
    }
    const { left, top } = calculateFloatingPosition(
      position.left,
      position.top,
      FLOATING_WIDTH,
      floatingHeight,
      MARGIN_GAP
    );
    return {
      ...baseStyle,
      left,
      top,
      width: FLOATING_WIDTH,
      height: floatingHeight,
    };
  }, [visible, isFullScreen, position, floatingHeight]);

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
  };

  if (!visible) return null;

  const innerContent = (
    <div
      ref={wrapperRef}
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

      {/* 顶部按钮栏 */}
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
  );

  return createPortal(
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
      {innerContent}
    </ConfigProvider>,
    document.body
  );
};

export default FloatingEditor;
