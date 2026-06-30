/**
 * Store 统一导出
 */
export { default as useCanvasStore } from './canvasStore'

// 导出验证函数
export { validateConnection, getNodePortInfo } from './canvasStore'
export { isDataTypeCompatible, getNodeDataType, DATA_TYPES, DATA_TYPE_COMPATIBILITY } from './canvasStore'

// 导出 slice（便于扩展或单独使用）
export * from './constants/dataTypes'
export * from './validators/connection'
export * from './slices/nodesSlice'
export * from './slices/edgesSlice'
export * from './slices/uiSlice'
export * from './slices/historySlice'
export * from './slices/clipboardSlice'
export * from './slices/materialsSlice'
export * from './slices/canvasSlice'
