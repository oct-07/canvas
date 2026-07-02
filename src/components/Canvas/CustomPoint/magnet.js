/**
 * 连接点磁吸算法（参考 libLib Canvas 的 Point 交互）
 *
 * 拖拽连线时，遍历画布上所有节点，检测光标是否落入某节点的「手柄热区」或「卡片区域」，
 * 据此计算：
 *   - 磁吸浮动加号手柄的偏移量 (handleFloatX / handleFloatY)
 *   - 卡片 3D 倾斜角度 (cardTiltX / cardTiltY)
 *   - 是否可连接 (canConnect)，并在无有效目标时保留最近的「不可连接」提示
 *
 * 该文件为纯算法，无 React 依赖，可被真实 Canvas 复用。
 */

// ========== 可调常量 ==========
export const CONNECTION_MAGNET_SIZE_PX = 80; // 热区尺寸（磁吸感应范围）
export const CONNECTION_HANDLE_CENTER_OUTSET = 20; // 手柄中心相对卡片边缘的外移距离
export const CONNECTION_HANDLE_VISUAL_OFFSET_PX = 12; // 加号手柄的视觉基准偏移
export const CARD_TILT_DEG = 7; // 卡片最大倾斜角度
export const CARD_DISTANCE_BASE = 1000; // 卡片命中的距离基数（保证手柄命中优先于卡片命中）

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/**
 * 获取节点的媒体外框（flow 坐标系）
 */
export const getNodeMediaBox = (node) => ({
  x: node.x,
  y: node.y,
  width: node.width,
  height: node.height,
});

/**
 * 默认连接校验：可被真实 Canvas 的 validateConnection 替换
 *  - 不能连接自身
 *  - 不能重复连接
 *  - 不能连入「输入型」节点（input 无入边）
 *  - 不能从「输出型」节点连出（output 无出边）
 */
export const canConnectCanvasNodes = (connection, allNodes, allEdges) => {
  const { source, target } = connection;
  if (!source || !target || source === target) return false;

  const sourceNode = allNodes.find((n) => n.id === source);
  const targetNode = allNodes.find((n) => n.id === target);
  if (!sourceNode || !targetNode) return false;

  const duplicate = allEdges.some(
    (e) => e.source === source && e.target === target
  );
  if (duplicate) return false;

  if (targetNode.kind === "input") return false;
  if (sourceNode.kind === "output") return false;

  return true;
};

/**
 * 主算法：寻找最佳连接目标
 *
 * @param {object}   params
 * @param {{x:number,y:number}} params.flowPoint   当前光标在 flow 坐标系中的位置
 * @param {string}   params.startNodeId             拖拽起点节点 id
 * @param {'source'|'target'} params.handleType     拖拽起点手柄类型
 * @param {Array}    params.allNodes
 * @param {Array}    params.allEdges
 * @param {number}   params.zoom                    当前缩放（默认 1）
 * @param {Function} [params.canConnect]            连接校验函数
 * @returns {object|null} best（优先有效连接）或 bestInvalid（最近的不可连接）
 */
