/**
 * 画布 Slice
 * 管理画布基础信息和视口
 */
import { saveCanvas } from "@/api";
import { message } from "antd";
import { canvasStorage } from "@/utils/canvasStorage";
import useStyleStore from "@/store/styleStore";

/**
 * 防抖管理器 - 支持取消和重新触发
 */
class DebounceManager {
  constructor() {
    this.timer = null;
    this.pendingData = null;
  }

  /**
   * 触发防抖保存
   * @param {Function} fn - 要执行的函数
   * @param {number} delay - 延迟时间（毫秒）
   * @param {Object} data - 传递给函数的数据
   */
  trigger(fn, delay, data) {
    this.pendingData = data;
    this.cancel();

    this.timer = setTimeout(() => {
      this.timer = null;
      this.pendingData = null;
      if (this.pendingData === null) {
        fn(data);
      }
    }, delay);
  }

  /**
   * 取消待执行的定时器
   */
  cancel() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /**
   * 立即执行待处理的任务
   * @param {Function} fn - 要执行的函数
   */
  flush(fn) {
    if (this.timer && this.pendingData) {
      this.cancel();
      fn(this.pendingData);
      this.pendingData = null;
    }
  }

  /**
   * 检查是否有待执行的任务
   */
  isPending() {
    return this.timer !== null;
  }
}

// 防抖管理器实例
const remoteSaveManager = new DebounceManager();

/**
 * 执行远程保存
 */
const doRemoteSave = async (data) => {
  try {
    await saveCanvas({
      canvas_id: data.canvasId,
      canvas_data: JSON.stringify({
        nodes: data.nodes,
        edges: data.edges,
        canvasName: data.canvasName,
        globalStyle: data.globalStyle,
      }),
    });
    console.log("[Canvas] 远程保存成功");
  } catch (err) {
    console.error("[Canvas] 远程保存失败:", err);
  }
};
/**
 * 画布 Slice 初始状态
 */
export const canvasInitialState = {
  canvasId: null,
  canvasName: "未命名画布",
  // 新增全局风格字段
  globalStyle: "",
  viewport: { x: 0, y: 0, zoom: 1 },
  // 保存状态，用于状态栏展示
  saveLoading: false,
  saveTip: "",
};

/**
 * 创建画布 Slice
 * @param {object} getStore - 获取 store 的函数
 * @param {object} setStore - 设置 store 的函数
 * @returns {object} 画布相关的 state 和 actions
 */
