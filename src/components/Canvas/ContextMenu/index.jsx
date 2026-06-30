import useCanvasStore from '@/store/canvasStore';
import { UpCircleOutlined } from '@ant-design/icons';
import { Menu } from 'antd';
import { useEffect, useRef } from 'react';

/**
 * 画布右键菜单组件 - 根据右键目标（画布/节点/边）显示不同操作
 * 支持添加图片/视频、复制粘贴、删除等操作
 */
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

/**
 * 点击菜单外部时关闭菜单
 */
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

/**
 * 按 ESC 键关闭菜单
 */
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

/**
 * 复制选中的节点到剪贴板
 */
  const handleCopy = () => {
    const { nodes, copyNode } = useCanvasStore.getState();
    const node = nodes.find((n) => n.id === selectedNodeId);
    if (node) {
      copyNode(node);
    }
    hideContextMenu();
  };

/**
 * 在菜单位置粘贴剪贴板中的节点
 */
  const handlePaste = () => {
    pasteNode({ x: contextMenu.x, y: contextMenu.y });
    hideContextMenu();
  };

/**
 * 删除选中的节点或边
 */
  const handleDelete = () => {
    if (contextMenu.target === 'node' && contextMenu.targetId) {
      removeNode(contextMenu.targetId);
    } else if (contextMenu.target === 'edge' && contextMenu.targetId) {
      removeEdge(contextMenu.targetId);
    }
    hideContextMenu();
  };

/**
 * 在菜单位置添加图片节点
 */
  const handleAddImage = () => {
    onAddImage?.({ x: contextMenu.x, y: contextMenu.y });
    hideContextMenu();
  };

/**
 * 在菜单位置添加视频节点
 */
  const handleAddVideo = () => {
    onAddVideo?.({ x: contextMenu.x, y: contextMenu.y });
    hideContextMenu();
  };

/**
 * 根据右键目标类型返回对应的菜单项列表
 */
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
