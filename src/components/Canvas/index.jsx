/**
 * Canvas 画布主组件
 */
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useRef } from "react";

import useCanvasStore, { validateConnection } from "@/store/canvasStore";
import ContextMenu from "./ContextMenu";
import { nodeTypes } from "./CustomNode";
import SideBar from "./SideBar";

/**
 * Canvas 内容组件 - 包含画布主体逻辑
 * 处理节点/边的交互、右键菜单、拖拽放置等事件
 */
const CanvasContent = () => {
  const reactFlowWrapper = useRef(null);
  const { screenToFlowPosition } = useReactFlow();

  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    addNode,
    undo,
    redo,
    canUndo,
    canRedo,
    clipboard,
    pasteNode,
    contextMenu,
    isSidebarOpen,
    toggleSidebar,
    setSelectedNode,
    clearSelection,
    saveHistory,
    showContextMenu,
    hideContextMenu,
    removeNode,
  } = useCanvasStore();

  /**
   * 处理节点连接事件，创建新的边并保存历史记录
   */
  const handleConnect = useCallback(
    (connection) => {
      const newEdge = {
        ...connection,
        id: `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: "default",
        animated: false,
        style: { stroke: "#434343", strokeWidth: 2 },
      };
      setEdges([...edges, newEdge]);
      saveHistory();
    },
    [edges, setEdges, saveHistory],
  );

  /**
   * 处理画布右键菜单，显示添加节点和粘贴选项
   */
  const handlePaneContextMenu = useCallback(
    (event) => {
      event.preventDefault();
      clearSelection();
      showContextMenu(event.clientX, event.clientY, "canvas", null);
    },
    [clearSelection, showContextMenu],
  );

  /**
   * 处理节点右键菜单，显示复制和删除选项
   */
  const handleNodeContextMenu = useCallback(
    (event, node) => {
      event.preventDefault();
      setSelectedNode(node.id);
      showContextMenu(event.clientX, event.clientY, "node", node.id);
    },
    [setSelectedNode, showContextMenu],
  );

  /**
   * 处理边右键菜单，显示删除连线选项
   */
  const handleEdgeContextMenu = useCallback(
    (event, edge) => {
      event.preventDefault();
      useCanvasStore.getState().setSelectedEdge(edge.id);
      showContextMenu(event.clientX, event.clientY, "edge", edge.id);
    },
    [showContextMenu],
  );

  /**
   * 点击画布空白处，清除选中状态并隐藏右键菜单
   */
  const handlePaneClick = useCallback(() => {
    clearSelection();
    hideContextMenu();
  }, [clearSelection, hideContextMenu]);

  /**
   * 节点拖拽结束时保存历史记录
   */
  const handleNodeDragStop = useCallback(
    (event, node) => {
      saveHistory();
    },
    [saveHistory],
  );

  /**
   * 在指定位置添加图片节点
   */
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
        data: {
          url: "https://picsum.photos/200/150?random=" + Date.now(),
          name: "New Image",
        },
      };
      addNode(newNode);
    },
    [screenToFlowPosition, addNode],
  );

  /**
   * 在指定位置添加视频节点
   */
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
        data: {
          url: "https://www.w3schools.com/html/mov_bbb.mp4",
          thumbnail: "https://picsum.photos/240/160?random=" + Date.now(),
          name: "New Video",
        },
      };
      addNode(newNode);
    },
    [screenToFlowPosition, addNode],
  );

  /**
   * 监听键盘快捷键：撤销(Cmd+Z)、重做(Cmd+Shift+Z)、复制(Cmd+C)、粘贴(Cmd+V)、删除(Delete)
   */
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;

      // Cmd/Ctrl + Z: 撤销
      if (cmdKey && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (canUndo()) {
          undo();
        }
      }

      // Cmd/Ctrl + Shift + Z: 重做
      if (cmdKey && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        if (canRedo()) {
          redo();
        }
      }

      // Cmd/Ctrl + Y: 重做 (Windows)
      if (cmdKey && e.key === "y") {
        e.preventDefault();
        if (canRedo()) {
          redo();
        }
      }

      // Cmd/Ctrl + V: 粘贴
      if (cmdKey && e.key === "v" && clipboard) {
        e.preventDefault();
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const position = screenToFlowPosition({ x: centerX, y: centerY });
        pasteNode(position);
      }

      // Delete/Backspace: 删除选中节点
      if (e.key === "Delete" || e.key === "Backspace") {
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
          return;
        }
        const { selectedNodeId } = useCanvasStore.getState();
        if (selectedNodeId) {
          removeNode(selectedNodeId);
        }
      }

      // Cmd/Ctrl + C: 复制
      if (cmdKey && e.key === "c") {
        const {
          selectedNodeId,
          nodes: currentNodes,
          copyNode,
        } = useCanvasStore.getState();
        if (selectedNodeId) {
          const node = currentNodes.find((n) => n.id === selectedNodeId);
          if (node) {
            copyNode(node);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
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

  /**
   * 拖拽悬停时设置复制效果
   */
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  /**
   * 处理拖拽放置，从侧边栏拖入素材时创建新节点
   */
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

  /**
   * 组件挂载时保存初始历史记录
   */
  useEffect(() => {
    saveHistory();
  }, []);

  /**
   * 连接验证回调 - 实现完整的连线规则校验
   */
  const isValidConnection = useCallback((connection) => {
    return validateConnection(connection, useCanvasStore.getState());
  }, []);

  return (
    <div
      ref={reactFlowWrapper}
      style={{
        width: "100vw",
        height: "100vh",
        background: "#0d0d0d",
        marginLeft: isSidebarOpen ? "280px" : "0",
        transition: "margin-left 0.3s ease",
      }}
    >
      {/* 侧边栏 */}
      <SideBar collapsed={!isSidebarOpen} onToggle={toggleSidebar} />

      {/* React Flow 画布 */}
      <div style={{ width: "100%", height: "100%" }}>
        <ReactFlow
          minZoom={0.5}
          maxZoom={3.0}
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={handleConnect}
          onPaneClick={handlePaneClick}
          onPaneContextMenu={handlePaneContextMenu}
          onNodeContextMenu={handleNodeContextMenu}
          onEdgeContextMenu={handleEdgeContextMenu}
          onNodeDragStop={handleNodeDragStop}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          nodeTypes={nodeTypes}
          isValidConnection={isValidConnection}
          fitView
          snapToGrid
          snapGrid={[15, 15]}
          defaultEdgeOptions={{
            type: "default",
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
          <Controls
            showZoom
            showFitView
            showInteractive={false}
            position="bottom-right"
            style={{
              background: "#1f1f1f",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
            }}
          />
          <MiniMap
            nodeColor={(node) => {
              switch (node.type) {
                case "image":
                  return "#1890ff";
                case "video":
                  return "#722ed1";
                default:
                  return "#434343";
              }
            }}
            maskColor="rgba(0, 0, 0, 0.5)"
            position="bottom-left"
            style={{
              background: "#1f1f1f",
              borderRadius: "8px",
            }}
          />
        </ReactFlow>
      </div>

      {/* 右键菜单 */}
      <ContextMenu onAddImage={handleAddImage} onAddVideo={handleAddVideo} />
    </div>
  );
};

/**
 * Canvas 主组件 - 使用 ReactFlowProvider 包裹以提供 ReactFlow 上下文
 */
const Canvas = () => {
  return (
    <ReactFlowProvider>
      <CanvasContent />
    </ReactFlowProvider>
  );
};

export default Canvas;