export const findBestConnectionTarget = ({
  flowPoint,
  startNodeId,
  handleType,
  allNodes,
  allEdges,
  zoom = 1,
  canConnect = canConnectCanvasNodes,
}) => {
  // 1. 确定拖拽方向与热点侧
  const isDraggingFromTarget = handleType === "target";
  const handlePosition = isDraggingFromTarget ? "right" : "left";

  // 2. 计算热区参数（按 zoom 缩放）
  const hotspotDepth = CONNECTION_MAGNET_SIZE_PX / zoom;
  const hotspotHalfHeight = CONNECTION_MAGNET_SIZE_PX / 2 / zoom;
  const maxHandleFloatX =
    CONNECTION_MAGNET_SIZE_PX - CONNECTION_HANDLE_VISUAL_OFFSET_PX;

  let best = null;
  let bestInvalid = null;

  // 3. 遍历所有节点
  for (const node of allNodes) {
    if (node.id === startNodeId) continue;

    const box = getNodeMediaBox(node);

    // 热点手柄中心坐标
    const center = isDraggingFromTarget
      ? {
          x: box.x + box.width + CONNECTION_HANDLE_CENTER_OUTSET,
          y: box.y + box.height / 2,
        }
      : {
          x: box.x - CONNECTION_HANDLE_CENTER_OUTSET,
          y: box.y + box.height / 2,
        };

    const dy = Math.abs(flowPoint.y - center.y);

    // 热区命中判断
    const isInLeftHotspot =
      handlePosition === "left" &&
      flowPoint.x >= box.x - hotspotDepth &&
      flowPoint.x <= box.x &&
      dy <= hotspotHalfHeight;

    const isInRightHotspot =
      handlePosition === "right" &&
      flowPoint.x >= box.x + box.width &&
      flowPoint.x <= box.x + box.width + hotspotDepth &&
      dy <= hotspotHalfHeight;

    const isInHandleHotspot = isInLeftHotspot || isInRightHotspot;

    const isInCard =
      flowPoint.x >= box.x &&
      flowPoint.x <= box.x + box.width &&
      flowPoint.y >= box.y &&
      flowPoint.y <= box.y + box.height;

    if (!isInHandleHotspot && !isInCard) continue;

    // 连接方向
    const connection = isDraggingFromTarget
      ? { source: node.id, target: startNodeId }
      : { source: startNodeId, target: node.id };

    const connectable = canConnect(connection, allNodes, allEdges);

    // 加号手柄浮动偏移
    const rawHandleFloatX =
      flowPoint.x -
      center.x +
      (handlePosition === "left"
        ? CONNECTION_HANDLE_VISUAL_OFFSET_PX
        : -CONNECTION_HANDLE_VISUAL_OFFSET_PX);

    const handleFloatX = isInHandleHotspot
      ? clamp(
          rawHandleFloatX,
          handlePosition === "left" ? -maxHandleFloatX : 0,
          handlePosition === "left" ? 0 : maxHandleFloatX
        )
      : 0;

    const handleFloatY = isInHandleHotspot
      ? clamp(
          flowPoint.y - center.y,
          -CONNECTION_MAGNET_SIZE_PX / 2,
          CONNECTION_MAGNET_SIZE_PX / 2
        )
      : 0;

    // 卡片 3D 倾斜
    const cardRatioX = clamp(
      ((flowPoint.x - box.x) / box.width - 0.5) * 2,
      -1,
      1
    );
    const cardRatioY = clamp(
      ((flowPoint.y - box.y) / box.height - 0.5) * 2,
      -1,
      1
    );
    const cardTiltX = isInCard ? -cardRatioY * CARD_TILT_DEG : 0;
    const cardTiltY = isInCard ? cardRatioX * CARD_TILT_DEG : 0;

    // 距离（手柄命中优先于卡片命中）
    const handleDistance = isInHandleHotspot
      ? Math.hypot(flowPoint.x - center.x, flowPoint.y - center.y)
      : Infinity;
    const distance = isInHandleHotspot
      ? handleDistance
      : CARD_DISTANCE_BASE + Math.hypot(cardRatioX, cardRatioY);

    const result = {
      nodeId: node.id,
      connection,
      canConnect: connectable,
      handlePosition,
      handleCenter: center,
      handleFloatX,
      handleFloatY,
      cardTiltX,
      cardTiltY,
      showHandle: isInHandleHotspot, // 仅热区内显示加号
      isInCard,
      distance,
    };

    // 结果处理：有效连接优先，无效连接保留最近的
    if (!connectable) {
      if (!bestInvalid || distance < bestInvalid.distance) {
        bestInvalid = result;
      }
      continue;
    }
    if (!best || distance < best.distance) {
      best = result;
    }
  }

  return best || bestInvalid;
};
