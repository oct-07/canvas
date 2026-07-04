/**
 * 自定义节点组件
 */
import {
  FileTextOutlined,
  PictureOutlined,
  RobotOutlined,
} from "@ant-design/icons";
import { Position } from "@xyflow/react";
import { memo } from "react";
import ImageNode from "./ImageNode";
import UploadMediaNode from "./UploadMediaNode";
import VideoNode from "./VideoNode";
import { useNodeMagnet } from "../CustomPoint/useMagnetStore";
import PlusHandle from "../CustomPoint/PlusHandle";

/**
 * 自定义节点组件 - 通用的文本/AI 节点
 * 左侧为 Input，右侧为 Output
 */
const CustomNode = ({ id, data, type, selected }) => {
  const { label = "", description = "", icon } = data;
  const { isTarget, tiltX, tiltY, canConnect } = useNodeMagnet(id);

  const getNodeIcon = () => {
    if (icon) return icon;
    switch (type) {
      case "text":
        return <FileTextOutlined />;
      case "image":
        return <PictureOutlined />;
      case "ai":
        return <RobotOutlined />;
      default:
        return <FileTextOutlined />;
    }
  };

  const getNodeStyle = () => {
    switch (type) {
      case "ai":
        return {
          background: "linear-gradient(135deg, #262626 0%, #1a1a2e 100%)",
        };
      case "image":
        return {
          background: "#1a2634",
        };
      default:
        return {
          background: "#262626",
        };
    }
  };

  // 磁吸命中反馈：绿色可连 / 红色不可连
  const magnetColor = canConnect ? "#52c41a" : "#ff4d4f";

  const nodeStyle = {
    padding: "12px 16px",
    background: getNodeStyle().background,
    border: `1px solid ${
      isTarget ? magnetColor : getNodeStyle().borderColor
    }`,
    borderRadius: 8,
    minWidth: 150,
    maxWidth: 300,
    boxShadow: isTarget
      ? `0 0 0 2px ${magnetColor}66, 0 8px 24px ${magnetColor}44`
      : "0 2px 8px rgba(0, 0, 0, 0.3)",
    transition: "box-shadow 0.15s ease, border-color 0.15s ease",
    // 卡片 3D 倾斜（跟随光标）
    transformStyle: "preserve-3d",
    transform: isTarget
      ? `perspective(600px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`
      : "none",
    ...(selected &&
      !isTarget && {
        boxShadow: `0 0 0 2px ${getNodeStyle().borderColor}40`,
      }),
  };

  const headerStyle = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: description ? 8 : 0,
    fontWeight: 600,
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 14,
  };

  const iconStyle = {
    fontSize: 16,
    color: getNodeStyle().borderColor,
  };

  const contentStyle = {
    color: "rgba(255, 255, 255, 0.65)",
    fontSize: 13,
    lineHeight: 1.5,
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "-webkit-box",
    WebkitLineClamp: 3,
    WebkitBoxOrient: "vertical",
  };

  return (
    <div className={`canvas-node canvas-node-${type}`} style={nodeStyle}>
      {/* 左侧 Input 端口 */}
      <PlusHandle
        type="target"
        position={Position.Left}
        id="input"
        color="#1890ff"
        offsetKey="left"
      />

      {/* 节点内容 */}
      <div style={headerStyle}>
        <span style={iconStyle}>{getNodeIcon()}</span>
        <span>{label}</span>
      </div>

      {description && <div style={contentStyle}>{description}</div>}

      {/* 右侧 Output 端口 */}
      <PlusHandle
        type="source"
        position={Position.Right}
        id="output"
        color="#1890ff"
        offsetKey="right"
      />
    </div>
  );
};

export default memo(CustomNode);

/**
 * 节点类型映射，供 ReactFlow 使用
 */
export const nodeTypes = {
  default: CustomNode,
  text: CustomNode,
  ai: CustomNode,
  image: ImageNode,
  video: VideoNode,
  upload: UploadMediaNode,
};
