import useCanvasStore from "@/store/canvasStore";
import { Handle, Position } from "@xyflow/react";
import { memo, useCallback } from "react";
import FloatingEditor from "../FloatingEditor";

const ImageNode = memo(({ id, data, selected }) => {
  const hideActiveEditor = useCanvasStore((state) => state.hideActiveEditor);
  const showActiveEditor = useCanvasStore((state) => state.showActiveEditor);
  const setActiveNodeId = useCanvasStore((state) => state.setActiveNodeId);
  const setNodeEditorPosition = useCanvasStore((state) => state.setNodeEditorPosition);
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

      const node = useCanvasStore.getState().nodes.find((item) => item.id === id);
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
            nodeType: 'image',
            position: screenPos,
            data: data || {},
          },
        },
        panelPos: screenPos,
      }));
    },
    [id, isThisEditorOpen, hideActiveEditor, showActiveEditor, setActiveNodeId, data],
  );

  const nodeData = editor?.data ?? data ?? {};

  return (
    <div
      onClick={handleNodeClick}
      style={{
        position: "relative",
        width: "220px",
        background: "#262626",
        borderRadius: 12,
        border: selected ? "2px solid #177ddc" : "1px solid #303030",
        overflow: "visible",
        boxShadow: selected
          ? "0 0 20px rgba(23, 125, 220, 0.3)"
          : "0 4px 12px rgba(0,0,0,0.3)",
        transition: "all 0.2s ease",
        cursor: "pointer",
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        style={{
          background: "#1890ff",
          width: 10,
          height: 10,
          border: "2px solid #262626",
          left: -5,
        }}
      />

      <div
        style={{
          height: "150px",
          background: `url(${nodeData.url || nodeData.thumbnail}) center/cover no-repeat`,
        }}
      />

      <div
        style={{
          padding: "6px 10px",
          background: "linear-gradient(0deg, rgba(0,0,0,0.7) 0%, transparent 100%)",
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
          {nodeData.name || "Image"}
        </span>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{
          background: "#1890ff",
          width: 10,
          height: 10,
          border: "2px solid #262626",
          right: -5,
        }}
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
