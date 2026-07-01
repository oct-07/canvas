/**
 * 自定义节点组件
 */
import {
  FileTextOutlined,
  PictureOutlined,
  RobotOutlined,
} from "@ant-design/icons";
import { Handle, Position } from "@xyflow/react";
import { memo } from "react";
import ImageNode from "./ImageNode";
import VideoNode from "./VideoNode";

/**
 * 自定义节点组件 - 通用的文本/AI 节点
 * 左侧为 Input，右侧为 Output
 */
const CustomNode = ({ id, data, type, selected }) => {
  const { label = "", description = "", icon } = data;

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

  const nodeStyle = {
    padding: "12px 16px",
    background: getNodeStyle().background,
    border: `1px solid ${getNodeStyle().borderColor}`,
    borderRadius: 8,
    minWidth: 150,
    maxWidth: 300,
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
    transition: "all 0.2s ease",
    ...(selected && {
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
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        style={{
          background: getNodeStyle().borderColor,
          width: 10,
          height: 10,
          border: "2px solid #262626",
          left: -5,
        }}
      />

      {/* 节点内容 */}
      <div style={headerStyle}>
        <span style={iconStyle}>{getNodeIcon()}</span>
        <span>{label}</span>
      </div>

      {description && <div style={contentStyle}>{description}</div>}

      {/* 右侧 Output 端口 */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{
          background: getNodeStyle().borderColor,
          width: 10,
          height: 10,
          border: "2px solid #262626",
          right: -5,
        }}
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
};
