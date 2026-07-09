import useCanvasStore from "@/store/canvasStore";
import { getAuditCache } from "@/utils/moderation";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { Button, Popover } from "antd";
import { useEffect, useState } from "react";

const MODEL_FRAME_MAP = {
  1: { label: "首尾帧" },
  2: { label: "首帧" },
  3: { label: "尾帧" },
  4: { label: "全能参考" },
};

// 素材预览子组件
const RefImagePreviewBar = ({
  upstreamMedia,
  upstreamMediaList,
  onRemoveMedia,
  provider,
}) => {
  // 只保留悬浮序号切换状态
  const [hoverIdx, setHoverIdx] = useState(null);

  // 优先使用传入的上游媒体列表，否则使用单个上游媒体构建列表
  let refImageList = [];

  if (upstreamMediaList && upstreamMediaList.length > 0) {
    refImageList = upstreamMediaList.map((media, idx) => ({
      url: media.url,
      fullUrl: media.url,
      type: media.type,
      count: idx + 1,
      sourceNodeId: media.sourceNodeId,
      mediaRef: media,
    }));
  } else if (upstreamMedia) {
    refImageList = [
      {
        url: upstreamMedia.url,
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

  // 根据素材类型/URL 判断是否为视频
  const isVideoMedia = (item) => {
    if (!item) return false;
    if (item.type === "video") return true;
    if (!item.url) return false;
    return /\.(mp4|webm|ogg|mov|avi)$/i.test(item.url);
  };

  return (
    <div style={{ marginTop: 12, position: "relative" }}>
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
        className="ref-scroll-wrap"
      >
        {refImageList.map((imgItem, idx) => {
          const isVideo = isVideoMedia(imgItem);
          // Popover气泡内部预览内容
          const previewContent = isVideo ? (
            <video
              src={imgItem.url}
              muted
              autoPlay
              loop
              style={{
                width: 160,
                height: 90,
                objectFit: "cover",
                borderRadius: 4,
                display: "block",
              }}
            />
          ) : (
            <img
              src={imgItem.url}
              alt="预览大图"
              style={{
                width: 160,
                height: 90,
                objectFit: "cover",
                borderRadius: 4,
                display: "block",
              }}
            />
          );

          return (
            <Popover
              key={idx}
              content={previewContent}
              placement="top"
              trigger="hover"
              arrow
              // 浮层挂载body，彻底避免父容器裁切
              getPopupContainer={() => document.body}
              overlayStyle={{
                background: "#27272a",
                padding: 8,
                borderRadius: 8,
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: 72,
                  height: 72,
                  borderRadius: 6,
                  overflow: "hidden",
                  flexShrink: 0,
                  cursor: "pointer",
                  border:
                    hoverIdx === idx
                      ? "2px solid #1890ff"
                      : "2px solid transparent",
                }}
                onMouseEnter={() => setHoverIdx(idx)}
                onMouseLeave={() => setHoverIdx(null)}
              >
                {isVideoMedia(imgItem) ? (
                  // 视频缩略图截取首帧
                  <video
                    src={imgItem.url}
                    preload="metadata"
                    muted
                    playsInline
                    onLoadedMetadata={(e) => {
                      try {
                        e.currentTarget.currentTime = 0.1;
                      } catch (_) {
                        // 部分浏览器禁止seek，捕获异常
                      }
                    }}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: 6,
                      background: "#1f1f1f",
                    }}
                  />
                ) : (
                  <img
                    src={imgItem.url}
                    alt={imgItem.name || "参考素材"}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: 6,
                    }}
                  />
                )}

                {(() => {
                  if (!provider) return null;
                  const record = getAuditCache(imgItem.url, provider);
                  if (!record) return null;
                  const iconStyle = { fontSize: 12, color: "#fff" };
                  return (
                    <div
                      style={{
                        position: "absolute",
                        top: 2,
                        left: 2,
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background:
                          record.status === "approved"
                            ? "#52c41a"
                            : record.status === "rejected"
                              ? "#ff4d4f"
                              : "#1890ff",
                        zIndex: 10,
                      }}
                    >
                      {record.status === "approved" && (
                        <CheckCircleOutlined style={iconStyle} />
                      )}
                      {record.status === "rejected" && (
                        <CloseCircleOutlined style={iconStyle} />
                      )}
                    </div>
                  );
                })()}

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
                  }}
                  onClick={(e) => handleRemove(imgItem, e)}
                >
                  {hoverIdx === idx ? (
                    <CloseOutlined size={12} />
                  ) : (
                    imgItem.count
                  )}
                </div>
              </div>
            </Popover>
          );
        })}
      </div>
      {/* 隐藏横向滚动条（webkit浏览器兼容） */}
      <style>{`
        .ref-scroll-wrap::-webkit-scrollbar {
          display: none;
        }
      `}</style>
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
  activeFrameKey: parentFrameKey,
  onChangeFrame,
  hasVideo = false,
}) => {
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

  // 获取当前选中模型的厂商
  const currentProvider = currentSelectModel?.model_company || null;

  const rawFrameStr = currentSelectModel?.model_frame || "";
  const frameArr = rawFrameStr.split(",").filter((item) => item.trim());

  // 组件挂载时若父组件还没有选中值，则初始化为 "4"（全能参考）并同步给父组件
  useEffect(() => {
    if (parentFrameKey !== undefined) return;
    const raw = currentSelectModel?.model_frame || "";
    const arr = raw.split(",").filter((item) => item.trim());
    let defaultKey = "4";
    if (!arr.includes("4") && arr.length > 0) {
      defaultKey = arr[0];
    }
    if (onChangeFrame) onChangeFrame(defaultKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSelectModel?.id]);

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
          const isActive = parentFrameKey === frameKey;
          const disabled = getBtnDisabled(frameKey);

          return (
            <Button
              key={frameKey}
              disabled={disabled}
              onClick={() => {
                setActiveFrameKey(frameKey);
                if (onChangeFrame) onChangeFrame(frameKey);
              }}
              style={{
                background: isActive ? "#383838" : "#2a2a2a",
                border: isActive ? "1px solid #383838" : "1px solid #404040",
                color: "#fff",
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
        provider={currentProvider}
      />
    </div>
  );
};

export default TopActionBar;
