import useCanvasStore from "@/store/canvasStore";
import { getAspectRatioSize } from "@/utils/aspectRatioMap";
import { PictureOutlined } from "@ant-design/icons";
import { Position } from "@xyflow/react";
import { memo, useEffect, useMemo } from "react";
import PlusHandle from "../CustomPoint/PlusHandle";
import { useNodeMagnet } from "../CustomPoint/useMagnetStore";
import FloatingEditor from "../FloatingEditor";

const IMAGE_NODE_WIDTH = 260;
const DEFAULT_ASPECT_RATIO = "227";

const ImageNode = memo(({ id, data, selected }) => {
  const { isTarget, tiltX, tiltY, canConnect } = useNodeMagnet(id);
  const magnetColor = canConnect ? "#52c41a" : "#ff4d4f";
  const hideActiveEditor = useCanvasStore((state) => state.hideActiveEditor);

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

  const previewStyle = useMemo(() => {
    const size = getAspectRatioSize(aspectRatio);
    const height = Math.round((IMAGE_NODE_WIDTH * size.height) / size.width);
    return {
      width: IMAGE_NODE_WIDTH,
      height,
      aspectRatio: `${size.width} / ${size.height}`,
    };
  }, [aspectRatio]);

  // 同步节点尺寸到 ReactFlow store，使画布盒子跟随比例变化
  useEffect(() => {
    useCanvasStore
      .getState()
      .syncNodeDimensions(id, previewStyle.width, previewStyle.height);
  }, [id, previewStyle.width, previewStyle.height]);

  return (
    <div
      style={{
        position: "relative",
        width: previewStyle.width,
        aspectRatio: previewStyle.aspectRatio,
        background: "#262626",
        borderRadius: 12,
        border: isTarget
          ? `2px solid ${magnetColor}`
          : isActive
            ? "2px solid #177ddc"
            : "1px solid #303030",
        overflow: "visible",
        boxShadow: isTarget
          ? `0 0 0 2px ${magnetColor}66, 0 8px 24px ${magnetColor}44`
          : isActive
            ? "0 0 20px rgba(23, 125, 220, 0.3)"
            : "0 4px 12px rgba(0,0,0,0.3)",
        transition: "box-shadow 0.15s ease, border-color 0.15s ease",
        transformStyle: "preserve-3d",
        transform: isTarget
          ? `perspective(700px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`
          : "none",
      }}
    >
      <PlusHandle
        type="target"
        position={Position.Left}
        id="input"
        color="#1890ff"
        offsetKey="left"
      />

      <div
        style={{
          height: previewStyle.height,
          background: "#1f1f1f",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "12px 12px 0 0",
          overflow: "hidden",
        }}
      >
        {nodeData.url || nodeData.thumbnail ? (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: `url(${nodeData.url || nodeData.thumbnail}) center/cover no-repeat`,
            }}
          />
        ) : (
          <PictureOutlined style={{ fontSize: 46, color: "#555" }} />
        )}
      </div>
      <div
        style={{
          padding: "6px 10px",
          background:
            "linear-gradient(0deg, rgba(0,0,0,0.7) 0%, transparent 100%)",
        }}
      >
        <span
          style={{
            color: "#fff",
            fontSize: 12,
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            display: "block",
          }}
        >
          {nodeData.name}
        </span>
      </div>

      <PlusHandle
        type="source"
        position={Position.Right}
        id="output"
        color="#1890ff"
        offsetKey="right"
      />

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
