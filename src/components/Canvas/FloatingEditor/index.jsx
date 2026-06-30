import useCanvasStore from "@/store/canvasStore";
import { ConfigProvider, theme } from "antd";
import { useEffect, useMemo, useState } from "react";

import BottomParamToolbar from "./BottomParamToolbar";
import PromptInputArea from "./PromptInputArea";
import TopActionBar from "./TopActionBar";

// 常量建议抽到单独文件，这里临时定义
export const STYLE_OPTIONS = [
  { label: "默认", value: "default" },
  { label: "写实", value: "realistic" },
  { label: "动漫", value: "anime" },
  { label: "素描", value: "sketch" },
];
export const PRESET_SIZES = [
  { label: "1:1", value: "1:1", width: 1024, height: 1024 },
  { label: "4:3", value: "4:3", width: 1152, height: 896 },
  { label: "3:4", value: "3:4", width: 896, height: 1152 },
  { label: "16:9", value: "16:9", width: 1344, height: 768 },
];

const FloatingEditor = ({ visible, position, onSubmit, onClose }) => {
  const activeNodeId = useCanvasStore((state) => state.activeNodeId);
  const nodeEditors = useCanvasStore((state) => state.nodeEditors);
  const editor = activeNodeId ? nodeEditors[activeNodeId] : null;

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

  // 弹窗定位样式
  const wrapperStyle = useMemo(() => {
    if (!visible) return { display: "none" };
    return {
      position: "absolute",
      left: 0,
      top: "100%",
      marginTop: 8,
      zIndex: 9999,
      width: 820,
      borderRadius: 12,
      background: "#141414",
      border: "1px solid #303030",
      boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
      padding: 20,
      overflow: "hidden",
    };
  }, [visible]);

  // 上传参考图处理
  const handleUploadRefImage = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => setImageUrl(ev.target.result);
      reader.readAsDataURL(file);
    };
    input.click();
  };

  // 提交生成
  const handleSend = () => {
    const submitData = {
      prompt: prompt || undefined,
      style: styleValue,
      imageUrl: imageUrl || undefined,
      params,
      model,
      sizeConfig,
      preset,
      cameraMode,
      imageCount,
    };
    onSubmit(submitData);
    // 提交后清空输入
    setPrompt("");
    setImageUrl("");
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
        {/* 1. 顶部按钮栏 */}
        <TopActionBar
          styleValue={styleValue}
          onChangeStyle={setStyleValue}
          onOpenMark={() => console.log("打开标记面板")}
          onUploadRefImage={handleUploadRefImage}
        />

        {/* 2. 中间提示词输入 */}
        <PromptInputArea prompt={prompt} onChangePrompt={setPrompt} />

        {/* 3. 底部全部参数工具栏 */}
        <BottomParamToolbar
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
