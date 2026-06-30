/**
 * 自定义节点组件
 */
import React, { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { FileTextOutlined, PictureOutlined, RobotOutlined } from '@ant-design/icons'
import ImageNode from './ImageNode'
import VideoNode from './VideoNode'

const CustomNode = ({ id, data, type, selected }) => {
  const { label = '', description = '', icon } = data

  // 根据节点类型设置默认图标
  const getNodeIcon = () => {
    if (icon) return icon
    switch (type) {
      case 'text':
        return <FileTextOutlined />
      case 'image':
        return <PictureOutlined />
      case 'ai':
        return <RobotOutlined />
      default:
        return <FileTextOutlined />
    }
  }

  // 根据节点类型设置样式
  const getNodeStyle = () => {
    switch (type) {
      case 'ai':
        return {
          background: 'linear-gradient(135deg, #262626 0%, #1a1a2e 100%)',
          borderColor: '#722ed1',
        }
      case 'image':
        return {
          background: '#1a2634',
          borderColor: '#1890ff',
        }
      default:
        return {
          background: '#262626',
          borderColor: '#303030',
        }
    }
  }

  const nodeStyle = {
    padding: '12px 16px',
    background: getNodeStyle().background,
    border: `1px solid ${getNodeStyle().borderColor}`,
    borderRadius: 8,
    minWidth: 150,
    maxWidth: 300,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
    transition: 'all 0.2s ease',
    ...(selected && {
      boxShadow: `0 0 0 2px ${getNodeStyle().borderColor}40`,
    }),
  }

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: description ? 8 : 0,
    fontWeight: 600,
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
  }

  const iconStyle = {
    fontSize: 16,
    color: getNodeStyle().borderColor,
  }

  const contentStyle = {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 13,
    lineHeight: 1.5,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
  }

  return (
    <div className={`canvas-node canvas-node-${type}`} style={nodeStyle}>
      {/* 左侧连接点 */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: '#434343',
          width: 8,
          height: 8,
          border: '2px solid #262626',
        }}
      />

      {/* 节点内容 */}
      <div style={headerStyle}>
        <span style={iconStyle}>{getNodeIcon()}</span>
        <span>{label}</span>
      </div>

      {description && (
        <div style={contentStyle}>
          {description}
        </div>
      )}

      {/* 右侧连接点 */}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: '#434343',
          width: 8,
          height: 8,
          border: '2px solid #262626',
        }}
      />
    </div>
  )
}

export default memo(CustomNode)

// 节点类型映射，供 ReactFlow 使用
export const nodeTypes = {
  default: CustomNode,
  text: CustomNode,
  ai: CustomNode,
  image: ImageNode,
  video: VideoNode,
}
