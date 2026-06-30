/**
 * Canvas 画布状态管理
 */
import { create } from 'zustand'
import { applyNodeChanges, applyEdgeChanges } from '@xyflow/react'
import { generateId, deepClone } from '@/utils/common'

const HISTORY_LIMIT = 50

const useCanvasStore = create((set, get) => ({
  // 画布节点
  nodes: [],
  setNodes: (nodes) => set({ nodes }),

  // 画布边
  edges: [],
  setEdges: (edges) => set({ edges }),

  // 选中节点/边
  selectedNodeId: null,
  selectedEdgeId: null,
  setSelectedNode: (nodeId) => set({ selectedNodeId: nodeId, selectedEdgeId: null }),
  setSelectedEdge: (edgeId) => set({ selectedEdgeId: edgeId, selectedNodeId: null }),
  clearSelection: () => set({ selectedNodeId: null, selectedEdgeId: null }),

  // 画布视口
  viewport: { x: 0, y: 0, zoom: 1 },
  setViewport: (viewport) => set({ viewport }),

  // 画布信息
  canvasId: null,
  canvasName: '未命名画布',
  setCanvasId: (id) => set({ canvasId: id }),
  setCanvasName: (name) => set({ canvasName: name }),

  // 工具状态
  currentTool: 'select', // select | pan | text | image | ai
  setCurrentTool: (tool) => set({ currentTool: tool }),

  // UI 状态
  isSidebarOpen: true,
  isPreviewOpen: false,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  togglePreview: () => set((state) => ({ isPreviewOpen: !state.isPreviewOpen })),

  // 素材管理
  materials: {
    images: [
      { id: 'img1', name: 'Mountain', url: 'https://picsum.photos/200/150?random=1', type: 'image' },
      { id: 'img2', name: 'Ocean', url: 'https://picsum.photos/200/150?random=2', type: 'image' },
      { id: 'img3', name: 'Forest', url: 'https://picsum.photos/200/150?random=3', type: 'image' },
      { id: 'img4', name: 'City', url: 'https://picsum.photos/200/150?random=4', type: 'image' },
      { id: 'img5', name: 'Sunset', url: 'https://picsum.photos/200/150?random=5', type: 'image' },
      { id: 'img6', name: 'Snow', url: 'https://picsum.photos/200/150?random=6', type: 'image' },
    ],
    videos: [
      { id: 'vid1', name: 'Nature Video', url: 'https://www.w3schools.com/html/mov_bbb.mp4', type: 'video', thumbnail: 'https://picsum.photos/200/150?random=7' },
      { id: 'vid2', name: 'Tech Demo', url: 'https://www.w3schools.com/html/movie.mp4', type: 'video', thumbnail: 'https://picsum.photos/200/150?random=8' },
    ],
  },
  activeTab: 'images',
  searchQuery: '',
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  // 历史记录 (撤销/重做)
  history: [],
  historyIndex: -1,

  // 保存历史快照
  saveHistory: () => {
    const { nodes, edges, history, historyIndex } = get()
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push({ nodes: deepClone(nodes), edges: deepClone(edges) })
    if (newHistory.length > HISTORY_LIMIT) {
      newHistory.shift()
    }
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    })
  },

  // 撤销
  undo: () => {
    const { history, historyIndex } = get()
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1]
      set({
        nodes: deepClone(prevState.nodes),
        edges: deepClone(prevState.edges),
        historyIndex: historyIndex - 1,
      })
    }
  },

  // 重做
  redo: () => {
    const { history, historyIndex } = get()
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1]
      set({
        nodes: deepClone(nextState.nodes),
        edges: deepClone(nextState.edges),
        historyIndex: historyIndex + 1,
      })
    }
  },

  // 检查是否可以撤销/重做
  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  // 剪贴板
  clipboard: null,
  copyNode: (node) => {
    set({ clipboard: deepClone(node) })
  },
  pasteNode: (position = null) => {
    const { clipboard, addNode } = get()
    if (!clipboard) return null

    const newNode = {
      ...deepClone(clipboard),
      id: generateId('node'),
      position: position || {
        x: clipboard.position?.x + 50 || 100,
        y: clipboard.position?.y + 50 || 100,
      },
    }
    addNode(newNode)
    return newNode
  },
  clearClipboard: () => set({ clipboard: null }),

  // 上下文菜单
  contextMenu: {
    visible: false,
    x: 0,
    y: 0,
    target: null, // node | edge | canvas
    targetId: null,
  },
  showContextMenu: (x, y, target, targetId) => {
    set({
      contextMenu: {
        visible: true,
        x,
        y,
        target,
        targetId,
      },
    })
  },
  hideContextMenu: () => {
    set((state) => ({
      contextMenu: { ...state.contextMenu, visible: false },
    }))
  },

  // 节点操作
  addNode: (node) => {
    get().saveHistory()
    const newNode = {
      id: generateId('node'),
      ...node,
    }
    set({ nodes: [...get().nodes, newNode] })
    return newNode
  },

  updateNode: (nodeId, updates) => {
    get().saveHistory()
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId ? { ...node, ...updates } : node
      ),
    })
  },

  removeNode: (nodeId) => {
    get().saveHistory()
    set({
      nodes: get().nodes.filter((node) => node.id !== nodeId),
      edges: get().edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      ),
    })
  },

  // 删除节点 (别名)
  deleteNode: (nodeId) => {
    get().removeNode(nodeId)
  },

  // 节点变化处理
  onNodesChange: (changes) => {
    const { nodes } = get()
    set({ nodes: applyNodeChanges(changes, nodes) })
  },

  // 边变化处理
  onEdgesChange: (changes) => {
    const { edges } = get()
    set({ edges: applyEdgeChanges(changes, edges) })
  },

  // 边操作
  onConnect: (params) => {
    get().saveHistory()
    const newEdge = {
      id: generateId('edge'),
      ...params,
      type: 'smoothstep',
    }
    set({ edges: [...get().edges, newEdge] })
    return newEdge
  },

  addEdge: (edge) => {
    get().saveHistory()
    const newEdge = {
      id: generateId('edge'),
      ...edge,
    }
    set({ edges: [...get().edges, newEdge] })
    return newEdge
  },

  updateEdge: (edgeId, updates) => {
    get().saveHistory()
    set({
      edges: get().edges.map((edge) =>
        edge.id === edgeId ? { ...edge, ...updates } : edge
      ),
    })
  },

  removeEdge: (edgeId) => {
    get().saveHistory()
    set({ edges: get().edges.filter((edge) => edge.id !== edgeId) })
  },

  // 删除边 (别名)
  deleteEdge: (edgeId) => {
    get().removeEdge(edgeId)
  },

  // 批量更新
  setNodesAndEdges: (nodes, edges) => set({ nodes, edges }),

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
    })
  },
}))

export default useCanvasStore
