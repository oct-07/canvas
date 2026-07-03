/**
 * UI 状态管理 Slice
 * 全局单例悬浮编辑面板相关状态集中在此处管理
 */

/**
 * UI Slice 初始状态
 */
export const uiInitialState = {
  currentTool: "select",
  isSidebarOpen: true,
  isPreviewOpen: false,
  contextMenu: {
    visible: false,
    x: 0,
    y: 0,
    target: null,
    targetId: null,
  },
  activeNodeId: null,
  panelPos: null,
  nodeEditors: {},
  // 全局唯一：当前正在显示「悬停跟随删除图标」的连线ID（保证全局最多 1 个）
  hoverDeleteEdgeId: null,
};

/**
 * 创建 UI Slice
 * @param {object} getStore - 获取 store 的函数
 * @param {object} setStore - 设置 store 的函数
 * @returns {object} UI相关的 state 和 actions
 */
export const createUISlice = (getStore, setStore) => ({
  currentTool: "select",
  setCurrentTool: (tool) => setStore({ currentTool: tool }),

  isSidebarOpen: true,
  toggleSidebar: () =>
    setStore((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  isPreviewOpen: false,
  togglePreview: () =>
    setStore((state) => ({ isPreviewOpen: !state.isPreviewOpen })),
  // 设置当前选中连线
  setActiveEdgeId: (edgeId) => {
    setStore({ selectedEdgeId: edgeId });
  },
  // 清空选中连线
  clearActiveEdge: () => {
    setStore({ selectedEdgeId: null });
  },
  // 全局唯一：设置当前显示删除图标的连线（null 表示隐藏）
  hoverDeleteEdgeId: null,
  setHoverDeleteEdgeId: (edgeId) => {
    setStore({ hoverDeleteEdgeId: edgeId });
  },
  contextMenu: {
    visible: false,
    x: 0,
    y: 0,
    target: null,
    targetId: null,
  },
  showContextMenu: (x, y, target, targetId) => {
    setStore({
      contextMenu: {
        visible: true,
        x,
        y,
        target,
        targetId,
      },
    });
  },
  hideContextMenu: () => {
    setStore((state) => ({
      contextMenu: { ...state.contextMenu, visible: false },
    }));
  },

  activeNodeId: null,
  setActiveNodeId: (nodeId) => setStore({ activeNodeId: nodeId }),

  panelPos: null,
  setPanelPos: (panelPos) => setStore({ panelPos }),

  nodeEditors: {},
  showActiveEditor: (nodeId, nodeType) => {
    setStore((state) => ({
      nodeEditors: {
        ...state.nodeEditors,
        [nodeId]: {
          visible: true,
          nodeType,
          position: null,
          data: null,
        },
      },
    }));
  },
  hideActiveEditor: (nodeId) => {
    setStore((state) => {
      if (!nodeId) {
        return { nodeEditors: {}, activeNodeId: null, panelPos: null };
      }
      const next = { ...state.nodeEditors };
      delete next[nodeId];
      const isActive = state.activeNodeId === nodeId;
      return {
        nodeEditors: next,
        ...(isActive ? { activeNodeId: null, panelPos: null } : {}),
      };
    });
  },
  hideAllActiveEditors: () => {
    setStore({ nodeEditors: {}, activeNodeId: null, panelPos: null });
  },
  setNodeEditorPosition: (nodeId, position) => {
    setStore((state) => {
      const current = state.nodeEditors[nodeId];
      if (!current) return state;
      return {
        nodeEditors: {
          ...state.nodeEditors,
          [nodeId]: { ...current, position },
        },
        ...(state.activeNodeId === nodeId ? { panelPos: position } : {}),
      };
    });
  },
  setNodeEditorData: (nodeId, data) => {
    setStore((state) => {
      const current = state.nodeEditors[nodeId];
      if (!current) return state;
      return {
        nodeEditors: {
          ...state.nodeEditors,
          [nodeId]: { ...current, data },
        },
      };
    });
  },
});
