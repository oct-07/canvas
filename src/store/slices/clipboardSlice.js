/**
 * 剪贴板管理 Slice
 * 管理复制/粘贴功能
 */
import { deepClone, generateId } from '@/utils/common'

/**
 * 剪贴板 Slice 初始状态
 */
export const clipboardInitialState = {
  clipboard: null,
}

/**
 * 创建剪贴板 Slice
 * @param {object} getStore - 获取 store 的函数
 * @param {object} setStore - 设置 store 的函数
 * @returns {object} 剪贴板相关的 state 和 actions
 */
export const createClipboardSlice = (getStore, setStore) => ({
  /**
   * 复制节点
   */
  copyNode: (node) => {
    setStore({ clipboard: deepClone(node) })
  },

  /**
   * 粘贴节点
   */
  pasteNode: (position = null) => {
    const { clipboard, addNode } = getStore()
    if (!clipboard) return null

    const newNode = {
      ...deepClone(clipboard),
      id: generateId('node'),
      position: position || {
        x: clipboard.position?.x + 50 || 100,
        y: clipboard.position?.y + 50 || 100,
      },
    }
    addNode(newNode)
    return newNode
  },

  /**
   * 清空剪贴板
   */
  clearClipboard: () => setStore({ clipboard: null }),
})
