import useCanvasStore from "@/store/canvasStore";
import { Button } from "antd";
import { useState } from "react";

const MODEL_FRAME_MAP = {
  1: { label: "首尾帧" },
  2: { label: "首帧" },
  3: { label: "尾帧" },
  4: { label: "全能参考" },
};

// 素材预览子组件
// upstreamMedia 格式: { type: 'video'|'image'|'upload', url, thumbnail, name, sourceNodeId }
// upstreamMediaList 格式: [{ type, url, thumbnail, name, sourceNodeId }]
const RefImagePreviewBar = ({
  upstreamMedia,
  upstreamMediaList,
  onRemoveMedia,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [previewPos, setPreviewPos] = useState({ x: 0, y: 0, width: 176, height: 106 });

  // 优先使用传入的上游媒体列表，否则使用单个上游媒体构建列表
  let refImageList = [];

  if (upstreamMediaList && upstreamMediaList.length > 0) {
    refImageList = upstreamMediaList.map((media, idx) => ({
      url: media.thumbnail || media.url,
      fullUrl: media.url,
      type: media.type,
      count: idx + 1,
      sourceNodeId: media.sourceNodeId,
      mediaRef: media,
    }));
  } else if (upstreamMedia) {
    refImageList = [
      {
        url: upstreamMedia.thumbnail || upstreamMedia.url,
        fullUrl: upstreamMedia.url,
        type: upstreamMedia.type,
        count: 1,
        sourceNodeId: upstreamMedia.sourceNodeId,
        mediaRef: upstreamMedia,
      },
    ];
  }

  if (!refImageList.length) return null;

  const handleRemove = (imgItem, e) => {
    e.stopPropagation();
    if (onRemoveMedia) {
      onRemoveMedia(imgItem.mediaRef);
    }
  };

  // 鼠标进入时计算预览框位置
  const handleMouseEnter = (imgItem, idx, e) => {
    setHoveredIndex(idx);
    setHoveredItem(imgItem);

    // 计算预览框位置（显示在素材上方）
    const rect = e.currentTarget.getBoundingClientRect();
    let x = rect.left + rect.width / 2 - PREVIEW_WIDTH / 2;
    let y = rect.top - PREVIEW_HEIGHT - 8;

    // 边界检测：左侧
    if (x < 10) x = 10;
    // 边界检测：右侧
    if (x + PREVIEW_WIDTH > window.innerWidth - 10) {
      x = window.innerWidth - PREVIEW_WIDTH - 10;
    }
    // 边界检测：顶部（如果上方空间不够，显示在下方）
    if (y < 10) {
      y = rect.bottom + 8;
    }

    setPreviewPos({ x, y });
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
    setHoveredItem(null);
  };

  // 根据 URL 后缀判断是否为视频
  const isVideoUrl = (url) => {
    if (!url) return false;
    return /\.(mp4|webm|ogg|mov|avi)$/i.test(url);
  };

  const isVideo = isVideoUrl(hoveredItem?.url);

  // 预览框宽高常量
  const PREVIEW_WIDTH = 176;
  const PREVIEW_HEIGHT = 106;

  // 预览框样式 - 使用 fixed 定位避免被父容器裁剪
  const previewStyle = {
    position: "fixed",
    left: previewPos.x,
    top: previewPos.y,
    width: PREVIEW_WIDTH,
    height: PREVIEW_HEIGHT,
    background: "#27272a",
    border: "1px solid #444",
    borderRadius: 8,
    padding: 8,
    zIndex: 99999,
    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
    pointerEvents: "none",
  };

  return (
    <div style={{ marginTop: 12, position: "relative" }}>
      {/* 独立预览层 - 避免被父容器 overflow 裁剪 */}
      {hoveredItem && (
        <>
          {/* 预览小三角 - 指向下方素材 */}
          <div
            style={{
              position: "fixed",
              left: previewPos.x + PREVIEW_WIDTH / 2 - 6,
              top: previewPos.y + PREVIEW_HEIGHT - 1,
              width: 0,
              height: 0,
              borderLeft: "6px solid transparent",
              borderRight: "6px solid transparent",
              borderTop: "6px solid #27272a",
              zIndex: 100000,
              pointerEvents: "none",
            }}
          />
          <div style={previewStyle}>
            {isVideo ? (
              <video
                src={hoveredItem.url}
                style={{ width: 160, height: 90, objectFit: "cover", borderRadius: 4 }}
                autoPlay
                muted
                loop
              />
            ) : (
              <img
                src={hoveredItem.url}
                alt=""
                style={{ width: 160, height: 90, objectFit: "cover", borderRadius: 4 }}
              />
            )}
          </div>
        </>
      )}
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: 6,
          borderRadius: 8,
          width: "fit-content",
          overflowX: "auto",
          overflowY: "visible",
          scrollbarWidth: "none",
        }}
      >
        {refImageList.map((imgItem, idx) => (
          <div
            key={idx}
            onMouseEnter={(e) => handleMouseEnter(imgItem, idx, e)}
            onMouseLeave={handleMouseLeave}
            style={{
              position: "relative",
              width: 72,
              height: 72,
              borderRadius: 6,
              overflow: "visible",
              flexShrink: 0,
              cursor: "pointer",
              border: hoveredIndex === idx ? "2px solid #1890ff" : "2px solid transparent",
            }}
          >
            <img
              src={imgItem.url}
              alt={imgItem.name || "参考素材"}
              style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 6 }}
            />
            <div
              style={{
                position: "absolute",
                top: 2,
                right: 2,
                background: "rgba(0,0,0,0.75)",
                color: "#fff",
                fontSize: 12,
                width: 20,
                height: 20,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "background 0.2s",
              }}
              onClick={(e) => handleRemove(imgItem, e)}
            >
              {hoveredIndex === idx ? "×" : imgItem.count}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const TopActionBar = ({
  styleValue,
  onChangeStyle,
  onOpenMark,
  onUploadRefImage,
  upstreamMedia,
  upstreamMediaList,
  onRemoveMedia,
  hasVideo = false,
}) => {
  const [activeFrameKey, setActiveFrameKey] = useState("");

  // 计算素材数量
  const imgTotal = upstreamMediaList?.length || (upstreamMedia ? 1 : 0);

  const modelListMap = useCanvasStore((state) => state.modelListMap);
  const activeNodeId = useCanvasStore((state) => state.activeNodeId);
  const nodeEditors = useCanvasStore((state) => state.nodeEditors);

  const paramValues = nodeEditors[activeNodeId]?.data || {};
  const nodeModelType = paramValues.model_type;
  const modelList = nodeModelType ? modelListMap[nodeModelType] || [] : [];

  let currentSelectModel =
    modelList.find((m) => m.id === paramValues.model_id) || null;
  if (!currentSelectModel && modelList.length > 0) {
    currentSelectModel = modelList[0];
  }

  const rawFrameStr = currentSelectModel?.model_frame || "";
  const frameArr = rawFrameStr.split(",").filter((item) => item.trim());

  // 判断当前按钮是否禁用
  const getBtnDisabled = (frameKey) => {
    // 有视频：只允许4全能参考，其余全部禁用
    if (hasVideo) {
      return frameKey !== "4";
    }
    // 图片总数 = 1：全部可用
    if (imgTotal === 1) return false;
    // 图片总数 = 2：禁用2、3，只允许1、4
    if (imgTotal === 2) {
      return frameKey === "2" || frameKey === "3";
    }
    // 图片 > 2：只允许4，其余禁用
    if (imgTotal > 2) {
      return frameKey !== "4";
    }
    return false;
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        {frameArr.map((frameKey) => {
          const frameConfig = MODEL_FRAME_MAP[frameKey];
          if (!frameConfig) return null;
          const isActive = activeFrameKey === frameKey;
          const disabled = getBtnDisabled(frameKey);

          return (
            <Button
              key={frameKey}
              disabled={disabled}
              onClick={() => setActiveFrameKey(frameKey)}
              style={{
                background: isActive ? "#383838" : "#2a2a2a",
                border: isActive ? "1px solid #383838" : "1px solid #404040",
                color: isActive ? "#fff" : "#fff",
                borderRadius: 6,
              }}
            >
              {frameConfig.label}
            </Button>
          );
        })}
      </div>
      <RefImagePreviewBar
        upstreamMedia={upstreamMedia}
        upstreamMediaList={upstreamMediaList}
        onRemoveMedia={onRemoveMedia}
      />
    </div>
  );
};

export default TopActionBar;
