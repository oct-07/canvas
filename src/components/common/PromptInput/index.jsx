/**
 * 提示输入框组件
 * 用于 AI 画布的提示词输入
 */
import React, { useState, useRef, useEffect } from 'react'
import { Input, Button, Tooltip } from 'antd'
import {
  SendOutlined,
  LoadingOutlined,
  AudioOutlined,
  PictureOutlined,
  StopOutlined,
} from '@ant-design/icons'

const { TextArea } = Input

/**
 * 提示词输入框组件 - AI 交互的输入控件
 * 支持多行输入、发送、停止、图片上传等功能
 */
const PromptInput = ({
  value = '',
  onChange,
  onSubmit,
  onStop,
  placeholder = '输入提示词，让 AI 帮你创作...',
  disabled = false,
  loading = false,
  autoFocus = false,
  showImageUpload = true,
  showVoiceInput = false,
  maxLength = 2000,
  style = {},
  className = '',
}) => {
  const [isFocused, setIsFocused] = useState(false)
  const textareaRef = useRef(null)

/**
 * 自动聚焦到输入框
 */
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [autoFocus])

/**
 * 处理回车键提交（Shift+Enter 换行）
 */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!loading && value.trim()) {
        handleSubmit()
      }
    }
  }

/**
 * 提交输入的提示词
 */
  const handleSubmit = () => {
    if (!loading && value.trim()) {
      onSubmit?.(value.trim())
    }
  }

/**
 * 处理输入值变化，检查长度限制
 */
  const handleChange = (e) => {
    const newValue = e.target.value
    if (newValue.length <= maxLength) {
      onChange?.(newValue)
    }
  }

  const containerStyle = {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 12,
    padding: '12px 16px',
    background: '#1f1f1f',
    borderRadius: 12,
    border: `1px solid ${isFocused ? '#177ddc' : '#303030'}`,
    boxShadow: isFocused ? '0 0 0 2px rgba(23, 125, 220, 0.1)' : '0 4px 16px rgba(0, 0, 0, 0.3)',
    transition: 'all 0.2s ease',
    ...style,
  }

  const textareaStyle = {
    flex: 1,
    background: 'transparent !important',
    border: 'none !important',
    boxShadow: 'none !important',
    padding: '4px 0',
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.85)',
    resize: 'none',
    minHeight: 24,
    maxHeight: 120,
    lineHeight: 1.5,
  }

  const buttonStyle = {
    width: 36,
    height: 36,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  }

  return (
    <div
      className={`prompt-input-container ${className}`}
      style={containerStyle}
    >
      <TextArea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        disabled={disabled}
        style={textareaStyle}
        autoSize={{ minRows: 1, maxRows: 5 }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {showImageUpload && (
          <Tooltip title="上传图片">
            <Button
              type="text"
              icon={<PictureOutlined />}
              style={{
                ...buttonStyle,
                color: 'rgba(255, 255, 255, 0.65)',
              }}
              disabled={disabled || loading}
            />
          </Tooltip>
        )}

        {showVoiceInput && (
          <Tooltip title="语音输入">
            <Button
              type="text"
              icon={<AudioOutlined />}
              style={{
                ...buttonStyle,
                color: 'rgba(255, 255, 255, 0.65)',
              }}
              disabled={disabled || loading}
            />
          </Tooltip>
        )}

        {loading ? (
          <Tooltip title="停止生成">
            <Button
              type="primary"
              danger
              icon={<StopOutlined />}
              style={buttonStyle}
              onClick={onStop}
            />
          </Tooltip>
        ) : (
          <Tooltip title="发送 (Enter)">
            <Button
              type="primary"
              icon={loading ? <LoadingOutlined /> : <SendOutlined />}
              style={buttonStyle}
              onClick={handleSubmit}
              disabled={disabled || !value.trim()}
            />
          </Tooltip>
        )}
      </div>

      {maxLength - value.length < 100 && (
        <span
          style={{
            fontSize: 12,
            color: value.length > maxLength * 0.9 ? '#ff4d4f' : 'rgba(255, 255, 255, 0.35)',
            position: 'absolute',
            bottom: 4,
            right: 70,
          }}
        >
          {value.length}/{maxLength}
        </span>
      )}
    </div>
  )
}

export default PromptInput
