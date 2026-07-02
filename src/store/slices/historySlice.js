/**
 * 历史记录管理 Slice
 * 管理撤销/重做功能
 */
import { deepClone } from '@/utils/common'

const HISTORY_LIMIT = 50

/**
 * 历史记录 Slice 初始状态
 */
export const historyInitialState = {
  history: [],
  historyIndex: -1,
}

/**
 * 创建历史记录 Slice
 * @param {object} getStore - 获取 store 的函数
 * @param {object} setStore - 设置 store 的函数
 * @returns {object} 历史记录相关的 state 和 actions
 */
export const createHistorySlice = (getStore, setStore) => ({
  /**
   * 保存历史快照
   */
  saveHistory: () => {
    setStore((state) => {
      const { nodes, edges, history, historyIndex } = state
      const newHistory = history.slice(0, historyIndex + 1)
      newHistory.push({ nodes: deepClone(nodes), edges: deepClone(edges) })
      if (newHistory.length > HISTORY_LIMIT) {
        newHistory.shift()
      }
      return {
        history: newHistory,
        historyIndex: newHistory.length - 1,
      }
    })
  },

  /**
   * 撤销
   */
  undo: () => {
    setStore((state) => {
      const { history, historyIndex } = state
      if (historyIndex > 0) {
        const prevState = history[historyIndex - 1]
        return {
          nodes: deepClone(prevState.nodes),
          edges: deepClone(prevState.edges),
          historyIndex: historyIndex - 1,
        }
      }
      return state
    })
  },

  /**
   * 重做
   */
  redo: () => {
    setStore((state) => {
      const { history, historyIndex } = state
      if (historyIndex < history.length - 1) {
        const nextState = history[historyIndex + 1]
        return {
          nodes: deepClone(nextState.nodes),
          edges: deepClone(nextState.edges),
          historyIndex: historyIndex + 1,
        }
      }
      return state
    })
  },

  /**
   * 检查是否可以撤销
   */
  canUndo: () => getStore().historyIndex > 0,

  /**
   * 检查是否可以重做
   */
  canRedo: () => {
    const { historyIndex, history } = getStore()
    return historyIndex < history.length - 1
  },
})
