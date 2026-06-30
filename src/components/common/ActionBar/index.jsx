/**
 * 动作栏组件
 * 用于画布工具栏的常用操作
 */
import React from 'react'
import { Tooltip, Divider } from 'antd'
import {
  UndoOutlined,
  RedoOutlined,
  SaveOutlined,
  CopyOutlined,
  DeleteOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  FullscreenOutlined,
  ExpandOutlined,
} from '@ant-design/icons'

const ActionBar = ({
  items = [],
  direction = 'horizontal', // horizontal | vertical
  size = 36,
  color = 'rgba(255, 255, 255, 0.65)',
  activeColor = '#177ddc',
  activeBg = 'rgba(23, 125, 220, 0.15)',
  onItemClick,
  style = {},
  className = '',
}) => {
  const containerStyle = {
    display: 'flex',
    flexDirection: direction === 'vertical' ? 'column' : 'row',
    alignItems: 'center',
    gap: direction === 'vertical' ? 0 : 8,
    padding: direction === 'vertical' ? '8px 4px' : '4px 8px',
    background: '#1f1f1f',
    borderRadius: 8,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
    ...style,
  }

  const buttonStyle = {
    width: size,
    height: size,
    borderRadius: 6,
    border: 'none',
    background: 'transparent',
    color,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    fontSize: size * 0.45,
  }

  const dividerStyle = {
    margin: direction === 'vertical' ? '4px 0' : '0 4px',
    height: direction === 'vertical' ? '16px' : 'auto',
    width: direction === 'vertical' ? '16px' : 'auto',
    background: '#303030',
  }

  // 默认快捷操作
  const defaultItems = [
    { key: 'undo', icon: <UndoOutlined />, label: '撤销', dividerAfter: false },
    { key: 'redo', icon: <RedoOutlined />, label: '重做', dividerAfter: false },
    { key: 'divider', type: 'divider', dividerAfter: false },
    { key: 'save', icon: <SaveOutlined />, label: '保存', dividerAfter: false },
    { key: 'copy', icon: <CopyOutlined />, label: '复制', dividerAfter: false },
    { key: 'delete', icon: <DeleteOutlined />, label: '删除', danger: true, dividerAfter: false },
    { key: 'divider2', type: 'divider', dividerAfter: false },
    { key: 'zoomIn', icon: <ZoomInOutlined />, label: '放大', dividerAfter: false },
    { key: 'zoomOut', icon: <ZoomOutOutlined />, label: '缩小', dividerAfter: false },
    { key: 'fit', icon: <FullscreenOutlined />, label: '适应画布', dividerAfter: false },
  ]

  const renderItems = items.length > 0 ? items : defaultItems

  return (
    <div
      className={`action-bar ${className}`}
      style={containerStyle}
      onMouseLeave={(e) => {
        // 重置所有按钮的 hover 状态
        const buttons = e.currentTarget.querySelectorAll('button')
        buttons.forEach((btn) => {
          btn.style.background = 'transparent'
          btn.style.color = color
        })
      }}
    >
      {renderItems.map((item, index) => {
        if (item.type === 'divider') {
          return <Divider key={item.key || index} style={dividerStyle} type={direction} />
        }

        const isActive = item.active
        const buttonBg = isActive ? activeBg : 'transparent'
        const buttonColor = isActive ? activeColor : (item.danger ? '#ff4d4f' : color)

        return (
          <Tooltip key={item.key} title={item.label} placement={direction === 'vertical' ? 'right' : 'bottom'}>
            <button
              style={{
                ...buttonStyle,
                background: buttonBg,
                color: buttonColor,
              }}
              onClick={() => onItemClick?.(item.key, item)}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = item.danger ? '#ff4d4f' : color
                }
              }}
            >
              {item.icon}
            </button>
          </Tooltip>
        )
      })}
    </div>
  )
}

export default ActionBar
