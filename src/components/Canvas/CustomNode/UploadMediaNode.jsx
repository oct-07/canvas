import useCanvasStore from "@/store/canvasStore";
import { getAspectRatioSize } from "@/utils/aspectRatioMap";
import { getThumbUrl } from "@/utils/thumbnail";
import { uploadMedia } from "@/utils/upload";
import {
  HighlightOutlined,
  RedoOutlined,
  VerticalAlignBottomOutlined,
} from "@ant-design/icons";
import { NodeToolbar, Position, useUpdateNodeInternals } from "@xyflow/react";
import { Input, message } from "antd";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import PlusHandle from "../CustomPoint/PlusHandle";
import { useNodeMagnet } from "../CustomPoint/useMagnetStore";

// 最大和最小宽度限制
const MAX_NODE_WIDTH = 400; // 最大节点宽度
const MIN_NODE_WIDTH = 200; // 最小节点宽度
const DEFAULT_NODE_WIDTH = 260; // 默认节点宽度
const DEFAULT_ASPECT_RATIO = "227";

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
  // 仅依靠 ReactFlow 传入的 selected 在多选时会被同时置为 true，无法区分单选/多选
  // 订阅 store 中的"焦点节点 id"与画布上 selected 节点总数，
  // 仅在"画布上恰好只有一个 selected 节点且焦点就是当前 id"时才展示工具栏。
  const selectedNodeId = useCanvasStore((state) => state.selectedNodeId);
  const selectedCount = useCanvasStore(
    (state) => (state.nodes ?? []).filter((n) => n.selected).length,
  );
  // 单一选中（当前 id = store 焦点 id，且画布上恰好只有一个 selected 节点）才展示工具栏
  const showToolbar =
    selected === true && selectedNodeId === id && selectedCount === 1;

  const nodeData = data ?? {};

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  // 用 ref 而非 state 作为 useEffect guard，避免 React batching 导致重复触发
  const isUploadingRef = useRef(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(nodeData.name || "");
  const nameInputRef = useRef(null);

  const isThisNodeDragging = draggingNodeId === id;

  // 当 nodeData.name 从外部变化时同步本地编辑状态
  useEffect(() => {
    if (!isEditingName) {
      setNameValue(nodeData.name || "");
    }
  }, [nodeData.name, isEditingName]);

  // 编辑态自动聚焦
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isEditingName]);
  const isActive = selected || isThisNodeDragging;

  const aspectRatio = nodeData.aspect_ratio ?? DEFAULT_ASPECT_RATIO;
  const isVideo = nodeData.media_type === "video";
  const hasContent = !!nodeData.fullurl;

  const processPendingUpload = useMemo(
    () => nodeData.pendingFile,
    [nodeData.pendingFile],
  );

  useEffect(() => {
    if (!processPendingUpload || isUploadingRef.current || hasContent) return;

    console.log("[UploadMediaNode] useEffect 开始上传", Date.now());

    const file = processPendingUpload;
    (async () => {
      try {
        isUploadingRef.current = true; // 同步设置，防止 batching 导致重复触发
        setUploading(true);
        setUploadProgress(0);

        // 立即清除 pendingFile，防止组件 re-render 导致 useEffect 重复触发上传
        updateNodeData(id, { pendingFile: null });

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

        console.log("[UploadMediaNode] useEffect 调用 uploadMedia", Date.now());
        const result = await uploadMedia(file, {}, (percent) => {
          setUploadProgress(percent);
        });

        const fullurl = result.fullurl || "";
        const url = fullurl;

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
        isUploadingRef.current = false;
        setUploading(false);
        setUploadProgress(0);
      }
    })();
  }, [processPendingUpload, id, hasContent, updateNodeData]);

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
    console.log("[UploadMediaNode] handleFileSelect 被调用", Date.now());
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

      const fullurl = result.fullurl || "";
      const url = fullurl;

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

  const handleNameClick = (e) => {
    e.stopPropagation();
    setIsEditingName(true);
  };

  const handleNameChange = (e) => {
    setNameValue(e.target.value);
  };

  const handleNameBlur = () => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== nodeData.name) {
      updateNodeData(id, { name: trimmed });
    } else {
      setNameValue(nodeData.name || "");
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
    if (e.key === "Escape") {
      setNameValue(nodeData.name || "");
      setIsEditingName(false);
    }
  };

  /**
   * 工具栏四个操作的统一前置处理：阻止冒泡防止误触发节点拖拽、阻止触发文件 input，
   * 同时在未实现具体业务逻辑前给出交互反馈。
   */
  const stopNodeEvent = (e) => {
    e.stopPropagation();
    e.preventDefault();
  };

  /**
   * 裁剪素材：尚未接入真实业务逻辑，先给出占位提示；接入点见 TODO。
   */
  const handleCrop = (e) => {
    stopNodeEvent(e);
    // TODO: 接入裁剪面板（可参考 FloatingEditor 的参数工具栏或调用独立的 CropModal）
    message.info("裁剪功能开发中");
  };

  /**
   * 旋转素材：将节点旋转角度累加 90° 并写回 store，作为最轻量的可点击反馈；
   * 若需要基于真实图片/视频做像素级旋转，后续替换为 canvas 处理。
   */
  const handleRotate = (e) => {
    stopNodeEvent(e);
    const nextRotate = ((nodeData.rotate ?? 0) + 90) % 360;
    updateNodeData(id, { rotate: nextRotate });
    message.success(`已旋转至 ${nextRotate}°`);
  };

  /**
   * 下载素材：通过 a 标签触发浏览器原生下载（绕开 CORS/Blob 兼容性问题）；
   * 远程资源需后端支持 download 头，否则会直接打开新标签页。
   */
  const handleDownload = (e) => {
    stopNodeEvent(e);
    if (!nodeData.fullurl) {
      message.warning("暂无素材可下载");
      return;
    }
    const link = document.createElement("a");
    link.href = nodeData.fullurl;
    link.download = nodeData.name || "media";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /**
   * 全屏预览：在新窗口打开远程素材（占位实现，待接入内置预览器）。
   */
  const handleFullscreen = (e) => {
    stopNodeEvent(e);
    if (!nodeData.fullurl) {
      message.warning("暂无素材可预览");
      return;
    }
    window.open(nodeData.fullurl, "_blank", "noopener,noreferrer");
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

      {/* 节点名称标签，浮动在盒子上方，支持点击编辑 */}
      {isEditingName ? (
        <Input
          ref={nameInputRef}
          value={nameValue}
          onChange={handleNameChange}
          onBlur={handleNameBlur}
          onKeyDown={handleNameKeyDown}
          onClick={(e) => e.stopPropagation()}
          size="small"
          style={{
            position: "absolute",
            top: -28,
            left: 0,
            right: 0,
            background: "rgba(38, 38, 38, 0.9)",
            borderColor: "#177ddc",
            color: "#fff",
            fontSize: 12,
            fontWeight: 500,
            textAlign: "center",
          }}
        />
      ) : (
        <div
          onClick={handleNameClick}
          style={{
            position: "absolute",
            top: -28,
            left: 0,
            right: 0,
            padding: "4px 10px",
            borderRadius: "8px 8px 0 0",
            background: "transparent",
            backdropFilter: "blur(4px)",
            color: "#fff",
            fontSize: 12,
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            textAlign: "center",
            cursor: "text",
          }}
          title="点击修改名称"
        >
          {nameValue}
        </div>
      )}

      {/* 右侧输出手柄 */}
      <PlusHandle
        type="source"
        position={Position.Right}
        id="output"
        offsetKey="right"
      />

      <NodeToolbar
        nodeId={id}
        isSelected={showToolbar}
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
        <button
          type="button"
          onClick={handleCrop}
          onMouseDown={stopNodeEvent}
          aria-label="裁剪"
          style={toolbarBtnStyle}
        >
          <HighlightOutlined style={toolbarIconStyle} />
        </button>
        {/* 旋转 */}
        <button
          type="button"
          onClick={handleRotate}
          onMouseDown={stopNodeEvent}
          aria-label="旋转"
          style={toolbarBtnStyle}
        >
          <RedoOutlined style={toolbarIconStyle} />
        </button>
        {/* 下载 */}
        <button
          type="button"
          onClick={handleDownload}
          onMouseDown={stopNodeEvent}
          aria-label="下载"
          style={toolbarBtnStyle}
        >
          <VerticalAlignBottomOutlined style={toolbarIconStyle} />
        </button>
      </NodeToolbar>

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
//工具样式
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

UploadMediaNode.displayName = "UploadMediaNode";

export default UploadMediaNode;
