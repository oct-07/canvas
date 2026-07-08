import { dowloadMedia } from "@/api";
import useCanvasStore from "@/store/canvasStore";
import { message } from "antd";

/**
 * 媒体节点通用工具栏动作：裁剪 / 旋转 / 下载 / 全屏
 * 入参统一为 { id, data, mediaType }，写回通过 updateNodeData；
 * 内部 stopNodeEvent 仅阻止冒泡 + 默认行为，不影响外部事件流。
 *
 * @param {object} options
 * @param {string} options.id 节点 ID
 * @param {object} options.data 当前节点数据
 * @param {"image"|"video"} options.mediaType 媒体类型
 */
export const useMediaToolbarActions = ({ id, data, mediaType }) => {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);

  /**
   * 阻止冒泡防止误触发节点拖拽、阻止默认行为防止触发文件 input 等副作用。
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
    // TODO: 接入裁剪面板（可按 mediaType 路由到图片裁剪 / 视频裁剪）
    message.info("裁剪功能开发中");
  };

  /**
   * 旋转素材：将节点旋转角度累加 90° 并写回 store，作为最轻量的可点击反馈；
   * 若需要基于真实图片/视频做像素级旋转，后续替换为 canvas 处理。
   */
  const handleRotate = (e) => {
    stopNodeEvent(e);
    const nextRotate = ((data.rotate ?? 0) + 90) % 360;
    updateNodeData(id, { rotate: nextRotate });
    message.success(`已旋转至 ${nextRotate}°`);
  };

  /**
   * 下载素材：调用后端 imageDownload 接口，传入 url 与 file_name，
   * 将返回的二进制流通过 Blob 触发浏览器下载。
   */
  const handleDownload = async (e) => {
    stopNodeEvent(e);
    if (!data.fullurl) {
      message.warning("暂无素材可下载");
      return;
    }
    try {
      const res = await dowloadMedia({
        url: data.fullurl,
        file_name: data.name || mediaType || "media",
      });
      const blob = new Blob([res.data], { type: res.data.type });
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = data.name || mediaType || "media";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("下载失败", err);
    }
  };

  /**
   * 全屏预览：在新窗口打开远程素材（占位实现，待接入内置预览器）。
   */
  const handleFullscreen = (e) => {
    stopNodeEvent(e);
    if (!data.fullurl) {
      message.warning("暂无素材可预览");
      return;
    }
    window.open(data.fullurl, "_blank", "noopener,noreferrer");
  };

  return {
    handleCrop,
    handleRotate,
    handleDownload,
    handleFullscreen,
    stopNodeEvent,
  };
};

export default useMediaToolbarActions;
