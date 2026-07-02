/**
 * 节点状态管理 Slice
 */
import { generateId } from '@/utils/common'
import { applyNodeChanges } from '@xyflow/react'

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



