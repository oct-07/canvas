/**
 * 画布 Slice
 * 管理画布基础信息和视口
 */

/**
 * 画布 Slice 初始状态
 */
export const canvasInitialState = {
  canvasId: null,
  canvasName: '未命名画布',
  viewport: { x: 0, y: 0, zoom: 1 },
}

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
  canvasName: '未命名画布',
  setCanvasName: (name) => setStore({ canvasName: name }),

  /**
   * 画布视口
   */
  viewport: { x: 0, y: 0, zoom: 1 },
  setViewport: (viewport) => setStore({ viewport }),
})
