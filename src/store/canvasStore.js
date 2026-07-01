/**
 * Canvas 画布状态管理 (Zustand Store)
 * 采用 slice 模式拆分管理不同职责的状态
 */
import { create } from "zustand";
// 导入各 slice
import { canvasInitialState, createCanvasSlice } from "./slices/canvasSlice";
import {
  clipboardInitialState,
  createClipboardSlice,
} from "./slices/clipboardSlice";
import { createEdgesSlice, edgesInitialState } from "./slices/edgesSlice";
import { createHistorySlice, historyInitialState } from "./slices/historySlice";
import {
  createMaterialsSlice,
  materialsInitialState,
} from "./slices/materialsSlice";
import { createNodesSlice, nodesInitialState } from "./slices/nodesSlice";
import { createUISlice, uiInitialState } from "./slices/uiSlice";
// 导入模型接口
import { getModelSku } from "@/api";

// 合并所有初始状态
const initialState = {
  ...nodesInitialState,
  ...edgesInitialState,
  ...uiInitialState,
  ...historyInitialState,
  ...clipboardInitialState,
  ...materialsInitialState,
  ...canvasInitialState,

  // ========== 模型相关状态 ==========
  modelList: [], // 全部模型数组（下拉菜单数据源，接口完整返回值）
  modelParamLoaded: false, // 接口是否已加载标记
  currentSelectModel: null, // 当前选中的完整模型对象
};

/**
 * Canvas 画布 Store
 */
const useCanvasStore = create((set, get) => {
  // 创建 store 访问器
  const getStore = () => get();
  const setStore = (updater) => {
    if (typeof updater === "function") {
      set(updater);
    } else {
      set(updater);
    }
  };

  // 合并所有 slice + 新增模型参数方法
  return {
    ...initialState,

    // 批量更新
    setNodesAndEdges: (nodes, edges) => set({ nodes, edges }),

    // 清空选中
    clearSelection: () => set({ selectedNodeId: null, selectedEdgeId: null }),

    // 重置画布
    resetCanvas: () => {
      set({
        nodes: [],
        edges: [],
        selectedNodeId: null,
        selectedEdgeId: null,
        viewport: { x: 0, y: 0, zoom: 1 },
        contextMenu: {
          visible: false,
          x: 0,
          y: 0,
          target: null,
          targetId: null,
        },
        history: [],
        historyIndex: -1,
        clipboard: null,
        // 重置模型相关缓存
        modelList: [],
        modelParamLoaded: false,
        currentSelectModel: null,
      });
    },

    // ========== 模型相关方法 ==========
    // 加载模型参数
    loadModelSkuParams: async () => {
      const state = get();
      if (state.modelParamLoaded) return;
      try {
        const res = await getModelSku({ model_type: "1" });
        set({
          modelList: res,
          modelParamLoaded: true,
        });
      } catch (err) {
        console.error("预加载模型接口失败：", err);
      }
    },

    // 设置当前选中模型
    setCurrentSelectModel: (modelItem) => {
      set({ currentSelectModel: modelItem });
    },

    // 重置缓存，切换画布/清空场景时调用
    clearModelParamCache: () => {
      set({
        modelList: [],
        modelParamLoaded: false,
        currentSelectModel: null,
      });
    },

    // 组合所有 slice 的 actions
    ...createNodesSlice(getStore, setStore),
    ...createEdgesSlice(getStore, setStore),
    ...createUISlice(getStore, setStore),
    ...createHistorySlice(getStore, setStore),
    ...createClipboardSlice(getStore, setStore),
    ...createMaterialsSlice(getStore, setStore),
    ...createCanvasSlice(getStore, setStore),
  };
});

// 导出
export default useCanvasStore;
export { useCanvasStore };

// 导出验证函数
  export {
    DATA_TYPE_COMPATIBILITY,
    DATA_TYPES,
    getNodeDataType,
    isDataTypeCompatible
  } from "./constants/dataTypes";
  export { getNodePortInfo, validateConnection } from "./validators/connection";

