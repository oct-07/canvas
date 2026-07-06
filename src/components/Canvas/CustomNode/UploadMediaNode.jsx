import useCanvasStore from "@/store/canvasStore";
import { getAspectRatioSize } from "@/utils/aspectRatioMap";
import { getThumbUrl } from "@/utils/thumbnail";
import { uploadMedia } from "@/utils/upload";
import { UploadOutlined } from "@ant-design/icons";
import { Position, useUpdateNodeInternals } from "@xyflow/react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import PlusHandle from "../CustomPoint/PlusHandle";
import { useNodeMagnet } from "../CustomPoint/useMagnetStore";

// 最大和最小宽度限制
const MAX_NODE_WIDTH = 400; // 最大节点宽度
const MIN_NODE_WIDTH = 200; // 最小节点宽度
const DEFAULT_NODE_WIDTH = 260; // 默认节点宽度
const DEFAULT_ASPECT_RATIO = "227";

const REPLACE_ICON_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' aria-hidden='true' role='img' class='iconify iconify--libtv pointer-events-none' width='14' height='14' viewBox='0 0 19.8008 19.8006'%3E%3Cpath d='M1.80078 16.9003C1.80087 17.1919 1.91684 17.4714 2.12305 17.6776C2.32932 17.8838 2.60874 17.9999 2.90039 17.9999H16.9004C17.192 17.9999 17.4715 17.8838 17.6777 17.6776C17.8839 17.4714 17.9999 17.1919 18 16.9003V11.9999H19.8008V16.9003C19.8007 17.6693 19.4949 18.4073 18.9512 18.951C18.4073 19.4948 17.6694 19.8006 16.9004 19.8006H2.90039C2.13135 19.8006 1.39345 19.4948 0.849609 18.951C0.305837 18.4073 9.33702e-05 17.6693 0 16.9003V11.9999H1.80078V16.9003ZM9.33203 0.202009C9.68553 -0.086443 10.2076 -0.0660213 10.5371 0.263533L16.1729 5.90025L14.9004 7.17271L10.8008 3.07408V13.8006H9V3.07408L4.90039 7.17271L3.62793 5.90025L9.26367 0.263533L9.33203 0.202009Z' fill='currentColor'%3E%3C/path%3E%3C/svg%3E`;

/**
 * 计算最佳显示尺寸
 * @param {number} naturalWidth - 原始宽度
 * @param {number} naturalHeight - 原始高度
 * @param {number} maxWidth - 最大允许宽度
 * @param {number} minWidth - 最小允许宽度
 * @returns {object} 计算后的宽高（等比例缩放，不拉伸）
 */
