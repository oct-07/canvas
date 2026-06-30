/**
 * UI 状态管理 Slice
 */

/**
 * UI Slice 初始状态
 */
export const uiInitialState = {
  currentTool: 'select',
  isSidebarOpen: true,
  isPreviewOpen: false,
  contextMenu: {
    visible: false,
    x: 0,
    y: 0,
    target: null,
    targetId: null,
  },
}

/**
 * 创建 UI Slice
 * @param {object} getStore - 获取 store 的函数
 * @param {object} setStore - 设置 store 的函数
 * @returns {object} UI相关的 state 和 actions
 */
export const createUISlice = (getStore, setStore) => ({
  /**
   * 工具状态
   */
  currentTool: 'select',
  setCurrentTool: (tool) => setStore({ currentTool: tool }),

  /**
   * 侧边栏状态
   */
  isSidebarOpen: true,
  toggleSidebar: () =>
    setStore((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  /**
   * 预览状态
   */
  isPreviewOpen: false,
  togglePreview: () =>
    setStore((state) => ({ isPreviewOpen: !state.isPreviewOpen })),

  /**
   * 上下文菜单
   */
  showContextMenu: (x, y, target, targetId) => {
    setStore({
      contextMenu: {
        visible: true,
        x,
        y,
        target,
        targetId,
      },
    })
  },

  hideContextMenu: () => {
    setStore((state) => ({
      contextMenu: { ...state.contextMenu, visible: false },
    }))
  },
})
