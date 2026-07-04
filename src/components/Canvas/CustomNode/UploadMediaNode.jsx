import useCanvasStore from "@/store/canvasStore";
import { getAspectRatioSize } from "@/utils/aspectRatioMap";
import { UploadOutlined, PictureOutlined, PlayCircleOutlined } from "@ant-design/icons";
import { Position, useUpdateNodeInternals } from "@xyflow/react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { uploadMedia } from "@/utils/upload";
import PlusHandle from "../CustomPoint/PlusHandle";
import { useNodeMagnet } from "../CustomPoint/useMagnetStore";

const UPLOAD_NODE_WIDTH = 260;
const DEFAULT_ASPECT_RATIO = "227";

const REPLACE_ICON_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' aria-hidden='true' role='img' class='iconify iconify--libtv pointer-events-none' width='14' height='14' viewBox='0 0 19.8008 19.8006'%3E%3Cpath d='M1.80078 16.9003C1.80087 17.1919 1.91684 17.4714 2.12305 17.6776C2.32932 17.8838 2.60874 17.9999 2.90039 17.9999H16.9004C17.192 17.9999 17.4715 17.8838 17.6777 17.6776C17.8839 17.4714 17.9999 17.1919 18 16.9003V11.9999H19.8008V16.9003C19.8007 17.6693 19.4949 18.4073 18.9512 18.951C18.4073 19.4948 17.6694 19.8006 16.9004 19.8006H2.90039C2.13135 19.8006 1.39345 19.4948 0.849609 18.951C0.305837 18.4073 9.33702e-05 17.6693 0 16.9003V11.9999H1.80078V16.9003ZM9.33203 0.202009C9.68553 -0.086443 10.2076 -0.0660213 10.5371 0.263533L16.1729 5.90025L14.9004 7.17271L10.8008 3.07408V13.8006H9V3.07408L4.90039 7.17271L3.62793 5.90025L9.26367 0.263533L9.33203 0.202009Z' fill='currentColor'%3E%3C/path%3E%3C/svg%3E`;

/**
 * 素材上传节点 - 纯素材节点，支持上传图片和视频
 * 仅右侧 Output，无 Input
 * 数据类型: UPLOAD
 */
