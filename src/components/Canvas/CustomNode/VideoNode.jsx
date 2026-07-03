import useCanvasStore from "@/store/canvasStore";
import { getAspectRatioSize } from "@/utils/aspectRatioMap";
import { PlayCircleOutlined } from "@ant-design/icons";
import { Position } from "@xyflow/react";
import { memo, useEffect, useMemo } from "react";
import PlusHandle from "../CustomPoint/PlusHandle";
import { useNodeMagnet } from "../CustomPoint/useMagnetStore";
import FloatingEditor from "../FloatingEditor";

const VIDEO_NODE_WIDTH = 240;
const DEFAULT_ASPECT_RATIO = "227";

/**
 * 视频节点组件 - 显示视频缩略图的节点
 * 左侧为 Input（接收图片或视频），右侧为 Output（输出视频）
 * 数据类型: VIDEO
 */
const VideoNode = memo(({ id, data, selected }) => {
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
  const editor = nodeEditors[id];
  const isThisEditorOpen = activeNodeId === id && !!editor?.visible;

  const handleNodeClick = (e) => {
    e.stopPropagation();
    if (isThisEditorOpen) {
      hideActiveEditor(id);
      return;
    }

    showActiveEditor(id, "video");
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
          nodeType: "video",
          position: screenPos,
          data: data || {},
        },
      },
      panelPos: screenPos,
    }));
  };

  const nodeData = editor?.data ?? data ?? {};
  const aspectRatio = nodeData.aspect_ratio || DEFAULT_ASPECT_RATIO;

  const previewStyle = useMemo(() => {
    const size = getAspectRatioSize(aspectRatio);
    const height = Math.round((VIDEO_NODE_WIDTH * size.height) / size.width);
    return {
      width: VIDEO_NODE_WIDTH,
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
      onClick={handleNodeClick}
      style={{
        position: "relative",
        width: previewStyle.width,
        aspectRatio: previewStyle.aspectRatio,
        background: "#262626",
        borderRadius: "12px",
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
      }}
    >
      {/* 左侧 Input 端口 - 接收图片或视频输入 */}
      <PlusHandle
        type="target"
        position={Position.Left}
        id="input"
        color="#722ed1"
        offsetKey="left"
      />

      <div
        style={{
          height: previewStyle.height,
          background: "#1f1f1f",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          borderRadius: "10px",
        }}
      >
        {nodeData.thumbnail && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `url(${nodeData.thumbnail}) center/cover no-repeat`,
            }}
          />
        )}

        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1,
          }}
        >
          <PlayCircleOutlined style={{ color: "#555555", fontSize: "50px" }} />
        </div>

        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            padding: "8px",
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 100%)",
            display: "flex",
            justifyContent: "flex-end",
            opacity: selected ? 1 : 0,
            transition: "opacity 0.2s",
          }}
        ></div>

        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "8px",
            background:
              "linear-gradient(0deg, rgba(0,0,0,0.7) 0%, transparent 100%)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span
            style={{
              color: "#fff",
              fontSize: "12px",
              fontWeight: 500,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
            }}
          >
            {nodeData.name}
          </span>
        </div>
      </div>

      {/* 右侧 Output 端口 - 输出视频 */}
      <PlusHandle
        type="source"
        position={Position.Right}
        id="output"
        color="#722ed1"
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
            nodeType="video"
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

VideoNode.displayName = "VideoNode";

export default VideoNode;
