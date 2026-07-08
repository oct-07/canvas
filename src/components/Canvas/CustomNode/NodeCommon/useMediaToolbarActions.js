import useCanvasStore from "@/store/canvasStore";
import { message } from "antd";
import { useState } from "react";

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
  // 下载loading 用于按钮转圈
  const [downloadLoading, setDownloadLoading] = useState(false);

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
    // 正在下载中直接拦截重复点击
    if (downloadLoading) return;

    if (!data.url) {
      message.warning("暂无素材可下载");
      return;
    }

    const urlParts = data.url.split("/").pop().split(".");
    const ext = urlParts[urlParts.length - 1];

    const fullFileName = data.name
      ? `${data.name}.${ext}`
      : data.url.split("/").pop();

    const api = `${import.meta.env.VITE_API_BASE_URL}/index/index/imageDownload?url=${encodeURIComponent(data.url)}&filename=${encodeURIComponent(fullFileName)}`;

    // 开启loading + 弹出下载中提示
    setDownloadLoading(true);
    const downloadMsg = message.loading("文件正在下载中...", 0);

    try {
      const resp = await fetch(api, {
        headers: {
          token: "b4e735d8-9540-412c-b4fd-46704f31d108",
          TeamId: 3,
        },
      });
      const blob = await resp.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = fullFileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);

      downloadMsg();
      message.success("文件下载完成");
    } catch (err) {
      console.error(err);
      downloadMsg();
      message.error("下载失败，请稍后重试");
    } finally {
      // 无论成功失败都关闭按钮loading
      setDownloadLoading(false);
    }
  };

  /**
   * 全屏预览：在新窗口打开远程素材（占位实现，待接入内置预览器）。
   */
  const handleFullscreen = (e) => {
    stopNodeEvent(e);
    if (!data.url) {
      message.warning("暂无素材可预览");
      return;
    }
    window.open(data.url, "_blank", "noopener,noreferrer");
  };

  return {
    handleCrop,
    handleRotate,
    handleDownload,
    handleFullscreen,
    stopNodeEvent,
    downloadLoading, // 抛出loading给组件控制图标旋转
  };
};

export default useMediaToolbarActions;
