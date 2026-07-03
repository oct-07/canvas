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

const CanvasContent = () => {
  //自定义连线类型
  const edgeTypes = useMemo(
    () => ({
      custom: CustomEdge,
    }),
    [],
  );
  const { screenToFlowPosition } = useReactFlow();
  const draggedNodeIdRef = useRef(null);

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

    const loadCanvasDetail = async () => {
      try {
        const res = await getCanvasDetail({ canvas_id: canvasId });
        const detail = res;

        canvasStore.setCanvasMeta({
          canvasId,
          canvasName: detail.canvas_name,
          globalStyle: String(detail.style_id),
        });
      } catch (err) {
        console.error("加载画布详情失败：", err);
      }
    };

    loadCanvasDetail();
  }, []);
  const handleConnect = useCallback(
    (connection) => {
      // 标记原生（精确落在手柄）连线已处理，避免磁吸重复建边
      markNativeConnect();
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

  const handleNodeDragStart = useCallback((_event, node) => {
    draggedNodeIdRef.current = node.id;
  }, []);

  const handleNodeDragStop = useCallback(
    (_event, node) => {
      saveHistory();
      if (draggedNodeIdRef.current === node.id) {
        draggedNodeIdRef.current = null;
      }
    },
    [saveHistory],
  );

  const handleNodeClick = useCallback(
    (_event, node) => {
      const store = useCanvasStore.getState();
      const editor = store.nodeEditors[node.id];
      if (editor?.visible) {
        store.hideActiveEditor(node.id);
        return;
      }

      clearSelection();

      const viewport = useCanvasStore.getState().viewport;
      const pos = getNodeScreenPos(node, viewport);
      const nodeData = nodes.find((item) => item.id === node.id)?.data || {};

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
    [clearSelection, nodes],
  );

  const handleNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);

      changes.forEach((change) => {
        if (change.type === "select" && change.selected) {
          const store = useCanvasStore.getState();
          const node = store.nodes.find((item) => item.id === change.id);
          if (!node) return;

          const viewport = store.viewport;
          const pos = getNodeScreenPos(node, viewport);
          const nodeData = node.data || {};

          useCanvasStore.setState((state) => ({
            activeNodeId: change.id,
            nodeEditors: {
              ...state.nodeEditors,
              [change.id]: {
                visible: true,
                nodeType: "image",
                position: pos,
                data: nodeData,
              },
            },
            panelPos: pos,
          }));
        }

        if (change.type === "select" && !change.selected) {
          useCanvasStore.getState().hideActiveEditor(change.id);
          useCanvasStore.getState().setActiveNodeId(null);
        }

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
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
          return;
        }
        const { selectedNodeId } = useCanvasStore.getState();
        if (selectedNodeId) removeNode(selectedNodeId);
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

      <ContextMenu onAddImage={handleAddImage} onAddVideo={handleAddVideo} />
    </div>
  );
};

const Canvas = () => (
  <ReactFlowProvider>
    <CanvasContent />
  </ReactFlowProvider>
);

export default Canvas;
