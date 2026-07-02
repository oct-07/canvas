import useCanvasStore from "@/store/canvasStore";
import { getNodeStyleFromAspect } from "@/utils/aspectRatioMap";
import { PictureOutlined } from "@ant-design/icons";
import { Position } from "@xyflow/react";
import { memo, useCallback, useMemo } from "react";
import FloatingEditor from "../FloatingEditor";
import { useNodeMagnet } from "../CustomPoint/useMagnetStore";
import PlusHandle from "../CustomPoint/PlusHandle";

const ImageNode = memo(({ id, data, selected }) => {
  const { isTarget, tiltX, tiltY, canConnect } = useNodeMagnet(id);
  const magnetColor = canConnect ? "#52c41a" : "#ff4d4f";
  const hideActiveEditor = useCanvasStore((state) => state.hideActiveEditor);
  const showActiveEditor = useCanvasStore((state) => state.showActiveEditor);
  const setActiveNodeId = useCanvasStore((state) => state.setActiveNodeId);
  const setNodeEditorPosition = useCanvasStore(
    (state) => state.setNodeEditorPosition,
  );
  const setNodeEditorData = useCanvasStore((state) => state.setNodeEditorData);

  const activeNodeId = useCanvasStore((state) => state.activeNodeId);
  const nodeEditors = useCanvasStore((state) => state.nodeEditors);
  const editor = activeNodeId ? nodeEditors[activeNodeId] : null;
  const isThisEditorOpen = activeNodeId === id && !!editor?.visible;

  const handleNodeClick = useCallback(
    (e) => {
      e.stopPropagation();
      if (isThisEditorOpen) {
        hideActiveEditor(id);
        return;
      }

      showActiveEditor(id, "image");
      setActiveNodeId(id);

      const node = useCanvasStore
        .getState()
        .nodes.find((item) => item.id === id);
      if (!node) return;

      const viewport = useCanvasStore.getState().viewport;
      const screenPos = {
        left: node.position.x * viewport.zoom + viewport.x,
        top: node.position.y * viewport.zoom + viewport.y + 150,
      };
      useCanvasStore.setState((state) => ({
        activeNodeId: id,
        nodeEditors: {
          ...state.nodeEditors,
          [id]: {
            visible: true,
            nodeType: "image",
            position: screenPos,
            data: data || {},
          },
        },
        panelPos: screenPos,
      }));
    },
    [
      id,
      isThisEditorOpen,
      hideActiveEditor,
      showActiveEditor,
      setActiveNodeId,
      data,
    ],
  );

  const nodeData = editor?.data ?? data ?? {};
  const aspectRatio = nodeData.aspect_ratio || "272";

  const previewStyle = useMemo(() => {
    const { width, height } = getNodeStyleFromAspect(aspectRatio, 220);
    return { width, height };
  }, [aspectRatio]);

  return (
    <div
      onClick={handleNodeClick}
      style={{
        position: "relative",
        width: previewStyle.width,
        background: "#262626",
        borderRadius: 12,
        border: isTarget
          ? `2px solid ${magnetColor}`
          : selected
            ? "2px solid #177ddc"
            : "1px solid #303030",
        overflow: "visible",
        boxShadow: isTarget
          ? `0 0 0 2px ${magnetColor}66, 0 8px 24px ${magnetColor}44`
          : selected
            ? "0 0 20px rgba(23, 125, 220, 0.3)"
            : "0 4px 12px rgba(0,0,0,0.3)",
        transition: "box-shadow 0.15s ease, border-color 0.15s ease",
        transformStyle: "preserve-3d",
        transform: isTarget
          ? `perspective(700px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`
          : "none",
        cursor: "pointer",
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

      {isThisEditorOpen && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: "100%",
            marginTop: 8,
            zIndex: 9999,
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
      )}
    </div>
  );
});

ImageNode.displayName = "ImageNode";
export default ImageNode;