const UploadMediaNode = memo(({ id, data, selected }) => {
  const { isTarget, tiltX, tiltY, canConnect } = useNodeMagnet(id);
  const magnetColor = canConnect ? "#52c41a" : "#ff4d4f";
  const updateNodeInternals = useUpdateNodeInternals();
  const fileInputRef = useRef(null);

  const draggingNodeId = useCanvasStore((state) => state.draggingNodeId);
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageSize, setImageSize] = useState(null);

  const isThisNodeDragging = draggingNodeId === id;
  const isActive = selected || isThisNodeDragging;

  const nodeData = data ?? {};
  const aspectRatio = nodeData.aspect_ratio ?? DEFAULT_ASPECT_RATIO;
  const isVideo = nodeData.media_type === "video";
  const hasContent = !!nodeData.url;

  const previewStyle = useMemo(() => {
    const size = getAspectRatioSize(aspectRatio);
    const height = Math.round((UPLOAD_NODE_WIDTH * size.height) / size.width);
    return {
      width: UPLOAD_NODE_WIDTH,
      height,
      aspectRatio: `${size.width} / ${size.height}`,
    };
  }, [aspectRatio]);

  useEffect(() => {
    const timer = setTimeout(() => {
      updateNodeInternals(id);
    }, 320);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, previewStyle.width, previewStyle.height]);

  // 获取图片尺寸
  useEffect(() => {
    if (nodeData.url && !isVideo && !imageSize) {
      const img = new Image();
      img.onload = () => {
        setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = nodeData.url;
    }
  }, [nodeData.url, isVideo, imageSize]);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    setImageSize(null);

    try {
      const result = await uploadMedia(file, {}, (percent) => {
        setUploadProgress(percent);
      });

      const isVideoFile = ["video/mp4", "video/mov"].includes(file.type);
      const url = result.url || result.fullurl;
      const thumbnail = isVideoFile ? undefined : url;

      const payload = {
        url,
        fullurl: result.fullurl || url,
        thumbnail,
        name: file.name,
        media_type: isVideoFile ? "video" : "image",
        aspect_ratio: DEFAULT_ASPECT_RATIO,
      };

      // 图片获取尺寸
      if (!isVideoFile) {
        const img = new Image();
        img.onload = () => {
          setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
          updateNodeData(id, {
            ...payload,
            width: img.naturalWidth,
            height: img.naturalHeight,
          });
        };
        img.onerror = () => {
          updateNodeData(id, payload);
        };
        img.src = url;
      } else {
        updateNodeData(id, payload);
      }
    } catch (error) {
      console.error("上传失败:", error);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleReplaceClick = (e) => {
    e.stopPropagation();
    if (!uploading) {
      fileInputRef.current?.click();
    }
  };

  const handleContentClick = (e) => {
    e.stopPropagation();
    if (!uploading && !hasContent) {
      fileInputRef.current?.click();
    }
  };

  const renderContent = () => {
    if (hasContent) {
      if (isVideo) {
        return (
          <>
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: nodeData.thumbnail
                  ? `url(${nodeData.thumbnail}) center/cover no-repeat`
                  : "#1f1f1f",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0,0,0,0.3)",
              }}
            >
              <PlayCircleOutlined style={{ color: "#fff", fontSize: "50px" }} />
            </div>
          </>
        );
      }
      return (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `url(${nodeData.url}) center/cover no-repeat`,
          }}
        />
      );
    }

    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#1f1f1f",
          cursor: uploading ? "wait" : "pointer",
        }}
        onClick={handleContentClick}
      >
        {uploading ? (
          <div style={{ textAlign: "center" }}>
            <UploadOutlined style={{ fontSize: 36, color: "#177ddc" }} />
            <div
              style={{
                marginTop: 8,
                color: "#fff",
                fontSize: 12,
              }}
            >
              上传中 {uploadProgress}%
            </div>
          </div>
        ) : (
          <>
            <UploadOutlined style={{ fontSize: 36, color: "#555" }} />
            <div
              style={{
                marginTop: 8,
                color: "#888",
                fontSize: 12,
              }}
            >
              点击上传
            </div>
          </>
        )}
      </div>
    );
  };

  const formatSize = () => {
    if (imageSize) {
      return `${imageSize.width} × ${imageSize.height}`;
    }
    return null;
  };

  const sizeText = formatSize();

  return (
    <div
      style={{
        position: "relative",
        width: previewStyle.width,
        height: previewStyle.height,
        aspectRatio: previewStyle.aspectRatio,
        borderRadius: 12,
        overflow: "visible",
        border: isTarget
          ? `2px solid ${magnetColor}`
          : isActive
            ? "2px solid #177ddc"
            : "1px solid #303030",
        boxShadow: isTarget
          ? `0 0 0 2px ${magnetColor}66, 0 8px 24px ${magnetColor}44`
          : isActive
            ? "0 0 20px rgba(23, 125, 220, 0.3)"
            : "0 4px 12px rgba(0,0,0,0.3)",
        transition:
          "box-shadow 0.15s ease, border-color 0.15s ease, height 0.28s cubic-bezier(0.22, 1, 0.36, 1)",
        transformStyle: "preserve-3d",
        transform: isTarget
          ? `perspective(700px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`
          : "none",
      }}
    >
      {/* 右上角替换按钮 */}
      {hasContent && (
        <button
          type="button"
          data-quick-guide-anchor="resource-reupload"
          className="nodrag nopan"
          style={{
            position: "absolute",
            right: 8,
            top: 8,
            zIndex: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 8,
            border: "none",
            cursor: uploading ? "wait" : "pointer",
            transition: "background-color 0.2s, opacity 0.2s",
            background: "rgba(0, 0, 0, 0.65)",
            color: "#fff",
            width: 36,
            height: 36,
            opacity: uploading ? 0.5 : 1,
            padding: 0,
          }}
          onClick={handleReplaceClick}
          disabled={uploading}
        >
          <img
            src={REPLACE_ICON_SVG}
            alt="替换"
            style={{ width: 14, height: 14 }}
          />
        </button>
      )}

      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        {renderContent()}

        {/* 底部信息栏 */}
        {(nodeData.name || sizeText) && (
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: "6px 10px",
              borderRadius: "0 0 12px 12px",
              background:
                "linear-gradient(0deg, rgba(0,0,0,0.7) 0%, transparent 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 4, flex: 1, minWidth: 0 }}>
              {isVideo ? (
                <PlayCircleOutlined style={{ color: "#fff", fontSize: 12, flexShrink: 0 }} />
              ) : (
                <PictureOutlined style={{ color: "#fff", fontSize: 12, flexShrink: 0 }} />
              )}
              <span
                style={{
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 500,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {nodeData.name}
              </span>
            </div>
            {sizeText && (
              <span
                style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: 11,
                  flexShrink: 0,
                }}
              >
                {sizeText}
              </span>
            )}
          </div>
        )}
      </div>

      <PlusHandle
        type="source"
        position={Position.Right}
        id="output"
        offsetKey="right"
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/mov"
        style={{ display: "none" }}
        onChange={handleFileSelect}
      />
    </div>
  );
});

UploadMediaNode.displayName = "UploadMediaNode";

export default UploadMediaNode;
