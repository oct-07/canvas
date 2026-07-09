/**
 * 画布本地持久化管理
 * 将画布数据以 JSON 格式存储在浏览器 localStorage
 */
import { storage } from './common'

/**
 * 本地存储 Key 前缀
 */
const STORAGE_PREFIX = 'canvas_'

/**
 * localStorage 预估容量（5MB）
 */
const STORAGE_QUOTA = 5 * 1024 * 1024

/**
 * 存储安全阈值（90%，超过后提示清理）
 */
const STORAGE_WARNING_THRESHOLD = 0.9

/**
 * 画布数据存储键名
 * @param {string} canvasId - 画布ID
 */
const getCanvasKey = (canvasId) => `${STORAGE_PREFIX}${canvasId}`

/**
 * 计算字符串占用字节数（UTF-16）
 */
const getByteSize = (str) => new Blob([str]).size

/**
 * 获取当前存储使用量
 * @returns {{ used: number, quota: number, percentage: number }}
 */
const getStorageUsage = () => {
  let used = 0
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        const value = localStorage.getItem(key) || ''
        used += getByteSize(key) + getByteSize(value)
      }
    }
  } catch (err) {
    console.error('[canvasStorage] 计算存储使用量失败:', err)
  }
  return {
    used,
    quota: STORAGE_QUOTA,
    percentage: Math.round((used / STORAGE_QUOTA) * 100),
  }
}

/**
 * 检查存储空间是否足够
 * @param {Object} data - 要存储的数据
 * @returns {{ available: boolean, message: string }}
 */
const checkStorageAvailable = (data) => {
  const currentUsage = getStorageUsage()
  const dataSize = getByteSize(JSON.stringify(data))
  const availableSpace = STORAGE_QUOTA - currentUsage.used

  if (dataSize > availableSpace) {
    return {
      available: false,
      message: `存储空间不足（需要 ${Math.round(dataSize / 1024)}KB，可用 ${Math.round(availableSpace / 1024)}KB）`,
    }
  }

  if (currentUsage.percentage >= STORAGE_WARNING_THRESHOLD * 100) {
    return {
      available: true,
      message: `存储空间即将耗尽（已用 ${currentUsage.percentage}%），建议清理不需要的画布`,
      warning: true,
    }
  }

  return { available: true, message: '' }
}

/**
 * 存储的数据结构
 * @typedef {Object} CanvasStorageData
 * @property {string} canvasId - 画布ID
 * @property {string} canvasName - 画布名称
 * @property {string} globalStyle - 全局风格
 * @property {Array} nodes - 节点列表
 * @property {Array} edges - 边列表
 * @property {Object} viewport - 视口信息
 * @property {number} savedAt - 保存时间戳
 */

/**
 * 持久化管理对象
 */
export const canvasStorage = {
  /**
   * 保存画布数据到本地
   * @param {Object} options - 保存选项
   * @param {string} options.canvasId - 画布ID
   * @param {string} [options.canvasName] - 画布名称
   * @param {string} [options.globalStyle] - 全局风格
   * @param {Array} options.nodes - 节点列表
   * @param {Array} options.edges - 边列表
   * @param {Object} [options.viewport] - 视口信息
   */
  save: ({ canvasId, canvasName, globalStyle, nodes, edges, viewport, groups }) => {
    if (!canvasId) return false

    const data = {
      canvasId,
      canvasName,
      globalStyle,
      nodes,
      edges,
      viewport,
      // 选区打组：组名映射 { [signature]: { name } }
      groups: groups || {},
      savedAt: Date.now(),
    }

    // 检查存储空间
    const storageCheck = checkStorageAvailable(data)
    if (!storageCheck.available) {
      console.error('[canvasStorage] 保存失败:', storageCheck.message)
      return false
    }

    if (storageCheck.warning) {
      console.warn('[canvasStorage] 存储空间警告:', storageCheck.message)
    }

    try {
      const key = getCanvasKey(canvasId)
      storage.set(key, data)
      return true
    } catch (err) {
      console.error('[canvasStorage] 保存失败:', err)
      return false
    }
  },

  /**
   * 从本地加载画布数据
   * @param {string} canvasId - 画布ID
   * @returns {CanvasStorageData|null} 画布数据，不存在返回 null
   */
  load: (canvasId) => {
    if (!canvasId) return null

    try {
      const key = getCanvasKey(canvasId)
      const data = storage.get(key)
      return data || null
    } catch (err) {
      console.error('[canvasStorage] 加载失败:', err)
      return null
    }
  },

  /**
   * 检查本地是否存在指定画布数据
   * @param {string} canvasId - 画布ID
   * @returns {boolean}
   */
  exists: (canvasId) => {
    if (!canvasId) return false
    return storage.get(getCanvasKey(canvasId)) !== null
  },

  /**
   * 删除本地画布数据
   * @param {string} canvasId - 画布ID
   */
  remove: (canvasId) => {
    if (!canvasId) return
    storage.remove(getCanvasKey(canvasId))
  },

  /**
   * 获取本地所有画布的元信息列表（不含完整数据）
   * @returns {Array<{canvasId: string, canvasName: string, savedAt: number}>}
   */
  listAll: () => {
    const result = []
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith(STORAGE_PREFIX)) {
          const data = storage.get(key)
          if (data) {
            result.push({
              canvasId: data.canvasId,
              canvasName: data.canvasName,
              savedAt: data.savedAt,
            })
          }
        }
      }
    } catch (err) {
      console.error('[canvasStorage] 列表获取失败:', err)
    }
    return result
  },

  /**
   * 清除所有本地画布数据
   */
  clearAll: () => {
    try {
      const keysToRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith(STORAGE_PREFIX)) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach((key) => storage.remove(key.replace(STORAGE_PREFIX, '')))
    } catch (err) {
      console.error('[canvasStorage] 清除失败:', err)
    }
  },

  /**
   * 获取当前存储使用情况
   * @returns {{ used: number, quota: number, percentage: number }}
   */
  getStorageUsage,

  /**
   * 检查存储空间是否足够
   * @param {Object} data - 要存储的数据
   * @returns {{ available: boolean, message: string }}
   */
  checkStorageAvailable,
}

export default canvasStorage