export const createCanvasSlice = (getStore, setStore) => ({
  // 基础数据
  canvasId: canvasInitialState.canvasId,
  canvasName: canvasInitialState.canvasName,
  globalStyle: canvasInitialState.globalStyle,
  viewport: canvasInitialState.viewport,

  // 保存状态
  saveLoading: canvasInitialState.saveLoading,
  saveTip: canvasInitialState.saveTip,

  /**
   * 设置画布ID
   */
  setCanvasId: (id) => setStore({ canvasId: id }),

  /**
   * 本地更新画布名称
   */
  setCanvasName: (name) => setStore({ canvasName: name }),

  /**
   * 本地更新全局风格
   */
  setGlobalStyle: (styleVal) => setStore({ globalStyle: styleVal }),

  /**
   * 批量更新画布基础元信息（ID/名称/风格，仅本地状态）
   * 切换画布时调用，会取消之前的远程保存任务
   * @param {Object} meta - { canvasId, canvasName, globalStyle }
   */
  setCanvasMeta: (meta) => {
    // 如果 canvasId 发生变化，先取消之前的远程保存
    const currentCanvasId = getStore().canvasId;
    if (currentCanvasId && currentCanvasId !== meta.canvasId) {
      remoteSaveManager.cancel();
    }

    setStore({
      canvasId: meta.canvasId,
      canvasName: meta.canvasName,
      globalStyle: meta.globalStyle,
    });
    // 同步更新 styleStore，保持全局风格数据一致
    useStyleStore.getState().setGlobalStyle(meta.globalStyle);
  },

  /**
   * 立即保存画布数据到本地（用于显式保存操作）
   */
  saveToLocal: () => {
    const state = getStore();
    const { canvasId } = state;
    if (!canvasId) return;

    canvasStorage.save({
      canvasId,
      canvasName: state.canvasName,
      globalStyle: state.globalStyle,
      nodes: state.nodes,
      edges: state.edges,
      viewport: state.viewport,
    });
  },

  /**
   * 从本地加载画布数据
   * @returns {Object|null} 加载的数据或 null
   */
  loadFromLocal: () => {
    const state = getStore();
    const { canvasId } = state;
    if (!canvasId) return null;

    const data = canvasStorage.load(canvasId);
    if (data) {
      // 恢复数据到 store
      setStore({
        nodes: data.nodes || [],
        edges: data.edges || [],
        viewport: data.viewport || { x: 0, y: 0, zoom: 1 },
        canvasName: data.canvasName || "未命名画布",
        globalStyle: data.globalStyle || "",
      });
      // 同步更新 styleStore
      if (data.globalStyle) {
        useStyleStore.getState().setGlobalStyle(data.globalStyle);
      }
    }
    return data;
  },

  /**
   * 检查本地是否存在画布数据
   * @returns {boolean}
   */
  hasLocalData: () => {
    const state = getStore();
    return state.canvasId ? canvasStorage.exists(state.canvasId) : false;
  },

  /**
   * 清除本地画布数据
   */
  clearLocalData: () => {
    const state = getStore();
    if (state.canvasId) {
      canvasStorage.remove(state.canvasId);
    }
  },

  /**
   * 获取本地所有画布列表
   * @returns {Array}
   */
  getLocalCanvasList: () => {
    return canvasStorage.listAll();
  },

  /**
   * 视口操作
   */
  setViewport: (viewport) => setStore({ viewport }),

  // ===================== 持久化保存接口 Action =====================
  /**
   * 保存画布名称
   * @param {string} newName - 新画布名称
   */
  saveCanvasName: async (newName) => {
    const state = getStore();
    const { canvasId } = state;

    if (!canvasId) return;

    setStore({ saveLoading: true, saveTip: "保存中..." });
    try {
      await saveCanvas({
        canvas_id: canvasId,
        canvas_name: newName,
      });
      // 接口成功后更新本地状态
      setStore({
        canvasName: newName,
        saveLoading: false,
        saveTip: "已自动保存",
      });
      message.success("画布名称保存成功");
    } catch (err) {
      setStore({ saveLoading: false, saveTip: "保存失败，请重试" });
    }
  },

  /**
   * 保存画布风格
   * @param {string} styleId - 选中风格ID
   */
  saveCanvasStyle: async (styleId) => {
    const state = getStore();
    const { canvasId } = state;

    if (!canvasId) return;

    setStore({ saveLoading: true, saveTip: "保存中..." });
    try {
      await saveCanvas({
        canvas_id: canvasId,
        style_id: styleId,
      });
      // 接口成功后更新本地状态
      setStore({
        globalStyle: styleId,
        saveLoading: false,
        saveTip: "已自动保存",
      });
      message.success("全局风格保存成功");
    } catch (err) {
      setStore({ saveLoading: false, saveTip: "保存失败，请重试" });
    }
  },

  // ===================== 实时远程保存 Action =====================
  /**
   * 触发远程保存（供其他 slice 调用）
   * 内部由防抖控制，避免频繁请求
   */
  triggerRemoteSave: () => {
    const state = getStore();
    const { canvasId, nodes, edges, canvasName, globalStyle } = state;

    if (!canvasId) return;

    setStore({ saveTip: "等待保存..." });

    // 使用防抖管理器触发保存
    remoteSaveManager.trigger(
      (data) => doRemoteSave(data),
      5000, // 5 秒防抖
      { canvasId, nodes, edges, canvasName, globalStyle }
    );
  },

  /**
   * 取消待执行的远程保存
   * 切换画布时调用，防止旧画布数据被保存
   */
  cancelRemoteSave: () => {
    remoteSaveManager.cancel();
    setStore({ saveTip: "" });
  },

  /**
   * 立即执行待处理的远程保存（用于页面离开等场景）
   */
  flushRemoteSave: () => {
    const state = getStore();
    const { canvasId, nodes, edges, canvasName, globalStyle } = state;

    if (!canvasId) return;

    // 先取消防抖
    remoteSaveManager.cancel();

    // 立即保存
    setStore({ saveLoading: true, saveTip: "保存中..." });

    doRemoteSave({ canvasId, nodes, edges, canvasName, globalStyle })
      .then(() => {
        setStore({ saveLoading: false, saveTip: "已保存" });
      })
      .catch(() => {
        setStore({ saveLoading: false, saveTip: "保存失败" });
      });
  },

  /**
   * 手动触发立即保存（用于显式保存操作）
   */
  forceSaveRemote: async () => {
    const state = getStore();
    const { canvasId, nodes, edges, canvasName, globalStyle } = state;

    if (!canvasId) return;

    // 取消待执行的保存
    remoteSaveManager.cancel();

    setStore({ saveLoading: true, saveTip: "保存中..." });

    try {
      await saveCanvas({
        canvas_id: canvasId,
        canvas_data: JSON.stringify({ nodes, edges, canvasName, globalStyle }),
      });
      setStore({ saveLoading: false, saveTip: "已保存" });
    } catch (err) {
      setStore({ saveLoading: false, saveTip: "保存失败" });
      console.error("保存画布数据失败:", err);
    }
  },
});
