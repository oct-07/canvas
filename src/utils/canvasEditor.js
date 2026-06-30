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
 * @returns {{left:number, top:number}}
 */
export function getNodeScreenPos(node, viewport) {
  const screenLeftTop = flowToScreen(node.position.x, node.position.y, viewport);
  return {
    left: screenLeftTop.left,
    top: screenLeftTop.top + 150,
  };
}
