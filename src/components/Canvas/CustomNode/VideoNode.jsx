import useCanvasStore from "@/store/canvasStore";
import { getAspectRatioSize } from "@/utils/aspectRatioMap";
import { getThumbUrl } from "@/utils/thumbnail";
import { PlayCircleOutlined } from "@ant-design/icons";
import { Position, useUpdateNodeInternals } from "@xyflow/react";
import { Input } from "antd";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import PlusHandle from "../CustomPoint/PlusHandle";
import { useNodeMagnet } from "../CustomPoint/useMagnetStore";
import FloatingEditor from "../FloatingEditor";

// 与图片节点保持一致的默认宽度，确保两种节点初始高宽相同
const VIDEO_NODE_WIDTH = 400;
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
  const aspectRatio = nodeData.aspect_ratio ?? DEFAULT_ASPECT_RATIO;

  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(nodeData.name || "");
  const nameInputRef = useRef(null);

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
    const height = Math.round((VIDEO_NODE_WIDTH * size.height) / size.width);
    return {
      width: VIDEO_NODE_WIDTH,
      height,
      aspectRatio: `${size.width} / ${size.height}`,
    };
  }, [aspectRatio]);

  // 同步节点尺寸到 ReactFlow：通知画布重新测量节点 DOM 并更新 handleBounds，
  // 使连接线端点能跟随节点高度变化动态调整到侧边中点
  useEffect(() => {
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
      {/* 内容层：背景图+播放按钮+渐变条，统一被圆角裁剪；浮窗独立在 overflow: visible 的父容器下，不被裁剪 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 12,
          overflow: "hidden",
          background: "#1f1f1f",
          transition: "height 0.28s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {nodeData.thumbnail && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `url(${getThumbUrl(nodeData.fullurl)}) center/cover no-repeat`,
            }}
          />
        )}

        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <PlayCircleOutlined style={{ color: "#555555", fontSize: "50px" }} />
        </div>
      </div>

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
    </div>
  );
});

VideoNode.displayName = "VideoNode";

export default VideoNode;
