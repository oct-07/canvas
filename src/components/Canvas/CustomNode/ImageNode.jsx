import useCanvasStore from "@/store/canvasStore";
import { getAspectRatioSize } from "@/utils/aspectRatioMap";
import { getThumbUrl } from "@/utils/thumbnail";
import { PictureOutlined } from "@ant-design/icons";
import { Position, useUpdateNodeInternals } from "@xyflow/react";
import { Input } from "antd";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import PlusHandle from "../CustomPoint/PlusHandle";
import { useNodeMagnet } from "../CustomPoint/useMagnetStore";
import FloatingEditor from "../FloatingEditor";
import {
  MediaNodeToolbar,
  useMediaToolbarActions,
  useShowToolbar,
} from "./NodeCommon";
import GenerationOverlay from "./NodeCommon/GenerationOverlay";

const IMAGE_NODE_WIDTH = 400;
const DEFAULT_ASPECT_RATIO = "227";

const ImageNode = memo(({ id, data, selected }) => {
  const { isTarget, tiltX, tiltY, canConnect } = useNodeMagnet(id);
  const magnetColor = canConnect ? "#52c41a" : "#ff4d4f";
  const hideActiveEditor = useCanvasStore((state) => state.hideActiveEditor);
  const updateNodeInternals = useUpdateNodeInternals();

  const activeNodeId = useCanvasStore((state) => state.activeNodeId);
  const nodeEditors = useCanvasStore((state) => state.nodeEditors);
  const draggingNodeId = useCanvasStore((state) => state.draggingNodeId);
  const editor = nodeEditors[id];
  const isThisEditorOpen = activeNodeId === id && !!editor?.visible;
  // 当前节点正在被拖动 → 浮窗强制隐藏（不卸载，保留内部输入状态）
  const isThisNodeDragging = draggingNodeId === id;
  // 边框高亮优先级：磁吸命中 > 当前激活节点 > React Flow 选中 > 默认
  const isActive = isThisEditorOpen || activeNodeId === id || selected;

  const nodeData = editor?.data ?? data ?? {};
  const aspectRatio = nodeData.aspect_ratio || DEFAULT_ASPECT_RATIO;
  const hasUrl = !!nodeData.url;

  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(nodeData.name || "");
  const nameInputRef = useRef(null);

  // 单选时才浮工具栏；仅在有真实素材（url）时接入，避免空节点误显
  const showToolbar = useShowToolbar(id, selected);
  const { handleCrop, handleRotate, handleDownload, handleFullscreen } =
    useMediaToolbarActions({ id, data: nodeData, mediaType: "image" });

  // 当 nodeData.name 从外部变化时同步本地编辑状态
  useEffect(() => {
    if (!isEditingName) {
      setNameValue(nodeData.name || "");
    }
  }, [nodeData.name, isEditingName]);

  // 编辑态自动聚焦
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isEditingName]);

  const handleNameClick = (e) => {
    e.stopPropagation();
    setIsEditingName(true);
  };

  const handleNameChange = (e) => {
    setNameValue(e.target.value);
  };

  const handleNameBlur = () => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== nodeData.name) {
      updateNodeData(id, { name: trimmed });
    } else {
      setNameValue(nodeData.name || "");
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
    if (e.key === "Escape") {
      setNameValue(nodeData.name || "");
      setIsEditingName(false);
    }
  };

  const previewStyle = useMemo(() => {
    const size = getAspectRatioSize(aspectRatio);
    const height = Math.round((IMAGE_NODE_WIDTH * size.height) / size.width);
    return {
      width: IMAGE_NODE_WIDTH,
      height,
      aspectRatio: `${size.width} / ${size.height}`,
    };
  }, [aspectRatio]);

  // 同步节点尺寸到 ReactFlow：通知画布重新测量节点 DOM 并更新 handleBounds，
  // 使连接线端点能跟随节点高度变化动态调整到侧边中点
  useEffect(() => {
    // 等待 DOM 渲染完成后再通知 ReactFlow 测量（height 变化有 CSS 过渡）
    const timer = setTimeout(() => {
      updateNodeInternals(id);
    }, 320);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, previewStyle.width, previewStyle.height]);

  return (
    <div
      style={{
        position: "relative",
        width: previewStyle.width,
        height: previewStyle.height,
        aspectRatio: previewStyle.aspectRatio,
        borderRadius: 12,
        overflow: "visible",
        border: isTarget
          ? `2px solid ${magnetColor}`
          : isActive
            ? "2px solid #177ddc"
            : "1px solid #303030",
        boxShadow: isTarget
          ? `0 0 0 2px ${magnetColor}66, 0 8px 24px ${magnetColor}44`
          : isActive
            ? "0 0 20px rgba(23, 125, 220, 0.3)"
            : "0 4px 12px rgba(0,0,0,0.3)",
        transition:
          "box-shadow 0.15s ease, border-color 0.15s ease, height 0.28s cubic-bezier(0.22, 1, 0.36, 1)",
        transformStyle: "preserve-3d",
        transform: isTarget
          ? `perspective(700px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`
          : "none",
      }}
    >
      {/* 内容层：背景图+占位图标+标题，统一被圆角裁剪 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 12,
          overflow: "hidden",
          background: nodeData.url
            ? `url(${getThumbUrl(nodeData.url)}) center/cover no-repeat`
            : "#1f1f1f",
        }}
      >
        {!nodeData.url && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <PictureOutlined style={{ fontSize: 46, color: "#555" }} />
          </div>
        )}
      </div>

      {/* 生成遮罩：pending 转圈 / failed 显示错误文案。
       */}
      {(nodeData.status === "pending" || nodeData.status === "failed") && (
        <GenerationOverlay status={nodeData.status} error={nodeData.error} />
      )}

      {/* 节点名称标签，浮动在盒子上方，支持点击编辑 */}
      {isEditingName ? (
        <Input
          ref={nameInputRef}
          value={nameValue}
          onChange={handleNameChange}
          onBlur={handleNameBlur}
          onKeyDown={handleNameKeyDown}
          onClick={(e) => e.stopPropagation()}
          size="small"
          style={{
            position: "absolute",
            top: -28,
            left: 0,
            right: 0,
            background: "rgba(38, 38, 38, 0.9)",
            borderColor: "#177ddc",
            color: "#fff",
            fontSize: 12,
            fontWeight: 500,
            textAlign: "center",
          }}
        />
      ) : (
        <div
          onClick={handleNameClick}
          style={{
            position: "absolute",
            top: -28,
            left: 0,
            right: 0,
            padding: "4px 10px",
            borderRadius: "8px 8px 0 0",
            background: "transparent",
            backdropFilter: "blur(4px)",
            color: "#fff",
            fontSize: 12,
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            textAlign: "center",
            cursor: "text",
          }}
          title="点击修改名称"
        >
          {nameValue}
        </div>
      )}

      <PlusHandle
        type="target"
        position={Position.Left}
        id="input"
        offsetKey="left"
      />

      <PlusHandle
        type="source"
        position={Position.Right}
        id="output"
        offsetKey="right"
      />

      {/* 仅当真实素材生成后才展示通用工具栏（裁剪/旋转/下载/全屏） */}
      {hasUrl && (
        <MediaNodeToolbar
          id={id}
          showToolbar={showToolbar}
          onCrop={handleCrop}
          onRotate={handleRotate}
          onDownload={handleDownload}
          onFullscreen={handleFullscreen}
        />
      )}

      {/* 节点浮窗：常驻挂载，仅在打开时显示；当前节点被拖动时强制透明，
          保留组件内部 useState（避免提交后输入丢失，与 P0 评审 2.2 同源修复） */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: "100%",
          marginTop: 8,
          zIndex: 9999,
          opacity: isThisEditorOpen && !isThisNodeDragging ? 1 : 0,
          pointerEvents:
            isThisEditorOpen && !isThisNodeDragging ? "auto" : "none",
          visibility:
            isThisEditorOpen || isThisNodeDragging ? "visible" : "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
      >
        <FloatingEditor
          visible
          position={{ left: 0, top: 0 }}
          nodeType="image"
          data={nodeData}
          onSubmit={({ prompt, style, params, imageUrl }) => {
            const payload = { prompt, style, params };
            if (imageUrl) payload.imageUrl = imageUrl;
            useCanvasStore.getState().updateNodeData(id, payload);
          }}
          onClose={() => hideActiveEditor(id)}
        />
      </div>
    </div>
  );
});

ImageNode.displayName = "ImageNode";
export default ImageNode;
