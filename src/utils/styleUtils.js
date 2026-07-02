/**
 * 风格相关工具函数
 */
import useStyleStore from "@/store/styleStore";

/**
 * 获取节点最终生效风格
 * 优先级：节点独立配置 > 全局统一风格
 * @param {string} nodeId - 节点id
 * @returns {string|null} 最终生效的风格id，无则返回 null
 */
export const getNodeFinalStyle = (nodeId) => {
  return useStyleStore.getState().getNodeFinalStyle(nodeId);
};
