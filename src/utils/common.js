/**
 * 通用工具函数
 * 提供防抖、节流、剪贴板、本地存储等通用功能
 */

/**
 * 防抖函数
 * @param {Function} fn - 要防抖的函数
 * @param {number} delay - 延迟时间（毫秒），默认 300
 * @returns {Function} 防抖处理后的函数
 */
export const debounce = (fn, delay = 300) => {
  let timer = null
  return function (...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}

/**
 * 节流函数
 * @param {Function} fn - 要节流的函数
 * @param {number} delay - 间隔时间（毫秒），默认 300
 * @returns {Function} 节流处理后的函数
 */
export const throttle = (fn, delay = 300) => {
  let lastTime = 0
  return function (...args) {
    const now = Date.now()
    if (now - lastTime >= delay) {
      lastTime = now
      fn.apply(this, args)
    }
  }
}

/**
 * 复制文本到剪贴板
 * @param {string} text - 要复制的文本
 * @returns {Promise<boolean>} 是否复制成功
 */
export const copyToClipboard = async (text) => {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (error) {
      console.error('Clipboard API failed:', error)
    }
  }
  // 降级方案
  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    textarea.style.top = '-9999px'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    const success = document.execCommand('copy')
    document.body.removeChild(textarea)
    return success
  } catch (error) {
    console.error('Fallback copy failed:', error)
    return false
  }
}

/**
 * LocalStorage 封装
 */
export const storage = {
  /**
   * 获取存储值
   * @param {string} key - 键名
   * @param {*} defaultValue - 默认值
   * @returns {*} 存储的值或默认值
   */
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key)
      if (item === null) return defaultValue
      try {
        return JSON.parse(item)
      } catch {
        return item
      }
    } catch (error) {
      console.error(`Failed to get storage key "${key}":`, error)
      return defaultValue
    }
  },

  /**
   * 设置存储值
   * @param {string} key - 键名
   * @param {*} value - 要存储的值
   */
  set: (key, value) => {
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value)
      localStorage.setItem(key, serialized)
    } catch (error) {
      console.error(`Failed to set storage key "${key}":`, error)
    }
  },

  /**
   * 删除存储值
   * @param {string} key - 键名
   */
  remove: (key) => {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error(`Failed to remove storage key "${key}":`, error)
    }
  },

  /**
   * 清空所有存储
   */
  clear: () => {
    try {
      localStorage.clear()
    } catch (error) {
      console.error('Failed to clear storage:', error)
    }
  },

  /**
   * 检查键是否存在
   * @param {string} key - 键名
   * @returns {boolean}
   */
  has: (key) => {
    return localStorage.getItem(key) !== null
  },
}

/**
 * 生成唯一 ID
 * @param {string} prefix - 前缀，默认 'id'
 * @returns {string} 唯一 ID
 */
export const generateId = (prefix = 'id') => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 判断是否为图片
 * @param {File} file - 文件对象
 * @returns {boolean}
 */
export const isImage = (file) => {
  return file && file.type && file.type.startsWith('image/')
}

/**
 * 判断是否为视频
 * @param {File} file - 文件对象
 * @returns {boolean}
 */
export const isVideo = (file) => {
  return file && file.type && file.type.startsWith('video/')
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的大小字符串
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  if (!bytes || isNaN(bytes)) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const size = (bytes / Math.pow(k, i)).toFixed(2)

  return `${size} ${units[i]}`
}

/**
 * 判断是否为移动设备
 * @returns {boolean}
 */
export const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
}

/**
 * 判断是否为微信浏览器
 * @returns {boolean}
 */
export const isWechat = () => {
  return /MicroMessenger/i.test(navigator.userAgent)
}

/**
 * 睡眠函数
 * @param {number} ms - 毫秒
 * @returns {Promise<void>}
 */
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * 深拷贝
 * @param {*} obj - 要拷贝的对象
 * @returns {*} 拷贝后的对象
 */
export const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj)
  if (obj instanceof Array) return obj.map((item) => deepClone(item))
  if (obj instanceof Object) {
    const cloned = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key])
      }
    }
    return cloned
  }
}

/**
 * 判断数据类型
 * @param {*} value - 值
 * @returns {string} 类型名称
 */
export const getType = (value) => {
  return Object.prototype.toString.call(value).slice(8, -1).toLowerCase()
}

/**
 * 安全地解析 JSON
 * @param {string} str - JSON 字符串
 * @param {*} defaultValue - 默认值
 * @returns {*} 解析结果或默认值
 */
export const safeParseJSON = (str, defaultValue = null) => {
  try {
    return JSON.parse(str)
  } catch {
    return defaultValue
  }
}

export default {
  debounce,
  throttle,
  copyToClipboard,
  storage,
  generateId,
  isImage,
  isVideo,
  formatFileSize,
  isMobile,
  isWechat,
  sleep,
  deepClone,
  getType,
  safeParseJSON,
}
