/**
 * 边状态管理 Slice
 */
import { applyEdgeChanges } from '@xyflow/react'
import { generateId } from '@/utils/common'
import { canvasStorage } from '@/utils/canvasStorage'

/**
 * 保存当前画布状态到本地，并触发远程防抖保存
 */
const saveToLocalStorage = (getState) => {
  const state = getState();
  if (!state.canvasId) return;
  canvasStorage.save({
    canvasId: state.canvasId,
    canvasName: state.canvasName,
    globalStyle: state.globalStyle,
    nodes: state.nodes,
    edges: state.edges,
    viewport: state.viewport,
    groups: state.groups,
  });

  // 触发远程防抖保存
  const { triggerRemoteSave } = state;
  if (typeof triggerRemoteSave === 'function') {
    triggerRemoteSave();
  }
}

/**
 * 边 Slice 初始状态
 */
export const edgesInitialState = {
  edges: [],
  selectedEdgeId: null,
}

/**
 * 创建边 Slice
 * @param {object} getStore - 获取 store 的函数
 * @param {object} setStore - 设置 store 的函数
 * @returns {object} 边相关的 state 和 actions
 */
export const createEdgesSlice = (getStore, setStore) => ({
  /**
   * 设置边列表
   */
  setEdges: (edges) => setStore({ edges }),

  /**
   * 设置选中边
   */
  setSelectedEdge: (edgeId) =>
    setStore((state) => ({
      selectedEdgeId: edgeId,
      selectedNodeId: null,
      nodes: state.nodes.map((n) => ({ ...n, selected: false })),
      edges: state.edges.map((e) => ({ ...e, animated: false })),
    })),

  /**
   * 连线回调
   */
  onConnect: (params) => {
    const { saveHistory } = getStore()
    saveHistory()
    const newEdge = {
      id: generateId('edge'),
      ...params,
      type: 'smoothstep',
    }
    setStore((state) => ({ edges: [...state.edges, newEdge] }))
    // 立即保存到本地
    saveToLocalStorage(getStore)
    return newEdge
  },

  /**
   * 添加边
   */
  addEdge: (edge) => {
    const { saveHistory } = getStore()
    saveHistory()
    const newEdge = {
      id: generateId('edge'),
      ...edge,
    }
    setStore((state) => ({ edges: [...state.edges, newEdge] }))
    // 立即保存到本地
    saveToLocalStorage(getStore)
    return newEdge
  },

  /**
   * 更新边
   */
  updateEdge: (edgeId, updates) => {
    const { saveHistory } = getStore()
    saveHistory()
    setStore((state) => ({
      edges: state.edges.map((edge) =>
        edge.id === edgeId ? { ...edge, ...updates } : edge
      ),
    }))
    // 立即保存到本地
    saveToLocalStorage(getStore)
  },

  /**
   * 删除边
   */
  removeEdge: (edgeId) => {
    const { saveHistory, nodes, updateNodeData } = getStore();
    saveHistory();

    // 找到被删除的边，获取 source 和 target
    const edge = nodes.find((n) => n.id === edgeId) || {};

    setStore((state) => ({
      edges: state.edges.filter((edge) => edge.id !== edgeId),
    }));

    // 立即保存到本地
    saveToLocalStorage(getStore);
  },

  /**
   * 删除与指定源节点相关的边
   */
  removeEdgesBySourceNode: (sourceNodeId, targetNodeId) => {
    const { saveHistory, nodes, updateNodeData } = getStore();
    saveHistory();

    setStore((state) => ({
      edges: state.edges.filter(
        (edge) => !(edge.source === sourceNodeId && edge.target === targetNodeId)
      ),
    }));

    // 立即保存到本地
    saveToLocalStorage(getStore);
  },

  /**
   * 删除边 (别名)
   */
  deleteEdge: (edgeId) => {
    const { removeEdge } = getStore()
    removeEdge(edgeId)
  },

  /**
   * 边变化处理
   */
  onEdgesChange: (changes) => {
    const store = getStore();

    // 处理边删除时清除对应的上游媒体引用（从目标节点的 refAssetList 中移除）
    changes.forEach((change) => {
      if (change.type === "remove") {
        const edge = store.edges.find((e) => e.id === change.id);
        if (edge?.source && edge?.target) {
          // 获取源节点数据，找到对应的 URL
          const sourceNode = store.nodes.find((n) => n.id === edge.source);
          if (sourceNode?.data?.url) {
            // 从目标节点的 refAssetList 中移除对应 URL 的素材
            const targetNode = store.nodes.find((n) => n.id === edge.target);
            if (targetNode?.data?.refAssetList) {
              const updatedRefAssetList = targetNode.data.refAssetList.filter(
                (asset) => asset.url !== sourceNode.data.url
              );
              store.updateNodeData(edge.target, { refAssetList: updatedRefAssetList });
            }
          }
        }
      }
    });

    setStore((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
    }));
    // 立即保存到本地
    saveToLocalStorage(getStore);
  },
})
