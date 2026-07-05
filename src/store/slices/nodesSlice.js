/**
 * 节点状态管理 Slice
 */
import { generateId } from '@/utils/common'
import { applyNodeChanges } from '@xyflow/react'
import { canvasStorage } from '@/utils/canvasStorage'

/**
 * 保存当前画布状态到本地，并触发远程防抖保存
 */
const saveToLocalStorage = (getState) => {
  const state = getState();
  if (!state.canvasId) return;

  canvasStorage.save({
    canvasId: state.canvasId,
    canvasName: state.canvasName,
    globalStyle: state.globalStyle,
    nodes: state.nodes,
    edges: state.edges,
    viewport: state.viewport,
  });

  // 触发远程防抖保存
  const { triggerRemoteSave } = state;
  if (typeof triggerRemoteSave === 'function') {
    triggerRemoteSave();
  }
}

/**
 * 节点 Slice 初始状态
 */
export const nodesInitialState = {
  nodes: [],
  selectedNodeId: null,
}

/**
 * 创建节点 Slice
 * @param {object} getStore - 获取 store 的函数
 * @param {object} setStore - 设置 store 的函数
 * @returns {object} 节点相关的 state 和 actions
 */
export const createNodesSlice = (getStore, setStore) => ({
  /**
   * 设置节点列表
   */
  setNodes: (nodes) => setStore({ nodes }),

  /**
   * 设置选中节点
   */
  setSelectedNode: (nodeId) => setStore({ selectedNodeId: nodeId, selectedEdgeId: null }),

  /**
   * 添加节点
   */
  addNode: (node) => {
    const { saveHistory } = getStore()
    saveHistory()
    const newNode = {
      id: generateId('node'),
      ...node,
    }
    setStore((state) => ({ nodes: [...state.nodes, newNode] }))
    // 立即保存到本地
    saveToLocalStorage(getStore)
    return newNode
  },

  /**
   * 更新节点
   */
  updateNode: (nodeId, updates) => {
    const { saveHistory } = getStore()
    saveHistory()
    setStore((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId ? { ...node, ...updates } : node
      ),
    }))
    // 立即保存到本地
    saveToLocalStorage(getStore)
  },

  /**
   * 更新节点 data 属性（用于浮窗编辑数据同步到节点）
   */
  updateNodeData: (nodeId, dataUpdates) => {
    const { saveHistory } = getStore();
    saveHistory();
    setStore((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...dataUpdates } }
          : node
      ),
    }));
    // 立即保存到本地
    saveToLocalStorage(getStore);
  },

  /**
   * 删除节点
   */
  removeNode: (nodeId) => {
    const { saveHistory } = getStore()
    saveHistory()
    setStore((state) => ({
      nodes: state.nodes.filter((node) => node.id !== nodeId),
      edges: state.edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      ),
    }))
    // 立即保存到本地
    saveToLocalStorage(getStore)
  },

  /**
   * 删除节点 (别名)
   */
  deleteNode: (nodeId) => {
    const { removeNode } = getStore()
    removeNode(nodeId)
  },

  /**
   * 节点变化处理
   */
  onNodesChange: (changes) => {
    setStore((state) => ({
      nodes: applyNodeChanges(changes, state.nodes),
    }))
    // 节点位置变化时保存到本地
    saveToLocalStorage(getStore)
  },
  /**
   * 设置画布元素筛选类型 all / image / video
   */
  setElementFilter: (filterType) => setStore({ elementFilter: filterType }),

  /**
   * 设置画布元素搜索关键词
   */
  setElementSearch: (keyword) => setStore({ elementSearch: keyword }),
})