const calculateOptimalSize = (
  naturalWidth,
  naturalHeight,
  maxWidth = MAX_NODE_WIDTH,
  minWidth = MIN_NODE_WIDTH,
) => {
  if (!naturalWidth || !naturalHeight) {
    return { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_WIDTH };
  }

  // 原生宽度在区间内，直接使用原生尺寸
  if (naturalWidth >= minWidth && naturalWidth <= maxWidth) {
    return {
      width: naturalWidth,
      height: naturalHeight,
    };
  }

  // 原生宽度小于最小宽度，按最小宽度等比例放大
  if (naturalWidth < minWidth) {
    const ratio = naturalHeight / naturalWidth;
    return {
      width: minWidth,
      height: Math.round(minWidth * ratio),
    };
  }

  // 原生宽度大于最大宽度，按最大宽度等比例缩小
  const ratio = naturalHeight / naturalWidth;
  return {
    width: maxWidth,
    height: Math.round(maxWidth * ratio),
  };
};

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
  const videoRef = useRef(null);

  const draggingNodeId = useCanvasStore((state) => state.draggingNodeId);
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const isThisNodeDragging = draggingNodeId === id;
  const isActive = selected || isThisNodeDragging;

  const nodeData = data ?? {};
  const aspectRatio = nodeData.aspect_ratio ?? DEFAULT_ASPECT_RATIO;
  const isVideo = nodeData.media_type === "video";
  const hasContent = !!nodeData.fullurl;

  const processPendingUpload = useMemo(() => nodeData.pendingFile, [nodeData.pendingFile]);

  useEffect(() => {
    if (!processPendingUpload || uploading || hasContent) return;

    const file = processPendingUpload;
    (async () => {
      try {
        setUploading(true);
        setUploadProgress(0);

        let originWidth = DEFAULT_NODE_WIDTH;
        let originHeight = DEFAULT_NODE_WIDTH;
        const isVideoFile = ["video/mp4", "video/mov"].includes(file.type);

        if (!isVideoFile) {
          const urlObj = URL.createObjectURL(file);
          const img = new Image();
          await new Promise((resolve) => {
            img.onload = () => {
              originWidth = img.naturalWidth;
              originHeight = img.naturalHeight;
              URL.revokeObjectURL(urlObj);
              resolve();
            };
            img.src = urlObj;
          });
        } else {
          const urlObj = URL.createObjectURL(file);
          const tempVideo = document.createElement("video");
          tempVideo.muted = true;
          tempVideo.src = urlObj;
          await new Promise((resolve) => {
            tempVideo.onloadedmetadata = () => {
              originWidth = tempVideo.videoWidth;
              originHeight = tempVideo.videoHeight;
              URL.revokeObjectURL(urlObj);
              resolve();
            };
          });
        }

        const result = await uploadMedia(file, {}, (percent) => {
          setUploadProgress(percent);
        });

        const url = result.url || result.fullurl;
        const fullurl = result.fullurl || url;

        const payload = {
          url,
          fullurl,
          name: file.name,
          media_type: isVideoFile ? "video" : "image",
          aspect_ratio: DEFAULT_ASPECT_RATIO,
          width: originWidth,
          height: originHeight,
        };

        updateNodeData(id, payload);
      } catch (error) {
        console.error("上传失败:", error);
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    })();
  }, [processPendingUpload, id, uploading, hasContent, updateNodeData]);

  // 动态计算节点尺寸：有原生宽高就用原生比例，无则走默认比例
  const nodeSize = useMemo(() => {
    // 图片 / 视频 只要存在原生宽高，统一用真实素材比例
    if (hasContent && nodeData.width && nodeData.height) {
      return calculateOptimalSize(nodeData.width, nodeData.height);
    }

    // 没有素材尺寸时，才走预设宽高比兜底
    const size = getAspectRatioSize(aspectRatio);
    const height = Math.round((DEFAULT_NODE_WIDTH * size.height) / size.width);
    return {
      width: DEFAULT_NODE_WIDTH,
      height,
    };
  }, [hasContent, nodeData.width, nodeData.height, aspectRatio]);

  useEffect(() => {
    const timer = setTimeout(() => {
      updateNodeInternals(id);
    }, 320);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, nodeSize.width, nodeSize.height]);

  // 已存在远程素材，加载读取真实宽高更新尺寸
  useEffect(() => {
    if (!nodeData.fullurl || nodeData.width || uploading) return;

    if (!isVideo) {
      // 图片读取宽高
      const img = new Image();
      img.onload = () => {
        updateNodeData(id, {
          ...nodeData,
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };
      img.src = nodeData.fullurl;
    } else {
      // 远程视频读取原生分辨率
      const tempVideo = document.createElement("video");
      tempVideo.src = nodeData.fullurl;
      tempVideo.muted = true;
      tempVideo.onloadedmetadata = () => {
        updateNodeData(id, {
          ...nodeData,
          width: tempVideo.videoWidth,
          height: tempVideo.videoHeight,
        });
      };
    }
  }, [nodeData.fullurl, isVideo, nodeData.width, uploading]);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      // 先解析本地文件真实宽高
      let originWidth = DEFAULT_NODE_WIDTH;
      let originHeight = DEFAULT_NODE_WIDTH;
      const isVideoFile = ["video/mp4", "video/mov"].includes(file.type);

      if (!isVideoFile) {
        // 本地图片解析尺寸
        const urlObj = URL.createObjectURL(file);
        const img = new Image();
        await new Promise((resolve) => {
          img.onload = () => {
            originWidth = img.naturalWidth;
            originHeight = img.naturalHeight;
            URL.revokeObjectURL(urlObj);
            resolve();
          };
          img.src = urlObj;
        });
      } else {
        // 本地视频解析原生分辨率
        const urlObj = URL.createObjectURL(file);
        const tempVideo = document.createElement("video");
        tempVideo.muted = true;
        tempVideo.src = urlObj;
        await new Promise((resolve) => {
          tempVideo.onloadedmetadata = () => {
            originWidth = tempVideo.videoWidth;
            originHeight = tempVideo.videoHeight;
            URL.revokeObjectURL(urlObj);
            resolve();
          };
        });
      }

      // 执行上传
      const result = await uploadMedia(file, {}, (percent) => {
        setUploadProgress(percent);
      });

      const url = result.url || result.fullurl;
      const fullurl = result.fullurl || url;

      // 存入真实原生宽高
      const payload = {
        url,
        fullurl,
        name: file.name,
        media_type: isVideoFile ? "video" : "image",
        aspect_ratio: DEFAULT_ASPECT_RATIO,
        width: originWidth,
        height: originHeight,
      };

      updateNodeData(id, payload);
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
          <video
            ref={videoRef}
            src={nodeData.fullurl}
            controls
            controlsList="nodownload"
            muted
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        );
      }
      const thumbSrc = getThumbUrl(nodeData.fullurl);
      return (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `url(${thumbSrc}) center/contain no-repeat`,
            backgroundColor: "#1f1f1f",
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

  return (
    <div
      style={{
        position: "relative",
        width: nodeSize.width,
        height: nodeSize.height,
        minWidth: MIN_NODE_WIDTH,
        maxWidth: MAX_NODE_WIDTH,
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
          "box-shadow 0.15s ease, border-color 0.15s ease, width 0.28s cubic-bezier(0.22, 1, 0.36, 1), height 0.28s cubic-bezier(0.22, 1, 0.36, 1)",
        transformStyle: "preserve-3d",
        transform: isTarget
          ? `perspective(700px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`
          : "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 12,
          overflow: "hidden",
          clipPath: "inset(0 round 12px)",
        }}
      >
        {renderContent()}
      </div>

      {/* 右侧输出手柄 */}
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
