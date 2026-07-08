const SUPPORTED_CATEGORIES = new Set(["image", "video"]);
const TERMINAL_EVENTS = new Set(["task_completed", "task_failed"]);
const RECONNECT_BASE_DELAY = 3000; // ms

export const wsInitialState = {
  // 双向映射：保存中不持久化（重启后老 task 自然失效即可）
  taskMap: {}, // { taskId: nodeId }  WS 帧反查
  nodeMap: {}, // { nodeId: taskId }  节点删除 / 重新生成时清旧映射
  // WS 状态（仅作 UI 提示 / 调试，不影响功能）
  wsStatus: "idle", // 'idle' | 'connecting' | 'open' | 'closed' | 'reconnecting'
  wsAttempt: 0,
  wsError: null,
};

/**
 * 从 WS 帧顶层抽取 event / category；不通过则忽略。
 */
const parseFrameHeader = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  const { event, category, data } = raw;
  if (!event || !TERMINAL_EVENTS.has(event)) return null;
  if (!category || !SUPPORTED_CATEGORIES.has(category)) return null;
  return { event, category, data };
};

/**
 * 从 WS 帧的 data 字段抽取 taskId / 输出资源 / 错误。
 */
const parseFrameBody = (data) => {
  if (!data || typeof data !== "object") return null;
  const { id, task_id, output_assets, error } = data;
  const taskId = task_id;
  if (!taskId) return null;
  return {
    taskId,
    url: Array.isArray(output_assets)
      ? (output_assets[0]?.url ?? null)
      : null,
    errorMsg: error?.message ?? null,
  };
};

/**
 * 创建 WS Slice 工厂：
 *   - setStore: 与宿主 store 兼容的 setState
 *   - getStore: 与宿主 store 兼容的 getState
 *   - applyResult(nodeId, payload): 由宿主 store 提供，写回节点 data
 */
export const createWsSlice = (setStore, getStore, applyResult) => {
  // 闭包内 WS 控制器 + 私有状态
  let ctrl = null;
  // 引用本 slice 的 action（避免 this 漂移）
  let actionsRef = null;

  /**
   * 图片任务成功：
   */
  const handleImageTaskCompleted = (nodeId, body) => {
    if (!body.url) return;
    applyResult(nodeId, {
      url: body.url,
      status: "completed",
      error: null,
    });
  };

  /**
   * 图片任务失败
   */
  const handleImageTaskFailed = (nodeId, body) => {
    applyResult(nodeId, {
      status: "failed",
      error: body.errorMsg || "图片生成失败，请重试",
    });
  };

  /**
   * 视频任务成功
   *
   */
  const handleVideoTaskCompleted = (nodeId, body) => {
    if (!body.url) return;
    applyResult(nodeId, {
      url: body.url,
      status: "completed",
      error: null,
    });
  };

  /**
   * 视频任务失败
   */
  const handleVideoTaskFailed = (nodeId, body) => {
    applyResult(nodeId, {
      status: "failed",
      error: body.errorMsg || "视频生成失败，请重试",
    });
  };

  // ============ 派发与生命周期 ============

  /**
   * 终态帧路由：按 (event × category) 二维矩阵分配到 4 个 handler 之一。
   * 节点被删除时 nodeId 为 undefined → 仅清理映射。
   */
  const dispatchFrame = (header, body) => {
    const { taskMap } = getStore();
    const nodeId = taskMap[body.taskId];
    if (!nodeId) return; // 节点已删除 / 旧任务被覆盖，丢弃
    const { nodes } = getStore();
    if (!nodes.find((n) => n.id === nodeId)) {
      // 节点已不在 → 仅清映射
      actionsRef?.unregisterTask(null, body.taskId);
      return;
    }

    const { event, category } = header;
    if (category === "image" && event === "task_completed") {
      handleImageTaskCompleted(nodeId, body);
    } else if (category === "image" && event === "task_failed") {
      handleImageTaskFailed(nodeId, body);
    } else if (category === "video" && event === "task_completed") {
      handleVideoTaskCompleted(nodeId, body);
    } else if (category === "video" && event === "task_failed") {
      handleVideoTaskFailed(nodeId, body);
    }
    // 终态到达 → 清理双向映射
    actionsRef?.unregisterTask(nodeId, body.taskId);
  };

  /**
   * WS 入站帧统一处理：parse → 校验 → 派发到 4 个 handler 之一。
   */
  const onWsMessage = (raw) => {
    const header = parseFrameHeader(raw);
    if (!header) return;
    const body = parseFrameBody(header.data);
    if (!body) return;
    dispatchFrame(header, body);
  };

  /**
   * 状态变化：同步到 store
   */
  const onStatusChange = (nextStatus, attempt) => {
    setStore({ wsStatus: nextStatus, wsAttempt: attempt });
  };

  // ============ 暴露在 slice 上的 actions ============

  const slice = {
    ...wsInitialState,

    /**
     * 注册 task → node 映射。同一节点连续点生成时，
     * 新 taskId 会先把旧 taskId 从两个 Map 中剔除，避免老任务终态回追。
     */
    registerTask: (nodeId, taskId) => {
      if (!nodeId || !taskId) return;
      setStore((state) => {
        const taskMap = { ...state.taskMap };
        const nodeMap = { ...state.nodeMap };

        // 清理旧映射：node → 旧 task / task → 旧 node
        const oldTaskId = nodeMap[nodeId];
        if (oldTaskId && oldTaskId !== taskId) delete taskMap[oldTaskId];

        const oldNodeId = taskMap[taskId];
        if (oldNodeId && oldNodeId !== nodeId) delete nodeMap[oldNodeId];

        taskMap[taskId] = nodeId;
        nodeMap[nodeId] = taskId;
        return { taskMap, nodeMap };
      });
    },

    /**
     * 注销映射：支持只传 nodeId（节点被删除）或只传 taskId（终态到达后清理）。
     */
    unregisterTask: (nodeId, taskId) => {
      setStore((state) => {
        const taskMap = { ...state.taskMap };
        const nodeMap = { ...state.nodeMap };
        const removeNodeId = nodeId || nodeMap[taskId];
        const removeTaskId = taskId || nodeMap[nodeId];
        if (removeTaskId) delete taskMap[removeTaskId];
        if (removeNodeId) delete nodeMap[removeNodeId];
        return { taskMap, nodeMap };
      });
    },

    /**
     * 初始化 WebSocket
     */
    initWebSocket: () => {
      if (ctrl) return; // 已存在控制器，幂等
      ctrl = createAutoReconnectWebSocket({
        onMessage: onWsMessage,
        onStatusChange,
        onError: (err) => {
          console.error("[wsSlice] WS 错误:", err);
          setStore({ wsError: "WS 连接异常" });
        },
        onClose: () => {
          setStore({ wsError: null });
        },
        reconnectDelay: RECONNECT_BASE_DELAY,
      });
      ctrl.open();
    },

    /**
     * 主动关闭 WS（页面卸载 / 切画布）。不再重连，Map 内容保留供下次 initWebSocket 复用判断。
     */
    closeWebSocket: () => {
      if (ctrl) {
        ctrl.close(1000, "页面销毁");
        ctrl = null;
      }
      setStore({ wsStatus: "closed", wsAttempt: 0 });
    },

    // 别名：与早期 canvasStore 调用点保持兼容（connectWs / shutdownWs）
    connectWs: () => slice.initWebSocket(),
    shutdownWs: () => slice.closeWebSocket(),

    /**
     * 重置所有映射（不关连接）。用于 resetCanvas 等场景。
     */
    clearAllTasks: () => setStore({ taskMap: {}, nodeMap: {} }),
  };

  actionsRef = slice;
  return slice;
};

