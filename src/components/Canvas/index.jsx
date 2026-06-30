/**
 * Canvas 画布主组件
 */
import React, { useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import useCanvasStore from '@/store/canvasStore';
import { nodeTypes } from './CustomNode';
import ContextMenu from './ContextMenu';
import ToolBar from './ToolBar';
import SideBar from './SideBar';

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

  // 连接边
  const handleConnect = useCallback(
    (connection) => {
      const newEdge = {
        ...connection,
        id: `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'smoothstep',
        animated: false,
        style: { stroke: '#434343', strokeWidth: 2 },
      };
      setEdges([...edges, newEdge]);
      saveHistory();
    },
    [edges, setEdges, saveHistory]
  );

  // 右键菜单 - 画布
  const handlePaneContextMenu = useCallback(
    (event) => {
      event.preventDefault();
      clearSelection();
      showContextMenu(event.clientX, event.clientY, 'canvas', null);
    },
    [clearSelection, showContextMenu]
  );

  // 右键菜单 - 节点
  const handleNodeContextMenu = useCallback(
    (event, node) => {
      event.preventDefault();
      setSelectedNode(node.id);
      showContextMenu(event.clientX, event.clientY, 'node', node.id);
    },
    [setSelectedNode, showContextMenu]
  );

  // 右键菜单 - 边
  const handleEdgeContextMenu = useCallback(
    (event, edge) => {
      event.preventDefault();
      useCanvasStore.getState().setSelectedEdge(edge.id);
      showContextMenu(event.clientX, event.clientY, 'edge', edge.id);
    },
    [showContextMenu]
  );

  // 点击画布空白处
  const handlePaneClick = useCallback(() => {
    clearSelection();
    hideContextMenu();
  }, [clearSelection, hideContextMenu]);

  // 节点拖拽结束
  const handleNodeDragStop = useCallback(
    (event, node) => {
      saveHistory();
    },
    [saveHistory]
  );

  // 添加图片节点
  const handleAddImage = useCallback(
    (menuPos) => {
      const position = screenToFlowPosition({
        x: menuPos.x,
        y: menuPos.y,
      });
      const newNode = {
        id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'image',
        position,
        data: {
          url: 'https://picsum.photos/200/150?random=' + Date.now(),
          name: 'New Image',
        },
      };
      addNode(newNode);
    },
    [screenToFlowPosition, addNode]
  );

  // 添加视频节点
  const handleAddVideo = useCallback(
    (menuPos) => {
      const position = screenToFlowPosition({
        x: menuPos.x,
        y: menuPos.y,
      });
      const newNode = {
        id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'video',
        position,
        data: {
          url: 'https://www.w3schools.com/html/mov_bbb.mp4',
          thumbnail: 'https://picsum.photos/240/160?random=' + Date.now(),
          name: 'New Video',
        },
      };
      addNode(newNode);
    },
    [screenToFlowPosition, addNode]
  );

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;

      // Cmd/Ctrl + Z: 撤销
      if (cmdKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo()) {
          undo();
        }
      }

      // Cmd/Ctrl + Shift + Z: 重做
      if (cmdKey && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        if (canRedo()) {
          redo();
        }
      }

      // Cmd/Ctrl + Y: 重做 (Windows)
      if (cmdKey && e.key === 'y') {
        e.preventDefault();
        if (canRedo()) {
          redo();
        }
      }

      // Cmd/Ctrl + V: 粘贴
      if (cmdKey && e.key === 'v' && clipboard) {
        e.preventDefault();
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const position = screenToFlowPosition({ x: centerX, y: centerY });
        pasteNode(position);
      }

      // Delete/Backspace: 删除选中节点
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
          return;
        }
        const { selectedNodeId } = useCanvasStore.getState();
        if (selectedNodeId) {
          removeNode(selectedNodeId);
        }
      }

      // Cmd/Ctrl + C: 复制
      if (cmdKey && e.key === 'c') {
        const { selectedNodeId, nodes: currentNodes, copyNode } = useCanvasStore.getState();
        if (selectedNodeId) {
          const node = currentNodes.find((n) => n.id === selectedNodeId);
          if (node) {
            copyNode(node);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [undo, redo, canUndo, canRedo, clipboard, pasteNode, screenToFlowPosition, removeNode]);

  // 拖拽悬停
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  // 拖拽放置
  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();

      const data = e.dataTransfer.getData('application/json');
      if (!data) return;

      try {
        const item = JSON.parse(data);
        const position = screenToFlowPosition({
          x: e.clientX,
          y: e.clientY,
        });

        const newNode = {
          id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: item.type || 'image',
          position,
          data: {
            url: item.url,
            thumbnail: item.thumbnail,
            name: item.name,
          },
        };

        addNode(newNode);
      } catch (err) {
        console.error('Failed to parse drop data:', err);
      }
    },
    [screenToFlowPosition, addNode]
  );

  // 初始保存历史
  useEffect(() => {
    saveHistory();
  }, []);

  return (
    <div
      ref={reactFlowWrapper}
      style={{
        width: '100vw',
        height: '100vh',
        background: '#0d0d0d',
        marginTop: '56px',
        marginLeft: isSidebarOpen ? '280px' : '0',
        transition: 'margin-left 0.3s ease',
      }}
    >
      {/* 顶部工具栏 */}
      <div
        style={{
          position: 'fixed',
          top: '12px',
          left: isSidebarOpen ? '296px' : '16px',
          right: '16px',
          zIndex: 100,
        }}
      >
        <ToolBar />
      </div>

      {/* 侧边栏 */}
      <SideBar collapsed={!isSidebarOpen} onToggle={toggleSidebar} />

      {/* React Flow 画布 */}
      <div style={{ width: '100%', height: '100%' }}>
        <ReactFlow
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
          fitView
          snapToGrid
          snapGrid={[15, 15]}
          defaultEdgeOptions={{
            type: 'smoothstep',
            animated: false,
            style: { stroke: '#434343', strokeWidth: 2 },
          }}
          deleteKeyCode={null}
          selectionKeyCode={['Shift']}
          multiSelectionKeyCode={['Meta', 'Ctrl']}
          panOnScroll
          selectionOnScroll
          proOptions={{ hideAttribution: true }}
          style={{
            background: '#0d0d0d',
          }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="rgba(255, 255, 255, 0.05)"
          />
          <Controls
            showZoom
            showFitView
            showInteractive={false}
            position="bottom-right"
            style={{
              background: '#1f1f1f',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            }}
          />
          <MiniMap
            nodeColor={(node) => {
              switch (node.type) {
                case 'image':
                  return '#1890ff';
                case 'video':
                  return '#722ed1';
                default:
                  return '#434343';
              }
            }}
            maskColor="rgba(0, 0, 0, 0.5)"
            position="bottom-left"
            style={{
              background: '#1f1f1f',
              borderRadius: '8px',
            }}
          />
        </ReactFlow>
      </div>

      {/* 右键菜单 */}
      <ContextMenu
        onAddImage={handleAddImage}
        onAddVideo={handleAddVideo}
      />
    </div>
  );
};

const Canvas = () => {
  return (
    <ReactFlowProvider>
      <CanvasContent />
    </ReactFlowProvider>
  );
};

export default Canvas;
