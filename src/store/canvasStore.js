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
import { createWsSlice, wsInitialState } from "./slices/wsSlice";
// 导入模型接口
import { getModelSku } from "@/api";
// 导入本地持久化管理
import { canvasStorage } from "@/utils/canvasStorage";

// 合并所有初始状态
const initialState = {
  ...nodesInitialState,
  ...edgesInitialState,
  ...uiInitialState,
  ...historyInitialState,
  ...clipboardInitialState,
  ...materialsInitialState,
  ...canvasInitialState,
  ...wsInitialState,

  // ========== 模型相关状态 ==========
  modelListMap: {},         // 按 model_type 分缓存：{ '1': [...], '2': [...] }
  modelParamLoadedMap: {},  // 加载标记：{ '1': true, '2': false }
};

// 是否启用自动保存（页面初始化完成前不应触发）
let autoSaveEnabled = false;

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
  const store = {
    ...initialState,

    // 批量更新
    setNodesAndEdges: (nodes, edges) => set({ nodes, edges }),

    // 清空选中（同时隐藏连线悬停删除图标）
    clearSelection: () =>
      set((state) => ({
        selectedNodeId: null,
        selectedEdgeId: null,
        hoverDeleteEdgeId: null,
        nodes: state.nodes.map((n) => ({ ...n, selected: false })),
        edges: state.edges.map((e) => ({ ...e, animated: false })),
      })),

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
        modelListMap: {},
        modelParamLoadedMap: {},
        // 重置 WS 任务映射，避免老任务终态误派发到新画布
        taskMap: {},
        nodeMap: {},
      });
    },

    // ========== 模型相关方法 ==========
    // 加载模型参数（按 model_type 分缓存）
    loadModelSkuParams: async (modelType = "1") => {
      const state = get();
      const cacheKey = String(modelType);

      // 该 model_type 已加载过，不再请求
      if (state.modelParamLoadedMap[cacheKey]) return;

      try {
        const res = await getModelSku({ model_type: modelType });
        set((s) => ({
          modelListMap: { ...s.modelListMap, [cacheKey]: res },
          modelParamLoadedMap: { ...s.modelParamLoadedMap, [cacheKey]: true },
        }));
      } catch (err) {
        console.error("预加载模型接口失败：", err);
      }
    },

    // 重置缓存，切换画布/清空场景时调用
    clearModelParamCache: () => {
      set({
        modelListMap: {},
        modelParamLoadedMap: {},
      });
    },

    // ========== 自动保存控制 ==========
    // 启用自动保存（页面初始化完成后调用）
    enableAutoSave: () => {
      autoSaveEnabled = true;
    },
    // 禁用自动保存
    disableAutoSave: () => {
      autoSaveEnabled = false;
    },

    // 组合所有 slice 的 actions
    //节点操作
    ...createNodesSlice(getStore, setStore),
    //连线操作
    ...createEdgesSlice(getStore, setStore),
    // UI 界面控制
    ...createUISlice(getStore, setStore),
    // 撤销重做
    ...createHistorySlice(getStore, setStore),
    //复制粘贴
    ...createClipboardSlice(getStore, setStore),
    //素材管理
    ...createMaterialsSlice(getStore, setStore),
    //画布底层
    ...createCanvasSlice(getStore, setStore),
    //WS 任务分发（依赖 nodesSlice 的 updateNodeData，写回节点 data）
    ...createWsSlice(
      setStore,
      getStore,
      (nodeId, payload) => getStore().updateNodeData(nodeId, payload),
    ),
  };

  return store;
});

// ===================== 页面离开保存 =====================
// 页面关闭/刷新前触发保存
const handleBeforeUnload = (e) => {
  const state = useCanvasStore.getState();
  if (!state.canvasId) return;

  // 调用 flushRemoteSave 会立即保存当前画布
  const slice = createCanvasSlice(
    () => useCanvasStore.getState(),
    (updater) => {
      if (typeof updater === 'function') {
        useCanvasStore.setState(updater);
      } else {
        useCanvasStore.setState(updater);
      }
    }
  );
  slice.flushRemoteSave();

  // 尝试同步保存到本地（localStorage 是同步的）
  const canvasId = state.canvasId;
  const { canvasName, globalStyle, nodes, edges, viewport } = state;
  canvasStorage.save({
    canvasId,
    canvasName,
    globalStyle,
    nodes,
    edges,
    viewport,
  });
};

window.addEventListener('beforeunload', handleBeforeUnload);

// ===================== 自动保存订阅 =====================
// 订阅 nodes 和 edges 变化，自动保存到本地（防抖，作为双重保障）
let autoSaveTimer = null;

const triggerAutoSave = () => {
  if (!autoSaveEnabled) return;
  if (autoSaveTimer) return; // 已有待执行的定时器

  autoSaveTimer = setTimeout(() => {
    autoSaveTimer = null;
    const state = useCanvasStore.getState();
    if (!state.canvasId) return;

    // 直接调用 canvasSlice 的保存方法
    const slice = createCanvasSlice(
      () => useCanvasStore.getState(),
      (updater) => {
        if (typeof updater === 'function') {
          useCanvasStore.setState(updater);
        } else {
          useCanvasStore.setState(updater);
        }
      }
    );
    slice.saveToLocal();
  }, 1000); // 订阅保存延迟更长，避免与直接保存冲突
};

useCanvasStore.subscribe(
  (state) => state.nodes,
  () => {
    triggerAutoSave();
  }
);

useCanvasStore.subscribe(
  (state) => state.edges,
  () => {
    triggerAutoSave();
  }
);

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

