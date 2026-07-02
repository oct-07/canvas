/**
 * 连接验证器
 * 包含连线规则校验逻辑
 */
import { DATA_TYPES, isDataTypeCompatible, getNodeDataType } from '../constants/dataTypes'

/**
 * 获取节点的端口信息
 * @param {object} node - 节点对象
 * @param {string} handleType - 'source' | 'target'
 * @returns {object} 端口配置
 */
export const getNodePortInfo = (node, handleType) => {
  const isSource = handleType === 'source'
  return {
    nodeId: node.id,
    nodeType: node.type,
    handleType,
    position: isSource ? 'right' : 'left',
    portId: isSource ? 'output' : 'input',
  }
}

/**
 * 检查素材类 Input 是否已达到连线上限
 * @param {string} targetNodeId - 目标节点 ID
 * @param {array} edges - 当前所有边
 * @returns {boolean} 是否可以添加新连线
 */
export const canAddInputConnection = (targetNodeId, edges) => {
  const existingConnections = edges.filter((e) => e.target === targetNodeId)
  return existingConnections.length === 0
}

/**
 * 检查重复连线
 * @param {string} source - 源节点 ID
 * @param {string} target - 目标节点 ID
 * @param {array} edges - 当前所有边
 * @returns {boolean} 是否已存在相同连线
 */
export const isDuplicateConnection = (source, target, edges) => {
  return edges.some((e) => e.source === source && e.target === target)
}

/**
 * 连接验证函数 - 完整的连线规则校验
 * @param {object} connection - 连接参数 { source, target, sourceHandle, targetHandle }
 * @param {object} store - store 实例
 * @returns {boolean} 是否允许连接
 */
export const validateConnection = (connection, store) => {
  const { source, target, sourceHandle, targetHandle } = connection
  const { nodes, edges } = store

  // 1. 源头端口强制校验：拖拽起点必须是 Output (source)
  if (sourceHandle && sourceHandle !== 'output') {
    return false
  }

  // 2. 目标端口必须是 Input (target)
  if (targetHandle && targetHandle !== 'input') {
    return false
  }

  // 3. 自连拦截：源节点 ID = 目标节点 ID
  if (source === target) {
    return false
  }

  // 4. 获取源节点和目标节点
  const sourceNode = nodes.find((n) => n.id === source)
  const targetNode = nodes.find((n) => n.id === target)

  if (!sourceNode || !targetNode) {
    return false
  }

  // 5. 数据类型兼容校验
  const sourceDataType = getNodeDataType(sourceNode)
  const targetDataType = getNodeDataType(targetNode)

  if (sourceDataType && targetDataType) {
    if (!isDataTypeCompatible(sourceDataType, targetDataType)) {
      return false
    }
  }

  // 6. 素材类 Input（图片/视频）单输入校验
  if (targetDataType === DATA_TYPES.IMAGE || targetDataType === DATA_TYPES.VIDEO) {
    if (!canAddInputConnection(target, edges)) {
      return false
    }
  }

  // 7. 重复连线去重
  if (isDuplicateConnection(source, target, edges)) {
    return false
  }

  return true
}
