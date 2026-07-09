import { VerticalAlignBottomOutlined } from "@ant-design/icons";
import { NodeToolbar, Position } from "@xyflow/react";
import { memo } from "react";

const toolbarBtnStyle = {
  width: 28,
  height: 28,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  background: "transparent",
  border: "none",
  borderRadius: 6,
  color: "#ffffff",
  cursor: "pointer",
  transition: "background 0.15s ease",
};

const toolbarIconStyle = {
  fontSize: 16,
  color: "#ffffff",
};

/**
 * 媒体节点通用工具栏
 * 纯 UI 组件，业务动作通过 props 回调透传；显隐由 showToolbar 控制。
 * 同时禁止内部事件冒泡（stopNodeEvent），避免误触节点拖拽。
 *
 * @param {object} props
 * @param {string} props.id 节点 ID（NodeToolbar 必须）
 * @param {boolean} props.showToolbar 是否展示工具栏
 * @param {Function} [props.onCrop] 裁剪回调
 * @param {Function} [props.onRotate] 旋转回调
 * @param {Function} [props.onDownload] 下载回调
 * @param {Function} [props.onFullscreen] 全屏预览回调
 */
const MediaNodeToolbar = memo(
  ({ id, showToolbar, onCrop, onRotate, onDownload, onFullscreen }) => {
    const stopNodeEvent = (e) => {
      e.stopPropagation();
      e.preventDefault();
    };

    return (
      <NodeToolbar
        nodeId={id}
        position={Position.Top}
        offset={10}
        // 显隐淡入淡出，与画布暗色风格统一
        style={{
          display: showToolbar ? "flex" : "none",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px",
          background: "#1f1f1f",
          borderRadius: 8,
          boxShadow: "0 6px 18px rgba(0, 0, 0, 0.45)",
          // 不拦截穿透，避免阻断画布空白处点击清空选中
          pointerEvents: showToolbar ? "auto" : "none",
        }}
      >
        {/* 裁剪 */}
        {/* <button
          type="button"
          onClick={onCrop}
          onMouseDown={stopNodeEvent}
          aria-label="裁剪"
          style={toolbarBtnStyle}
        >
          <HighlightOutlined style={toolbarIconStyle} />
        </button> */}
        {/* 旋转 */}
        {/* <button
          type="button"
          onClick={onRotate}
          onMouseDown={stopNodeEvent}
          aria-label="旋转"
          style={toolbarBtnStyle}
        >
          <RedoOutlined style={toolbarIconStyle} />
        </button> */}
        {/* 下载 */}
        <button
          type="button"
          onClick={onDownload}
          onMouseDown={stopNodeEvent}
          aria-label="下载"
          style={toolbarBtnStyle}
        >
          <VerticalAlignBottomOutlined style={toolbarIconStyle} />
        </button>
        {/* 全屏预览 */}
        {/* <button
          type="button"
          onClick={onFullscreen}
          onMouseDown={stopNodeEvent}
          aria-label="全屏预览"
          style={toolbarBtnStyle}
        >
          <FullscreenOutlined style={toolbarIconStyle} />
        </button> */}
      </NodeToolbar>
    );
  },
);

MediaNodeToolbar.displayName = "MediaNodeToolbar";

export default MediaNodeToolbar;
