/**
 * 通用工具：防抖/节流/存储/复制/ID/文件/深拷贝
 */

// 防抖
export const debounce = (fn, delay = 300) => {
  let timer = null
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

// 节流
export const throttle = (fn, delay = 300) => {
  let last = 0
  return (...args) => {
    const now = Date.now()
    if (now - last >= delay) {
      last = now
      fn(...args)
    }
  }
}

// 复制文本
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const el = document.createElement('textarea')
    el.value = text
    el.style.position = 'fixed'
    el.style.left = '-9999px'
    document.body.appendChild(el)
    el.select()
    const res = document.execCommand('copy')
    document.body.removeChild(el)
    return res
  }
}

// localStorage 简易封装
export const storage = {
  get: (key, def = null) => {
    const val = localStorage.getItem(key)
    if (!val) return def
    try { return JSON.parse(val) } catch { return val }
  },
  set: (key, val) => localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val)),
  remove: key => localStorage.removeItem(key),
  clear: () => localStorage.clear()
}

// 唯一ID
export const generateId = (prefix = 'id') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`

// 文件判断
export const isImage = file => file?.type?.startsWith('image/')
export const isVideo = file => file?.type?.startsWith('video/')

// 文件大小格式化
export const formatFileSize = bytes => {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + units[i]
}

// 简易深拷贝（普通对象/数组够用，不用处理复杂类型）
export const deepClone = obj => JSON.parse(JSON.stringify(obj))

// 安全解析JSON
export const safeParseJSON = (str, def = null) => {
  try { return JSON.parse(str) } catch { return def }
}

// 等待延时
export const sleep = ms => new Promise(res => setTimeout(res, ms))

export default {
  debounce,
  throttle,
  copyToClipboard,
  storage,
  generateId,
  isImage,
  isVideo,
  formatFileSize,
  deepClone,
  safeParseJSON,
  sleep
}