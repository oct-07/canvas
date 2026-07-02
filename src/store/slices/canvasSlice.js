/**
 * 画布 Slice
 * 管理画布基础信息和视口
 */

/**
 * 画布 Slice 初始状态
 */
export const canvasInitialState = {
  canvasId: null,
  canvasName: "未命名画布",
  // 新增全局风格字段
  globalStyle: "",
  viewport: { x: 0, y: 0, zoom: 1 },
};

/**
 * 创建画布 Slice
 * @param {object} getStore - 获取 store 的函数
 * @param {object} setStore - 设置 store 的函数
 * @returns {object} 画布相关的 state 和 actions
 */
export const createCanvasSlice = (getStore, setStore) => ({
  /**
   * 画布 ID
   */
  canvasId: null,
  setCanvasId: (id) => setStore({ canvasId: id }),

  /**
   * 画布名称
   */
  canvasName: "未命名画布",
  setCanvasName: (name) => setStore({ canvasName: name }),

  /**
   * 全局风格标识
   */
  globalStyle: "",
  setGlobalStyle: (styleVal) => setStore({ globalStyle: styleVal }),

  /**
   * 批量更新画布基础元信息（ID/名称/风格）
   * @param {Object} meta - { canvasId, canvasName, globalStyle }
   */
  setCanvasMeta: (meta) =>
    setStore({
      canvasId: meta.canvasId,
      canvasName: meta.canvasName,
      globalStyle: meta.globalStyle,
    }),

  /**
   * 画布视口
   */
  viewport: { x: 0, y: 0, zoom: 1 },
  setViewport: (viewport) => setStore({ viewport }),
});
