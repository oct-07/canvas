/**
 * 节点画布全局悬浮编辑面板：坐标转换与面板绑定工具
 */

/**
 * 将世界坐标转换为浏览器屏幕像素坐标
 * @param {number} worldX - 世界坐标系 X
 * @param {number} worldY - 世界坐标系 Y
 * @param {{x:number, y:number, scale:number}} viewport - 视口变换参数
 * @returns {{left:number, top:number}}
 */
export function flowToScreen(worldX, worldY, viewport) {
  const { x, y, zoom } = viewport;
  return {
    left: worldX * zoom + x,
    top: worldY * zoom + y,
  };
}

/**
 * 计算节点底部在屏幕上的绝对坐标，用于 fixed 面板定位
 * @param {{position:{x:number, y:number}}} node
 * @param {{x:number, y:number, scale:number}} viewport
 * @param {number} nodeHeight - 节点渲染高度（px）
 * @returns {{left:number, top:number}}
 */
export function getNodeScreenPos(node, viewport, nodeHeight = 0) {
  const screenLeftTop = flowToScreen(node.position.x, node.position.y, viewport);
  return {
    left: screenLeftTop.left,
    top: screenLeftTop.top + nodeHeight,
  };
}

/**
 * 计算 FloatingEditor 的最终定位，附带视口边界避让
 * @param {number} anchorLeft - 锚点（节点左边缘）屏幕 X
 * @param {number} anchorTop  - 锚点（节点底部 + marginTop）屏幕 Y
 * @param {number} floatingWidth  - 浮窗宽度（px）
 * @param {number} floatingHeight - 浮窗高度（px）
 * @param {number} marginGap - 锚点与浮窗间距，默认 8px
 * @returns {{left:number, top:number, placement:string}}
 * placement: 'bottom' | 'top' | 'left' — 标识最终朝向
 */
export function calculateFloatingPosition(
  anchorLeft,
  anchorTop,
  floatingWidth,
  floatingHeight,
  marginGap = 8
) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // 默认：浮窗在节点下方水平居中
  const defaultLeft = anchorLeft - floatingWidth / 2;
  const defaultTop = anchorTop + marginGap;

  // 尝试放在下方 → 检查右/下边界
  const fitsBottom = defaultLeft >= 0
    && defaultLeft + floatingWidth <= viewportWidth
    && defaultTop + floatingHeight <= viewportHeight;

  if (fitsBottom) {
    return { left: defaultLeft, top: defaultTop, placement: "bottom" };
  }

  // 尝试翻转到上方
  const flipTopLeft = anchorLeft - floatingWidth / 2;
  const flipTopTop = anchorTop - floatingHeight - marginGap;
  const fitsTop = flipTopLeft >= 0
    && flipTopLeft + floatingWidth <= viewportWidth
    && flipTopTop >= 0;

  if (fitsTop) {
    return { left: flipTopLeft, top: flipTopTop, placement: "top" };
  }

  // 尝试放在左侧（垂直居中于锚点）
  const flipLeftLeft = anchorLeft - floatingWidth - marginGap;
  const flipLeftTop = anchorTop - floatingHeight / 2;
  const fitsLeft = flipLeftLeft >= 0
    && flipLeftTop >= 0
    && flipLeftTop + floatingHeight <= viewportHeight;

  if (fitsLeft) {
    return { left: flipLeftLeft, top: flipLeftTop, placement: "left" };
  }

  // 四面都放不下：回退到默认下方定位，但做水平裁剪
  return {
    left: Math.max(0, Math.min(defaultLeft, viewportWidth - floatingWidth)),
    top: defaultTop,
    placement: "bottom",
  };
}
