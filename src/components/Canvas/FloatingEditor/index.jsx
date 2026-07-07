import useCanvasStore from "@/store/canvasStore";
import { ConfigProvider, theme } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import BottomParamToolbar from "./BottomParamToolbar";
import PromptInputArea from "./PromptInputArea";
import TopActionBar from "./TopActionBar";

import { getAspectRatioSize } from "@/utils/aspectRatioMap";
import { ArrowsAltOutlined, ShrinkOutlined } from "@ant-design/icons";
import { Button } from "antd";

const FloatingEditor = ({ visible, position, onSubmit, onClose, nodeType }) => {
  const activeNodeId = useCanvasStore((state) => state.activeNodeId);
  const nodeEditors = useCanvasStore((state) => state.nodeEditors);
  const nodes = useCanvasStore((state) => state.nodes);
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const editor = activeNodeId ? nodeEditors[activeNodeId] : null;

  // 获取当前节点的完整数据（从 store 中的 nodes 读取，用于重建上游媒体）
  const currentNode = useMemo(() => {
    return nodes.find((n) => n.id === activeNodeId);
  }, [nodes, activeNodeId]);

  // 获取当前节点的上游媒体引用（从当前节点的 data.refAssetList 构建）
  // refAssetList 格式: [{ id, type, url, thumbnail, name, sourceNodeId }]
  const upstreamMediaArray = useMemo(() => {
    const refAssetList = currentNode?.data?.refAssetList || [];
    return refAssetList.map((asset, index) => ({
      id: asset.id || `upstream-${index}`,
      type: asset.type || "image",
      url: asset.url || "",
      thumbnail: asset.thumbnail || asset.url || "",
      name: asset.name || "素材",
      sourceNodeId: asset.sourceNodeId || null,
    }));
  }, [currentNode?.data?.refAssetList]);

  // 将上游媒体数组转换为 PromptInputArea 期望的 assetList 格式
  // assetList 格式: { id, type, image, label, url, thumbnail, sourceNodeId }
  const assetList = useMemo(() => {
    if (!upstreamMediaArray || upstreamMediaArray.length === 0) return [];
    return upstreamMediaArray.map((media) => ({
      id: media.id,
      type: media.type === "video" ? "video" : "img",
      image: media.thumbnail || media.url,
      url: media.url,
      thumbnail: media.thumbnail || media.url,
      label: media.name || `${media.type === "video" ? "视频" : "图片"}`,
      name: media.name,
      sourceNodeId: media.sourceNodeId,
    }));
  }, [upstreamMediaArray]);

  const [isFullScreen, setIsFullScreen] = useState(false);

  const openFullScreen = () => {
    setIsFullScreen(true);
  };

  const closeFullScreen = () => {
    setIsFullScreen(false);
  };

  // 删除上游媒体引用及对应的连线
  const handleRemoveMedia = useCallback(
    (mediaRef) => {
      const { removeEdgesBySourceNode } = useCanvasStore.getState();
      if (!activeNodeId || !mediaRef) return;

      // 获取最新的 edges 状态
      const { edges } = useCanvasStore.getState();

      // 1. 从当前节点的 refAssetList 中移除该媒体（用 id 匹配）
      const currentRefAssetList = currentNode?.data?.refAssetList || [];
      const updatedRefAssetList = currentRefAssetList.filter(
        (asset) => asset.id !== mediaRef.id
      );

      // 2. 直接基于真实编辑器 DOM 清理原子块，避免 prompt state 与 DOM 脱节
      const editorEl = document.getElementById("zyg-prompt-editor");
      console.log("[remove-media] editorEl=", !!editorEl, "editorInnerHTML=", editorEl ? editorEl.innerHTML : null);
      const currentPrompt = editorEl ? editorEl.innerHTML : promptRef.current || "";
      const parser = new DOMParser();
      const doc = parser.parseFromString(currentPrompt, "text/html");
      const tags = doc.querySelectorAll(`[data-asset-id="${mediaRef.id}"]`);
      console.log("[remove-media] before cleanup tags=", tags.length, "currentPrompt=", currentPrompt);
      tags.forEach((tag) => {
        const outerShell = tag.closest('[contenteditable="false"]');
        if (outerShell) outerShell.remove();
      });
      const cleanedPrompt = doc.body.innerHTML;
      console.log("[remove-media] after cleanup cleanedPrompt=", cleanedPrompt);
      if (editorEl) {
        editorEl.innerHTML = cleanedPrompt;
      }

      // 3. 更新 store
      updateNodeData(activeNodeId, {
        refAssetList: updatedRefAssetList,
        prompt: cleanedPrompt,
      });

      // 4. 同步本地 prompt state，让 PromptInputArea 接收到新的 html
      setPrompt(cleanedPrompt);

      // 5. 找到对应的边并删除
      if (mediaRef.sourceNodeId) {
        removeEdgesBySourceNode(mediaRef.sourceNodeId, activeNodeId);
      }
    },
    [activeNodeId, currentNode, updateNodeData]
  );

  // 全局状态统一放在父组件
  const [prompt, setPrompt] = useState("");
  const promptRef = useRef(prompt);
  useEffect(() => {
    promptRef.current = prompt;
  }, [prompt]);
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

  // 防抖保存定时器
  const saveTimerRef = useRef(null);

  // 同步数据到 node.data（防抖）
  const syncToNodeData = useCallback(
    (updates) => {
      if (!activeNodeId) return;

      // 清除之前的定时器
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      // 设置新的定时器，300ms 后保存
      saveTimerRef.current = setTimeout(() => {
        console.log('[3] 300ms 防抖到期，真正写入 store, updates =', updates);
        updateNodeData(activeNodeId, updates);
        saveTimerRef.current = null;
      }, 300);
    },
    [activeNodeId, updateNodeData]
  );

  // prompt 变化时同步到 node.data
  const handlePromptChange = useCallback(
    (newHtml) => {
      console.log('[2] handlePromptChange 收到 newHtml =', newHtml);
      setPrompt(newHtml);
      syncToNodeData({ prompt: newHtml });
    },
    [syncToNodeData]
  );

  // refAssetList 变化时同步到 node.data
  // assetList 格式: { id, type, image, label }
  // refAssetList 格式: { id, type, url, thumbnail, name, sourceNodeId }
  const handleAssetListChange = useCallback(
    (newAssetList) => {
      // 将 assetList 格式转换为 refAssetList 格式
      const updatedRefAssetList = newAssetList.map((asset) => ({
        id: asset.id,
        type: asset.type === "video" ? "video" : "image",
        url: asset.url || asset.image || "",
        thumbnail: asset.thumbnail || asset.image || "",
        name: asset.label || asset.name || "素材",
        sourceNodeId: asset.sourceNodeId || null,
      }));
      syncToNodeData({ refAssetList: updatedRefAssetList });
    },
    [syncToNodeData]
  );

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  // 编辑数据回填（仅在 activeNodeId 变化时执行）
  useEffect(() => {
    // 使用 currentNode.data（从 store 的 nodes 中获取的实时数据）
    // 而不是 editor.data（仅在打开浮窗时的快照）
    const nodeData = currentNode?.data || {};
    setPrompt(nodeData.prompt ?? "");
    setStyleValue(nodeData.style ?? "default");
    setImageUrl(nodeData.imageUrl ?? "");
    setParams(nodeData.params ?? params);
  }, [activeNodeId, currentNode]);

  // 让提示词框随节点高度变化同步位移，始终与节点底边保持默认间距，避免重叠或间距忽大忽小。
  // 图片/视频节点默认宽度均为 260，默认比例 1:1 → 默认高度 260。
  // 关键：提示词框以 position:fixed 定位，其包含块是带 transform 的节点本身，
  // 因此 `top: 50%` 已随节点高度变化贡献了「一半」的位移，这里只需再补另一半，
  // 即偏移量 =（当前高度 - 默认高度）/ 2（可正可负），叠加后恰好等于节点底边的
  // 实际位移量，从而保证任意比例（竖版更高 / 横版更矮）、任意缩放下间距都与默认完全一致。
  const NODE_WIDTH = 400;
  const NODE_DEFAULT_HEIGHT = 260;
  const nodeHeightOffset = useMemo(() => {
    const aspectRatio = editor?.data?.aspect_ratio;
    if (!aspectRatio) return 0;
    const size = getAspectRatioSize(aspectRatio);
    const height = Math.round((NODE_WIDTH * size.height) / size.width);
    return (height - NODE_DEFAULT_HEIGHT) / 2;
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
      // 基础位置 + 节点高度增量的一半（节点局部坐标）：
      // 与包含块 `top:50%` 贡献的另一半叠加，恰好等于节点底边的实际位移，从而保持
      // 提示词框与节点底边的间距恒定。整个提示词框位于缩放后的画布视口内，会随
      // 画布 zoom 一同缩放，因此这里无需再乘 zoom——间距会与节点一样自然随缩放变化。
      top: `calc(50% + 160px + ${nodeHeightOffset}px)`,
      width: 900,
      height: 400,
    };
  }, [visible, isFullScreen, nodeHeightOffset]);

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
          upstreamMedia={upstreamMediaArray[0] || null}
          upstreamMediaList={upstreamMediaArray}
          onRemoveMedia={handleRemoveMedia}
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
            onChangeHtml={handlePromptChange}
            assetList={assetList}
            onChangeAssetList={handleAssetListChange}
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
