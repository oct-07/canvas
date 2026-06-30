/**
 * 上传预览组件
 * 用于显示上传的图片预览，支持删除和预览功能
 */
import React, { useState } from 'react'
import { Modal } from 'antd'
import { DeleteOutlined, EyeOutlined, LoadingOutlined } from '@ant-design/icons'

const UploadPreview = ({
  file,
  url,
  width = 100,
  height = 100,
  shape = 'square', // square | circle
  onRemove,
  onPreview,
  loading = false,
  style = {},
}) => {
  const [previewVisible, setPreviewVisible] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)

  const handleRemove = (e) => {
    e?.stopPropagation()
    onRemove?.()
  }

  const handlePreview = (e) => {
    e?.stopPropagation()
    if (onPreview) {
      onPreview()
    } else {
      setPreviewVisible(true)
    }
  }

  const containerStyle = {
    position: 'relative',
    width,
    height,
    display: 'inline-block',
    ...style,
  }

  const imageStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: shape === 'circle' ? '50%' : 8,
    border: '2px solid #303030',
    transition: 'border-color 0.2s ease',
  }

  const removeButtonStyle = {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 20,
    height: 20,
    borderRadius: '50%',
    background: '#ff4d4f',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0,
    transition: 'opacity 0.2s ease',
    zIndex: 10,
  }

  const previewButtonStyle = {
    position: 'absolute',
    top: shape === 'circle' ? '50%' : -8,
    left: shape === 'circle' ? '50%' : -8,
    transform: shape === 'circle' ? 'translate(-50%, -50%)' : 'none',
    width: 20,
    height: 20,
    borderRadius: '50%',
    background: 'rgba(0, 0, 0, 0.6)',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0,
    transition: 'opacity 0.2s ease',
    zIndex: 10,
  }

  return (
    <>
      <div
        className="upload-preview-container"
        style={containerStyle}
        onMouseEnter={(e) => {
          const removeBtn = e.currentTarget.querySelector('.remove-btn')
          const previewBtn = e.currentTarget.querySelector('.preview-btn')
          if (removeBtn) removeBtn.style.opacity = '1'
          if (previewBtn) previewBtn.style.opacity = '1'
        }}
        onMouseLeave={(e) => {
          const removeBtn = e.currentTarget.querySelector('.remove-btn')
          const previewBtn = e.currentTarget.querySelector('.preview-btn')
          if (removeBtn) removeBtn.style.opacity = '0'
          if (previewBtn) previewBtn.style.opacity = '0'
        }}
      >
        {loading || imageLoading ? (
          <div
            style={{
              ...imageStyle,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#262626',
            }}
          >
            <LoadingOutlined style={{ fontSize: 24, color: '#177ddc' }} />
          </div>
        ) : (
          <img
            src={url || (file && URL.createObjectURL(file))}
            alt="preview"
            style={imageStyle}
            onLoad={() => setImageLoading(false)}
          />
        )}

        {onRemove && (
          <button
            className="remove-btn"
            style={removeButtonStyle}
            onClick={handleRemove}
            type="button"
          >
            <DeleteOutlined style={{ fontSize: 12 }} />
          </button>
        )}

        {onPreview !== null && (
          <button
            className="preview-btn"
            style={{
              ...previewButtonStyle,
              left: onRemove ? 'calc(50% - 14px)' : (shape === 'circle' ? '50%' : -8),
              top: shape === 'circle' ? '50%' : (onRemove ? '-8px' : '-8px'),
              transform: shape === 'circle' ? 'translate(-50%, -50%)' : 'none',
            }}
            onClick={handlePreview}
            type="button"
          >
            <EyeOutlined style={{ fontSize: 12 }} />
          </button>
        )}
      </div>

      <Modal
        open={previewVisible}
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width="80%"
        centered
        style={{ maxWidth: 900 }}
      >
        <img
          alt="preview"
          style={{ width: '100%', height: 'auto' }}
          src={url || (file && URL.createObjectURL(file))}
        />
      </Modal>
    </>
  )
}

export default UploadPreview
