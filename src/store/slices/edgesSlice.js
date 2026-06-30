/**
 * 边状态管理 Slice
 */
import { applyEdgeChanges } from '@xyflow/react'
import { generateId } from '@/utils/common'

/**
 * 边 Slice 初始状态
 */
export const edgesInitialState = {
  edges: [],
  selectedEdgeId: null,
}

/**
 * 创建边 Slice
 * @param {object} getStore - 获取 store 的函数
 * @param {object} setStore - 设置 store 的函数
 * @returns {object} 边相关的 state 和 actions
 */
export const createEdgesSlice = (getStore, setStore) => ({
  /**
   * 设置边列表
   */
  setEdges: (edges) => setStore({ edges }),

  /**
   * 设置选中边
   */
  setSelectedEdge: (edgeId) => setStore({ selectedEdgeId: edgeId, selectedNodeId: null }),

  /**
   * 连线回调
   */
  onConnect: (params) => {
    const { saveHistory } = getStore()
    saveHistory()
    const newEdge = {
      id: generateId('edge'),
      ...params,
      type: 'smoothstep',
    }
    setStore((state) => ({ edges: [...state.edges, newEdge] }))
    return newEdge
  },

  /**
   * 添加边
   */
  addEdge: (edge) => {
    const { saveHistory } = getStore()
    saveHistory()
    const newEdge = {
      id: generateId('edge'),
      ...edge,
    }
    setStore((state) => ({ edges: [...state.edges, newEdge] }))
    return newEdge
  },

  /**
   * 更新边
   */
  updateEdge: (edgeId, updates) => {
    const { saveHistory } = getStore()
    saveHistory()
    setStore((state) => ({
      edges: state.edges.map((edge) =>
        edge.id === edgeId ? { ...edge, ...updates } : edge
      ),
    }))
  },

  /**
   * 删除边
   */
  removeEdge: (edgeId) => {
    const { saveHistory } = getStore()
    saveHistory()
    setStore((state) => ({
      edges: state.edges.filter((edge) => edge.id !== edgeId),
    }))
  },

  /**
   * 删除边 (别名)
   */
  deleteEdge: (edgeId) => {
    const { removeEdge } = getStore()
    removeEdge(edgeId)
  },

  /**
   * 边变化处理
   */
  onEdgesChange: (changes) => {
    setStore((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
    }))
  },
})
