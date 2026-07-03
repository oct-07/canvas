/**
 * 画布 Slice
 * 管理画布基础信息和视口
 */
import { saveCanvas } from "@/api";
import { message } from "antd";
import useStyleStore from "@/store/styleStore";
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
   * @param {Object} meta - { canvasId, canvasName, globalStyle }
   */
  setCanvasMeta: (meta) => {
    setStore({
      canvasId: meta.canvasId,
      canvasName: meta.canvasName,
      globalStyle: meta.globalStyle,
    });
    // 同步更新 styleStore，保持全局风格数据一致
    useStyleStore.getState().setGlobalStyle(meta.globalStyle);
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
});