export default createWsSlice;

const WS_BASE_URL = import.meta.env.VITE_WS_URL || "wss://ai.hnqzhj.com/ws/";
const buildWsUrl = () => {
  const userId = localStorage.getItem("user_id");
  return userId ? `${WS_BASE_URL}${userId}` : null;
};

/**
 * 创建带自动重连的 WS 控制器。
 */
const createAutoReconnectWebSocket = ({
  onOpen,
  onMessage,
  onClose,
  onError,
  onStatusChange,
  maxReconnectAttempts = Infinity,
  reconnectDelay = 3000,
} = {}) => {
  let ws = null;
  let status = "idle";
  let attempt = 0;
  let reconnectTimer = null;
  let manuallyClosed = false;

  const setStatus = (next) => {
    status = next;
    onStatusChange?.(next, attempt);
  };

  const scheduleReconnect = () => {
    if (manuallyClosed) return;
    if (attempt >= maxReconnectAttempts) return;
    attempt += 1;
    setStatus("reconnecting");
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      open();
    }, reconnectDelay);
  };

  const open = () => {
    const url = buildWsUrl();
    if (!url) {
      console.warn("[ws] user_id 缺失，无法建立 WebSocket 连接");
      setStatus("closed");
      return;
    }

    if (ws) {
      try {
        ws.close(1000, "reopen");
      } catch (err) {
        console.warn("[ws] 关闭旧连接失败:", err);
      }
      ws = null;
    }

    setStatus("connecting");
    try {
      ws = new WebSocket(url);

      ws.onopen = () => {
        attempt = 0;
        setStatus("open");
        onOpen?.();
      };

      ws.onmessage = (event) => {
        try {
          onMessage?.(JSON.parse(event.data));
        } catch {
          onMessage?.(event.data);
        }
      };

      ws.onerror = (event) => {
        onError?.(event);
      };

      ws.onclose = (event) => {
        ws = null;
        onClose?.(event);
        if (!event.wasClean && !manuallyClosed) {
          scheduleReconnect();
        } else {
          setStatus("closed");
        }
      };
    } catch (err) {
      console.error("[ws] 创建连接失败:", err);
      scheduleReconnect();
    }
  };

  const close = (code = 1000, reason = "页面销毁") => {
    manuallyClosed = true;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (ws) {
      try {
        ws.close(code, reason);
      } catch (err) {
        console.warn("[ws] 关闭连接失败:", err);
      }
      ws = null;
    }
    setStatus("closed");
  };

  return {
    open,
    close,
    send: (data) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(typeof data === "string" ? data : JSON.stringify(data));
      }
    },
    getStatus: () => status,
    getAttempt: () => attempt,
  };
};
