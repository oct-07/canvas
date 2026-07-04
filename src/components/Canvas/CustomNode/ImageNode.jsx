import useCanvasStore from "@/store/canvasStore";
import { getAspectRatioSize } from "@/utils/aspectRatioMap";
import { PictureOutlined } from "@ant-design/icons";
import { Position } from "@xyflow/react";
import { memo, useEffect, useMemo, useState } from "react";
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
  const isThisNodeDragging = draggingNodeId === id;
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

  // 节点屏幕坐标（锚点 = 节点底部中央），用于 FloatingEditor 定位
  // 通过 selector 只订阅当前节点，拖动时本节点坐标变化会触发重算
  const node = useCanvasStore((state) => state.nodes.find((n) => n.id === id));
  const viewport = useCanvasStore((state) => state.viewport);
  const [floatingPos, setFloatingPos] = useState({ left: 0, top: 0 });
  useEffect(() => {
    const worldX = node?.position?.x ?? 0;
    const worldY = node?.position?.y ?? 0;
    const screenLeft = viewport.x + worldX * viewport.zoom;
    const screenTop = viewport.y + worldY * viewport.zoom;
    setFloatingPos({
      left: screenLeft + IMAGE_NODE_WIDTH / 2,
      top: screenTop + previewStyle.height,
    });
  }, [node, viewport.x, viewport.y, viewport.zoom, previewStyle.height]);

  // 同步节点尺寸到 ReactFlow store
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
        offsetKey="right"
      />

      {/* 浮窗常驻挂载，位置由 position prop 驱动，不可见时由外层控制 */}
      <FloatingEditor
        visible={isThisEditorOpen && !isThisNodeDragging}
        position={floatingPos}
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
  );
});

ImageNode.displayName = "ImageNode";
export default ImageNode;
