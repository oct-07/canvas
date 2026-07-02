/**
 * 风格状态管理 (Zustand Store)
 * 统一管理全局风格、节点独立风格、风格列表
 */
import { getStylePresetList } from "@/api/visual";
import { create } from "zustand";

const useStyleStore = create((set, get) => ({
  // ========== 状态 ==========
  styleList: [], // 风格数组（接口返回的完整列表）
  styleLoading: false, // 风格列表加载状态
  globalStyle: null, // 全局选中风格id（null表示未选中）
  nodeStyleMap: {}, // Record<nodeId, styleId>，仅存储和全局不一致的节点

  // ========== Actions ==========

  /**
   * 拉取风格列表
   * @param {number|null} type - 分类类型：1=真人，2=2D，3=3D，4=自定义，不传/null=全部
   */
  fetchStyleList: async (type = null) => {
    set({ styleLoading: true });
    try {
      const res = await getStylePresetList(type);
      const list = Array.isArray(res) ? res : res?.data || [];
      set({ styleList: list, styleLoading: false });
    } catch (err) {
      console.error("获取风格列表失败：", err);
      set({ styleLoading: false });
    }
  },

  /**
   * 设置全局风格，同时清空 nodeStyleMap
   */
  setGlobalStyle: (styleId) => {
    set({
      globalStyle: styleId,
      nodeStyleMap: {}, // 全局切换后重置所有节点映射
    });
  },

  /**
   * 节点设置风格
   * - styleId 和全局相等时，删除节点映射记录（自动跟随全局）
   * - styleId 和全局不等时，存储到 nodeStyleMap
   */
  setNodeStyle: (nodeId, styleId) => {
    const { globalStyle } = get();
    set((state) => {
      const newMap = { ...state.nodeStyleMap };

      if (styleId === globalStyle) {
        // 与全局相同，删除映射记录
        delete newMap[nodeId];
      } else {
        // 与全局不同，存储独立配置
        newMap[nodeId] = styleId;
      }

      return { nodeStyleMap: newMap };
    });
  },

  /**
   * 返回节点最终生效风格id
   * 优先级：节点独立配置 > 全局统一风格
   */
  getNodeFinalStyle: (nodeId) => {
    const { globalStyle, nodeStyleMap } = get();
    // 节点有独立配置时使用节点配置，否则使用全局配置
    if (nodeStyleMap[nodeId] !== undefined) {
      return nodeStyleMap[nodeId];
    }
    return globalStyle;
  },

  /**
   * 新增风格后调用，重新拉取全部列表
   */
  refreshStyleList: async () => {
    // 不传参数，默认拉取全部
    await get().fetchStyleList();
  },
}));

export default useStyleStore;
