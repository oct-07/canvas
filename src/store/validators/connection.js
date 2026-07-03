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
  const existingConnections = edges.filter((e) => e.target === targetNodeId);
  return existingConnections.length === 0;
};

/**
 * 检查全能参考模式下的连线限制
 * @param {object} targetNode - 目标节点
 * @param {object} sourceNode - 源节点
 * @param {array} edges - 当前所有边
 * @param {array} nodes - 所有节点
 * @param {object} modelListMap - 模型列表缓存
 * @returns {{ allowed: boolean, reason?: string }} 是否允许连接及原因
 */
export const checkUniversalRefConnection = (
  targetNode,
  sourceNode,
  edges,
  nodes,
  modelListMap,
) => {
  const modelType = targetNode.data?.model_type || "1";
  const modelId = targetNode.data?.model_id;
  const modelList = modelListMap[modelType] || [];
  const currentModel = modelList.find((m) => m.id === modelId);

  if (!currentModel) {
    return { allowed: false, reason: "模型未加载" };
  }

  const imgLimit = currentModel.model_param_img_num ?? 0;
  const videoLimit = currentModel.model_param_video_num ?? 0;

  const connectedEdges = edges.filter((e) => e.target === targetNode.id);
  const sourceNodes = connectedEdges.map((e) => nodes.find((n) => n.id === e.source));

  let imageCount = 0;
  let videoCount = 0;
  sourceNodes.forEach((node) => {
    if (node?.type === "image") imageCount++;
    if (node?.type === "video") videoCount++;
  });

  const isSourceImage = sourceNode.type === "image";
  const isSourceVideo = sourceNode.type === "video";

  if (isSourceImage && imgLimit > 0 && imageCount >= imgLimit) {
    return {
      allowed: false,
      reason: `图片数量已达上限（${imgLimit}张）`,
    };
  }

  if (isSourceVideo && videoLimit > 0 && videoCount >= videoLimit) {
    return {
      allowed: false,
      reason: `视频数量已达上限（${videoLimit}个）`,
    };
  }

  return { allowed: true };
};

/**
 * 检查重复连线
 * @param {string} source - 源节点 ID
 * @param {string} target - 目标节点 ID
 * @param {array} edges - 当前所有边
 * @returns {boolean} 是否已存在相同连线
 */
export const isDuplicateConnection = (source, target, edges) => {
  return edges.some((e) => e.source === source && e.target === target);
};

/**
 * 判断是否为全能参考模式（model_frame 包含 4）
 * @param {object} node - 节点对象
 * @returns {boolean}
 */
export const isUniversalRefMode = (node) => {
  const modelFrame = node.data?.model_frame;
  if (!modelFrame) return false;
  const frameArr = String(modelFrame).split(",").map((f) => f.trim());
  return frameArr.includes("4");
};

/**
 * 连接验证函数 - 完整的连线规则校验
 * @param {object} connection - 连接参数 { source, target, sourceHandle, targetHandle }
 * @param {object} store - store 实例
 * @returns {boolean} 是否允许连接
 */
export const validateConnection = (connection, store) => {
  const { source, target, sourceHandle, targetHandle } = connection;
  const { nodes, edges, modelListMap } = store;

  // 1. 源头端口强制校验：拖拽起点必须是 Output (source)
  if (sourceHandle && sourceHandle !== "output") {
    return false;
  }

  // 2. 目标端口必须是 Input (target)
  if (targetHandle && targetHandle !== "input") {
    return false;
  }

  // 3. 自连拦截：源节点 ID = 目标节点 ID
  if (source === target) {
    return false;
  }

  // 4. 获取源节点和目标节点
  const sourceNode = nodes.find((n) => n.id === source);
  const targetNode = nodes.find((n) => n.id === target);

  if (!sourceNode || !targetNode) {
    return false;
  }

  // 5. 数据类型兼容校验
  const sourceDataType = getNodeDataType(sourceNode);
  const targetDataType = getNodeDataType(targetNode);

  if (sourceDataType && targetDataType) {
    if (!isDataTypeCompatible(sourceDataType, targetDataType)) {
      return false;
    }
  }

  // 6. 重复连线去重
  if (isDuplicateConnection(source, target, edges)) {
    return false;
  }

  // 7. 连线数量限制校验
  // 全能参考模式（model_frame 包含 4）：支持多连线，按图片/视频数量限制
  // 普通模式：仅允许单条连线
  if (isUniversalRefMode(targetNode)) {
    const result = checkUniversalRefConnection(
      targetNode,
      sourceNode,
      edges,
      nodes,
      modelListMap,
    );
    if (!result.allowed) {
      console.warn("[连线限制]", result.reason);
      return false;
    }
  } else {
    // 普通模式：只允许一条连线
    if (!canAddInputConnection(target, edges)) {
      return false;
    }
  }

  return true;
};
