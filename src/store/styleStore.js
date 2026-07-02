/**
 * 风格状态管理 (Zustand Store)
 * 统一管理全局风格、节点独立风格、风格列表
 */
import { getStylePresetList } from "@/api/visual";
import { create } from "zustand";

const useStyleStore = create((set, get) => ({
  // ========== 状态 ==========
  styleListMap: {},         // 按 type 缓存：{ 'all': [...], '1': [...], '2': [...], '3': [...], '4': [...] }
  styleLoadedMap: {},       // 加载标记：{ 'all': true, '1': false, ... }
  styleLoading: false,
  globalStyle: null,
  nodeStyleMap: {},

  // ========== Actions ==========

  /**
   * 拉取风格列表（按 type 分缓存，同一个 type 只请求一次）
   * @param {number|null} type - 1=真人，2=2D，3=3D，4=自定义，null=全部
   */
  fetchStyleList: async (type = null) => {
    const cacheKey = type ?? 'all';
    const state = get();

    // 该 type 已加载过，不再重复请求
    if (state.styleLoadedMap[cacheKey]) return;

    set({ styleLoading: true });
    try {
      const res = await getStylePresetList(type);
      const list = Array.isArray(res) ? res : res?.data || [];
      set((s) => ({
        styleListMap: { ...s.styleListMap, [cacheKey]: list },
        styleLoadedMap: { ...s.styleLoadedMap, [cacheKey]: true },
        styleLoading: false,
      }));
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
}));

export default useStyleStore;
