import { FormOutlined } from "@ant-design/icons";
import { Position } from "@xyflow/react";
import { memo, useState, useCallback, useEffect } from "react";
import { useReactFlow } from "@xyflow/react";
import useCanvasStore from "@/store/canvasStore";
import { getNodeScreenPos } from "@/utils/canvasEditor";
import { useNodeMagnet } from "../CustomPoint/useMagnetStore";
import PlusHandle from "../CustomPoint/PlusHandle";

/**
 * 节点容器组件 - 封装 ImageNode/VideoNode 的公共 UI 逻辑
 * 职责：
 * - 边框 / outline / 阴影样式
 * - 3D 倾斜 transform
 * - 选中态视觉（outline + 右上角激活小圆点）
 * - hover 编辑按钮（FormOutlined）
 * - 按下 scale 反馈
 * - syncNodeDimensions 同步
 */
const NodeShell = memo(({
  id,
  selected,
  width,
  height,
  aspectRatio,
  children,
  onEditorOpen,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const { getViewport } = useReactFlow();

  const { isTarget, tiltX, tiltY, canConnect } = useNodeMagnet(id);
  const magnetColor = canConnect ? "#52c41a" : "#ff4d4f";

  const activeNodeId = useCanvasStore((state) => state.activeNodeId);
  const isActive = activeNodeId === id;

  useEffect(() => {
    useCanvasStore.getState().syncNodeDimensions(id, width, height);
  }, [id, width, height]);

  const handleEditClick = useCallback(() => {
    const store = useCanvasStore.getState();

    if (store.activeNodeId === id && store.nodeEditors[id]?.visible) {
      store.hideActiveEditor(id);
      return;
    }

    const viewport = getViewport();
    const node = store.nodes.find((n) => n.id === id);
    if (!node) return;

    const pos = getNodeScreenPos(
      { ...node, position: node.position || { x: 0, y: 0 } },
      viewport,
    );

    store.setActiveNodeId(id);
    store.showActiveEditor(id, node.type);
    store.setNodeEditorPosition(id, pos);
    store.setNodeEditorData(id, node.data || {});
  }, [id, getViewport]);

  const containerStyle = {
    position: "relative",
    width,
    aspectRatio,
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
    outline: isActive ? "2px solid #177ddc" : "none",
    outlineOffset: 2,
    transition: "box-shadow 0.15s ease, border-color 0.15s ease, outline 0.15s ease, transform 80ms ease-out",
    transformStyle: "preserve-3d",
    transform: isTarget
      ? `perspective(700px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(${isPressed ? 0.98 : 1})`
      : isPressed
        ? "scale(0.98)"
        : "none",
    cursor: isHovered ? "pointer" : "default",
  };

  return (
    <div
      style={containerStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
    >
      {/* 左侧 Input 端口 */}
      <PlusHandle type="target" position={Position.Left} id="input" offsetKey="left" />

      {/* 节点内容 */}
      {children}

      {/* 右侧 Output 端口 */}
      <PlusHandle type="source" position={Position.Right} id="output" offsetKey="right" />

      {/* 选中态激活小圆点 */}
      {isActive && (
        <div
          style={{
            position: "absolute",
            top: -4,
            right: -4,
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#177ddc",
            zIndex: 10,
          }}
        />
      )}

      {/* Hover 编辑按钮 */}
      <div
        style={{
          position: "absolute",
          top: -4,
          left: -4,
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: "#262626",
          border: "1px solid #303030",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: isHovered ? 1 : 0,
          transition: "opacity 0.15s ease, border-color 0.15s ease",
          cursor: "pointer",
          zIndex: 10,
        }}
        onClick={(e) => {
          e.stopPropagation();
          handleEditClick();
        }}
        onMouseEnter={() => {}}
        onMouseLeave={() => {}}
      >
        <FormOutlined
          style={{
            fontSize: 12,
            color: isHovered ? "#177ddc" : "#555",
            transition: "color 0.15s ease",
          }}
        />
      </div>
    </div>
  );
});

NodeShell.displayName = "NodeShell";
export default NodeShell;
