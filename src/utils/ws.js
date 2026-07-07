/**
 * WebSocket 工具函数
 * 用于建立与管理 WebSocket 连接
 *
 * @param {Function} onMessage - 收到消息的回调，参数为解析后的消息对象
 * @param {Function} [onOpen] - 连接成功回调
 * @param {Function} [onClose] - 连接关闭回调
 * @param {Function} [onError] - 连接错误回调
 * @returns {{ send: Function, close: Function, ws: WebSocket }}
 */
export const createWsConnection = ({
  onMessage,
  onOpen,
  onClose,
  onError,
}) => {
  const wsBaseUrl = import.meta.env.VITE_WS_URL || "wss://ai.hnqzhj.com/ws/";
  const userId = localStorage.getItem("user_id") || "";
  const url = `${wsBaseUrl}${userId}`;

  const ws = new WebSocket(url);

  ws.onopen = () => {
    onOpen?.();
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage?.(data);
    } catch {
      onMessage?.(event.data);
    }
  };

  ws.onclose = (event) => {
    onClose?.(event);
  };

  ws.onerror = (error) => {
    onError?.(error);
  };

  return {
    ws,
    send: (data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(typeof data === "string" ? data : JSON.stringify(data));
      }
    },
    close: () => {
      ws.close();
    },
  };
};
