/**
 * 数据类型常量定义
 */
export const DATA_TYPES = {
  IMAGE: 'IMAGE',
  VIDEO: 'VIDEO',
}

/**
 * 数据类型兼容映射
 * key: 目标 Input 端口接受的数据类型
 * value: 可接受的源 Output 数据类型数组
 */
export const DATA_TYPE_COMPATIBILITY = {
  [DATA_TYPES.IMAGE]: [DATA_TYPES.IMAGE],
  [DATA_TYPES.VIDEO]: [DATA_TYPES.VIDEO, DATA_TYPES.IMAGE],
}

/**
 * 检查数据类型是否兼容
 * @param {string} sourceType - 源 Output 数据类型
 * @param {string} targetType - 目标 Input 数据类型
 * @returns {boolean} 是否兼容
 */
export const isDataTypeCompatible = (sourceType, targetType) => {
  const compatibleTypes = DATA_TYPE_COMPATIBILITY[targetType]
  if (!compatibleTypes) return false
  return compatibleTypes.includes(sourceType)
}

/**
 * 获取节点的数据类型
 * @param {object} node - 节点对象
 * @returns {string|null} 数据类型
 */
export const getNodeDataType = (node) => {
  switch (node.type) {
    case 'image':
      return DATA_TYPES.IMAGE
    case 'video':
      return DATA_TYPES.VIDEO
    default:
      return null
  }
}
