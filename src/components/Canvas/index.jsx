import {
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import useCanvasStore, { validateConnection } from "@/store/canvasStore";
import CanvasHeader from "./CanvasHeader";
import ContextMenu from "./ContextMenu";
import CustomEdge from "./CustomEdge";
import { nodeTypes } from "./CustomNode";
import MagnetHandle from "./CustomPoint/MagnetHandle";
import { useConnectionMagnet } from "./CustomPoint/useConnectionMagnet";
import SideBar from "./SideBar";

import { getCanvasDetail } from "@/api";
import useStyleStore from "@/store/styleStore";
import { getNodeScreenPos } from "@/utils/canvasEditor";
import { isEditableElement } from "@/utils/dom";

const CanvasContent = () => {
  //自定义连线类型
  const edgeTypes = useMemo(
    () => ({
      custom: CustomEdge,
    }),
    [],
  );
  const { screenToFlowPosition } = useReactFlow();

  // 拖动前快照：记录本次拖动开始前，被拖节点是否已经打开了提示词框
  // draggedId: 当前正在拖动的节点id
  // wasActive: 拖动开始时该节点的浮窗是否已经是打开状态
  const dragSnapshotRef = useRef({ draggedId: null, wasActive: false });

  // 连接点磁吸交互（浮动加号手柄 / 卡片 3D 倾斜 / 可连反馈）
  const { onConnectStart, onConnectEnd, markNativeConnect } =
    useConnectionMagnet();

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    addNode,
    undo,
    redo,
    canUndo,
    canRedo,
    clipboard,
    pasteNode,
    isSidebarOpen,
    toggleSidebar,
    clearSelection,
    saveHistory,
    showContextMenu,
    hideContextMenu,
    hideActiveEditor,
    removeNode,
    // 设置拖动中的节点（拖动期间隐藏其浮窗）
    setDraggingNodeId,
    // 预加载模型参数
    loadModelSkuParams,
  } = useCanvasStore();

  const setGlobalStyle = useStyleStore((state) => state.setGlobalStyle);
  const fetchStyleList = useStyleStore((state) => state.fetchStyleList);

  // 画布挂载时加载所有风格分类 + 两种模型（用 ref 防止 StrictMode 重复调用）
  const loadRef = useRef(false);
  useEffect(() => {
    if (loadRef.current) return;
    loadRef.current = true;
    // 风格全量 + 各分类
    fetchStyleList(null);
    fetchStyleList(1);
    fetchStyleList(2);
    fetchStyleList(3);
    fetchStyleList(4);
    // 两种模型
    loadModelSkuParams("1");
    loadModelSkuParams("2");
  }, [loadModelSkuParams, fetchStyleList]);

  const [canvasName, setCanvasName] = useState("");

  // 加载画布详情（用 ref 防止 StrictMode 重复调用）
  const canvasDetailRef = useRef(false);
  useEffect(() => {
    if (canvasDetailRef.current) return;
    canvasDetailRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const canvasId = params.get("canvas_id");
    // 没有画布ID直接退出
    if (!canvasId) return;

    // 获取store全部方法
    const canvasStore = useCanvasStore.getState();

    // 先设置 canvasId（用于本地存储）
    canvasStore.setCanvasMeta({
      canvasId,
      canvasName: "加载中...",
      globalStyle: "",
    });

    // 立即检查并加载本地数据（无需等待网络）
    const localData = canvasStore.loadFromLocal();
    if (localData) {
      console.log("[Canvas] 从本地加载画布数据:", localData.nodes?.length, "个节点");
    }

    // 然后从网络获取最新元信息
    const loadCanvasDetail = async () => {
      try {
        const res = await getCanvasDetail({ canvas_id: canvasId });
        const detail = res;

        // 更新元信息（如果本地有数据，已在上面加载）
        canvasStore.setCanvasMeta({
          canvasId,
          canvasName: detail.canvas_name,
          globalStyle: String(detail.style_id),
        });
      } catch (err) {
        console.error("加载画布详情失败：", err);
        // 网络失败时，如果本地没有数据，画布名称保持"加载中..."
      }
    };

    loadCanvasDetail();
  }, []);

  // 页面初始化完成后启用自动保存
  const initCompleteRef = useRef(false);
  useEffect(() => {
    if (initCompleteRef.current) return;
    initCompleteRef.current = true;

    // 延迟启用，确保所有初始化数据加载完成
    setTimeout(() => {
      const canvasStore = useCanvasStore.getState();
      const canvasId = new URLSearchParams(window.location.search).get("canvas_id");
      if (canvasId) {
        canvasStore.enableAutoSave?.();
        console.log("[Canvas] 自动保存已启用");
      }
    }, 1000);
  }, []);
  const handleConnect = useCallback(
    (connection) => {
      // 标记原生（精确落在手柄）连线已处理，避免磁吸重复建边
      markNativeConnect();

      // 获取源节点和目标节点的数据
      const { source, target } = connection;
      // 使用 getState() 获取最新的节点数据，避免闭包 stale 问题
      const latestNodes = useCanvasStore.getState().nodes;
      const sourceNode = latestNodes.find((n) => n.id === source);
      const isMediaNode =
        sourceNode &&
        ["video", "image", "upload"].includes(sourceNode.type);

      // 如果源节点是媒体节点，将素材存入目标节点的 refAssetList
      if (isMediaNode && sourceNode?.data) {
        const mediaAsset = {
          id: `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: sourceNode.type,
          url: sourceNode.data.url || "",
          thumbnail: sourceNode.data.thumbnail || sourceNode.data.url || "",
          name: sourceNode.data.name || "",
          sourceNodeId: source,
        };

        console.log("[handleConnect] 保存上游媒体到目标节点:", mediaAsset);

        // 只有有实际 URL 的才保存
        if (mediaAsset.url) {
          // 获取目标节点当前的 refAssetList
          const targetNode = latestNodes.find((n) => n.id === target);
          const currentRefAssetList = targetNode?.data?.refAssetList || [];

          // 检查是否已存在相同 URL 的素材（防止重复添加）
          const isDuplicate = currentRefAssetList.some(
            (asset) => asset.url === mediaAsset.url
          );

          if (!isDuplicate) {
            const updatedRefAssetList = [...currentRefAssetList, mediaAsset];
            // 直接更新目标节点的 data
            useCanvasStore.getState().updateNodeData(target, {
              refAssetList: updatedRefAssetList,
            });
          }
        }
      }

      const newEdge = {
        ...connection,
        id: `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: "custom",
        animated: false,
        style: { stroke: "#434343", strokeWidth: 2 },
      };
      useCanvasStore.getState().setEdges([...edges, newEdge]);
      saveHistory();
    },
    [edges, saveHistory, markNativeConnect],
  );

  const handlePaneContextMenu = useCallback(
    (event) => {
      event.preventDefault();
      clearSelection();
      showContextMenu(event.clientX, event.clientY, "canvas", null);
    },
    [clearSelection, showContextMenu],
  );

  const handleNodeContextMenu = useCallback(
    (event, node) => {
      event.preventDefault();
      useCanvasStore.getState().setSelectedNode(node.id);
      showContextMenu(event.clientX, event.clientY, "node", node.id);
    },
    [showContextMenu],
  );

  const handleEdgeContextMenu = useCallback(
    (event, edge) => {
      event.preventDefault();
      useCanvasStore.getState().setSelectedEdge(edge.id);
      showContextMenu(event.clientX, event.clientY, "edge", edge.id);
    },
    [showContextMenu],
  );

  const handlePaneClick = useCallback(() => {
    clearSelection();
    hideContextMenu();
    hideActiveEditor();
  }, [clearSelection, hideContextMenu, hideActiveEditor]);

  const handleNodeDragStart = useCallback(
    (_event, node) => {
      const store = useCanvasStore.getState();
      const wasActive =
        store.activeNodeId === node.id && !!store.nodeEditors[node.id]?.visible;

      // 快照写入：拖动结束后用于决定「恢复显示 vs 首次打开」
      dragSnapshotRef.current = { draggedId: node.id, wasActive };

      // 标记全局 drag 状态：节点组件与 FloatingEditor 据此隐藏自身
      setDraggingNodeId(node.id);
      document.body.style.cursor = "grabbing";
    },
    [setDraggingNodeId],
  );

  const handleNodeDragStop = useCallback(
    (_event, node) => {
      const { draggedId, wasActive } = dragSnapshotRef.current;
      const store = useCanvasStore.getState();

      // 退出拖动态：节点组件和 FloatingEditor 重新可见
      setDraggingNodeId(null);
      document.body.style.cursor = "";

      saveHistory();

      // 仅当真在被拖的是本次记录的那个节点时才执行后续逻辑（防止 React Flow
      // 短时间内多次触发 start/stop 导致状态错位）
      if (draggedId === node.id && !wasActive) {
        // 拖动前浮窗没打开 → 拖动结束即自动打开（拖动 = 用户想用该节点）
        const viewport = store.viewport;
        const pos = getNodeScreenPos(node, viewport);
        const nodeData =
          store.nodes.find((item) => item.id === node.id)?.data || {};

        useCanvasStore.setState((state) => ({
          activeNodeId: node.id,
          nodeEditors: {
            ...state.nodeEditors,
            [node.id]: {
              visible: true,
              nodeType: node.type,
              position: pos,
              data: nodeData,
            },
          },
          panelPos: pos,
        }));
      }
      // wasActive 为 true：浮窗在拖动期间被隐藏，松手后 FloatingEditor
      // 自身的 opacity 会随 draggingNodeId 复位自动恢复显示，无需额外动作。

      dragSnapshotRef.current = { draggedId: null, wasActive: false };
    },
    [saveHistory, setDraggingNodeId],
  );

  const handleNodeClick = useCallback(
    (_event, node) => {
      const store = useCanvasStore.getState();

      // 已打开：再次点击同一个节点 → 关闭
      if (store.activeNodeId === node.id && store.nodeEditors[node.id]?.visible) {
        store.hideActiveEditor(node.id);
        return;
      }

      // 切换 / 新打开：写入或覆盖 nodeEditors[node.id]
      const viewport = store.viewport;
      const pos = getNodeScreenPos(node, viewport);
      const nodeData = store.nodes.find((item) => item.id === node.id)?.data || {};

      useCanvasStore.setState((state) => ({
        activeNodeId: node.id,
        nodeEditors: {
          ...state.nodeEditors,
          [node.id]: {
            visible: true,
            nodeType: node.type,
            position: pos,
            data: nodeData,
          },
        },
        panelPos: pos,
      }));
    },
    [],
  );

  const handleNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);

      // 浮窗跟随节点拖动：只有当前激活节点移动时才同步位置
      // 浮窗的打开/关闭统一由 handleNodeClick 负责，避免与 select change 重复触发导致状态错乱
      changes.forEach((change) => {
        if (change.type === "position" && change.position) {
          const store = useCanvasStore.getState();
          if (store.activeNodeId === change.id) {
            const viewport = store.viewport;
            const pos = getNodeScreenPos({ ...change, data: {} }, viewport);
            store.setNodeEditorPosition(change.id, pos);
          }
        }
      });
    },
    [onNodesChange],
  );

  const handleAddImage = useCallback(
    (menuPos) => {
      const position = screenToFlowPosition({
        x: menuPos.x,
        y: menuPos.y,
      });
      const newNode = {
        id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: "image",
        position,
        data: { model_type: "2" },
      };
      addNode(newNode);
    },
    [screenToFlowPosition, addNode],
  );

  const handleAddVideo = useCallback(
    (menuPos) => {
      const position = screenToFlowPosition({
        x: menuPos.x,
        y: menuPos.y,
      });
      const newNode = {
        id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: "video",
        position,
        data: { model_type: "1" },
      };
      addNode(newNode);
    },
    [screenToFlowPosition, addNode],
  );

  const handleAddUpload = useCallback(
    (menuPos) => {
      const position = screenToFlowPosition({
        x: menuPos.x,
        y: menuPos.y,
      });
      const newNode = {
        id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: "upload",
        position,
        data: menuPos.file ? { pendingFile: menuPos.file } : {},
      };
      addNode(newNode);
    },
    [screenToFlowPosition, addNode],
  );

  useEffect(() => {
    const handleKeyDown = (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;

      if (cmdKey && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (canUndo()) undo();
      }
      if (cmdKey && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        if (canRedo()) redo();
      }
      if (cmdKey && e.key === "y") {
        e.preventDefault();
        if (canRedo()) redo();
      }
      if (cmdKey && e.key === "v" && clipboard) {
        e.preventDefault();
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const position = screenToFlowPosition({ x: centerX, y: centerY });
        pasteNode(position);
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        // 防止误触：输入框 / Ant 弹层 / contenteditable 内部应自行消费按键
        if (isEditableElement(e.target)) return;
        const { selectedNodeId } = useCanvasStore.getState();
        if (selectedNodeId) removeNode(selectedNodeId);
      }
      // Esc 关闭当前打开的浮窗
      if (e.key === "Escape") {
        const { activeNodeId, hideActiveEditor } = useCanvasStore.getState();
        if (activeNodeId) {
          hideActiveEditor(activeNodeId);
          e.preventDefault();
        }
      }
      if (cmdKey && e.key === "c") {
        const {
          selectedNodeId,
          nodes: currentNodes,
          copyNode,
        } = useCanvasStore.getState();
        if (selectedNodeId) {
          const node = currentNodes.find((n) => n.id === selectedNodeId);
          if (node) copyNode(node);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    undo,
    redo,
    canUndo,
    canRedo,
    clipboard,
    pasteNode,
    screenToFlowPosition,
    removeNode,
  ]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      const data = e.dataTransfer.getData("application/json");
      if (!data) return;

      try {
        const item = JSON.parse(data);
        const position = screenToFlowPosition({
          x: e.clientX,
          y: e.clientY,
        });
        const newNode = {
          id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: item.type || "image",
          position,
          data: {
            url: item.url,
            thumbnail: item.thumbnail,
            name: item.name,
          },
        };
        addNode(newNode);
      } catch (err) {
        console.error("Failed to parse drop data:", err);
      }
    },
    [screenToFlowPosition, addNode],
  );

  useEffect(() => {
    saveHistory();
  }, [saveHistory]);

  const isValidConnection = useCallback((connection) => {
    return validateConnection(connection, useCanvasStore.getState());
  }, []);

  const flowWrapperStyle = useMemo(
    () => ({
      width: "100%",
      height: "100%",
      marginLeft: isSidebarOpen ? "280px" : "0",
      transition: "margin-left 0.3s ease",
    }),
    [isSidebarOpen],
  );

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#0d0d0d",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <SideBar collapsed={!isSidebarOpen} onToggle={toggleSidebar} />
      <CanvasHeader canvasName={canvasName} />

      <div style={flowWrapperStyle}>
        <ReactFlow
          edgeTypes={edgeTypes}
          minZoom={0.5}
          maxZoom={3.0}
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={handleConnect}
          onConnectStart={onConnectStart}
          onConnectEnd={onConnectEnd}
          onPaneClick={handlePaneClick}
          onPaneContextMenu={handlePaneContextMenu}
          onNodeContextMenu={handleNodeContextMenu}
          onEdgeContextMenu={handleEdgeContextMenu}
          onNodeDragStart={handleNodeDragStart}
          onNodeDragStop={handleNodeDragStop}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onNodeClick={handleNodeClick}
          nodeTypes={nodeTypes}
          isValidConnection={isValidConnection}
          snapToGrid
          snapGrid={[15, 15]}
          defaultEdgeOptions={{
            type: "custom",
            animated: false,
            style: { stroke: "#434343", strokeWidth: 2 },
          }}
          deleteKeyCode={null}
          selectionKeyCode={["Shift"]}
          multiSelectionKeyCode={["Meta", "Ctrl"]}
          panOnScroll
          proOptions={{ hideAttribution: true }}
          style={{
            background: "#0d0d0d",
          }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={2}
            color="rgba(255, 255, 255, 0.08)"
          />
        </ReactFlow>
      </div>

      <MagnetHandle />

      <ContextMenu onAddImage={handleAddImage} onAddVideo={handleAddVideo} onAddUpload={handleAddUpload} />
    </div>
  );
};

const Canvas = () => (
  <ReactFlowProvider>
    <CanvasContent />
  </ReactFlowProvider>
);

export default Canvas;
