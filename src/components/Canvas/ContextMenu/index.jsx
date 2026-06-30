import useCanvasStore from '@/store/canvasStore';
import { UpCircleOutlined } from '@ant-design/icons';
import { Menu } from 'antd';
import { useEffect, useRef } from 'react';

const ContextMenu = ({ onAddImage, onAddVideo }) => {
  const menuRef = useRef(null);
  const {
    contextMenu,
    clipboard,
    copyNode,
    pasteNode,
    removeNode,
    removeEdge,
    hideContextMenu,
    selectedNodeId,
    selectedEdgeId,
  } = useCanvasStore();

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        hideContextMenu();
      }
    };

    if (contextMenu.visible) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [contextMenu.visible, hideContextMenu]);

  // ESC 关闭
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        hideContextMenu();
      }
    };

    if (contextMenu.visible) {
      document.addEventListener('keydown', handleEsc);
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [contextMenu.visible, hideContextMenu]);

  if (!contextMenu.visible) return null;

  const handleCopy = () => {
    const { nodes, copyNode } = useCanvasStore.getState();
    const node = nodes.find((n) => n.id === selectedNodeId);
    if (node) {
      copyNode(node);
    }
    hideContextMenu();
  };

  const handlePaste = () => {
    pasteNode({ x: contextMenu.x, y: contextMenu.y });
    hideContextMenu();
  };

  const handleDelete = () => {
    if (contextMenu.target === 'node' && contextMenu.targetId) {
      removeNode(contextMenu.targetId);
    } else if (contextMenu.target === 'edge' && contextMenu.targetId) {
      removeEdge(contextMenu.targetId);
    }
    hideContextMenu();
  };

  const handleAddImage = () => {
    onAddImage?.({ x: contextMenu.x, y: contextMenu.y });
    hideContextMenu();
  };

  const handleAddVideo = () => {
    onAddVideo?.({ x: contextMenu.x, y: contextMenu.y });
    hideContextMenu();
  };

  // 根据目标类型渲染不同菜单
  const getMenuItems = () => {
    if (contextMenu.target === 'canvas') {
      return [
        {
          key: 'add-image',
          label: '添加图片',
          icon: <UpCircleOutlined />,
          onClick: handleAddImage,
        },
        {
          key: 'add-video',
          label: '添加视频',
          icon: <UpCircleOutlined />,
          onClick: handleAddVideo,
        },
        { type: 'divider' },
        {
          key: 'paste',
          label: '粘贴',
          icon: <UpCircleOutlined />,
          onClick: handlePaste,
          disabled: !clipboard,
        },
      ];
    }

    if (contextMenu.target === 'node') {
      return [
        {
          key: 'copy',
          label: '复制',
          icon: <UpCircleOutlined />,
          onClick: handleCopy,
        },
        { type: 'divider' },
        {
          key: 'delete',
          label: '删除',
          icon: <UpCircleOutlined />,
          danger: true,
          onClick: handleDelete,
        },
      ];
    }

    if (contextMenu.target === 'edge') {
      return [
        {
          key: 'delete',
          label: '删除连线',
          icon: <UpCircleOutlined />,
          danger: true,
          onClick: handleDelete,
        },
      ];
    }

    return [];
  };

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: contextMenu.x,
        top: contextMenu.y,
        zIndex: 1000,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <Menu
        mode="vertical"
        items={getMenuItems()}
        style={{
          background: '#1f1f1f',
          border: '1px solid #303030',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
          minWidth: '160px',
        }}
      />
    </div>
  );
};

export default ContextMenu;
