/**
 * Canvas 画布状态管理 (Zustand Store)
 * 采用 slice 模式拆分管理不同职责的状态
 */
import { create } from 'zustand'

// 导入各 slice
import { nodesInitialState, createNodesSlice } from './slices/nodesSlice'
import { edgesInitialState, createEdgesSlice } from './slices/edgesSlice'
import { uiInitialState, createUISlice } from './slices/uiSlice'
import { historyInitialState, createHistorySlice } from './slices/historySlice'
import { clipboardInitialState, createClipboardSlice } from './slices/clipboardSlice'
import { materialsInitialState, createMaterialsSlice } from './slices/materialsSlice'
import { canvasInitialState, createCanvasSlice } from './slices/canvasSlice'

// 导入工具函数
import { deepClone } from '@/utils/common'

// 合并所有初始状态
const initialState = {
  ...nodesInitialState,
  ...edgesInitialState,
  ...uiInitialState,
  ...historyInitialState,
  ...clipboardInitialState,
  ...materialsInitialState,
  ...canvasInitialState,
}

/**
 * Canvas 画布 Store
 */
const useCanvasStore = create((set, get) => {
  // 创建 store 访问器
  const getStore = () => get()
  const setStore = (updater) => {
    if (typeof updater === 'function') {
      set(updater)
    } else {
      set(updater)
    }
  }

  // 合并所有 slice
  return {
    ...initialState,

    // 批量更新
    setNodesAndEdges: (nodes, edges) => set({ nodes, edges }),

    // 清空选中
    clearSelection: () => set({ selectedNodeId: null, selectedEdgeId: null }),

    // 重置画布
    resetCanvas: () => {
      set({
        nodes: [],
        edges: [],
        selectedNodeId: null,
        selectedEdgeId: null,
        viewport: { x: 0, y: 0, zoom: 1 },
        contextMenu: {
          visible: false,
          x: 0,
          y: 0,
          target: null,
          targetId: null,
        },
        history: [],
        historyIndex: -1,
        clipboard: null,
      })
    },

    // 组合所有 slice 的 actions
    ...createNodesSlice(getStore, setStore),
    ...createEdgesSlice(getStore, setStore),
    ...createUISlice(getStore, setStore),
    ...createHistorySlice(getStore, setStore),
    ...createClipboardSlice(getStore, setStore),
    ...createMaterialsSlice(getStore, setStore),
    ...createCanvasSlice(getStore, setStore),
  }
})

// 导出验证函数（保持向后兼容）
export { validateConnection } from './validators/connection'
export { getNodePortInfo } from './validators/connection'
export { isDataTypeCompatible, getNodeDataType, DATA_TYPES, DATA_TYPE_COMPATIBILITY } from './constants/dataTypes'

export default useCanvasStore
