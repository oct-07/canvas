import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CloudUploadOutlined, SaveOutlined, PlusOutlined, UndoOutlined, RedoOutlined, SnippetsOutlined } from '@ant-design/icons';
import './index.css';

const ContextMenu = ({
  visible,
  position = { x: 0, y: 0 },
  onClose,
  onAction,
}) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose?.();
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    if (visible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [visible, onClose]);

  useEffect(() => {
    if (visible && menuRef.current) {
      const menu = menuRef.current;
      const rect = menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let x = position.x;
      let y = position.y;

      if (x + rect.width > viewportWidth) {
        x = viewportWidth - rect.width - 8;
      }
      if (y + rect.height > viewportHeight) {
        y = viewportHeight - rect.height - 8;
      }
      if (x < 8) x = 8;
      if (y < 8) y = 8;

      menu.style.left = `${x}px`;
      menu.style.top = `${y}px`;
    }
  }, [visible, position]);

  if (!visible) return null;

  const menuItems = [
    {
      key: 'upload',
      icon: <CloudUploadOutlined />,
      label: '上传',
      disabled: false,
    },
    {
      key: 'save',
      icon: <SaveOutlined />,
      label: '保存到我的资产',
      disabled: true,
      dividerAfter: true,
    },
    {
      key: 'add-node',
      icon: <PlusOutlined />,
      label: '添加节点',
      disabled: false,
      dividerAfter: true,
    },
    {
      key: 'undo',
      icon: <UndoOutlined />,
      label: '撤销',
      disabled: false,
    },
    {
      key: 'redo',
      icon: <RedoOutlined />,
      label: '重做',
      disabled: true,
      dividerAfter: true,
    },
    {
      key: 'paste',
      icon: <SnippetsOutlined />,
      label: '粘贴',
      disabled: false,
    },
  ];

  const handleItemClick = (item) => {
    if (item.disabled) return;
    onAction?.(item.key);
    onClose?.();
  };

  return createPortal(
    <div
      ref={menuRef}
      className="context-menu-container"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <div className="context-menu-header">
        <span>画布操作</span>
      </div>
      <div className="context-menu-list">
        {menuItems.map((item) => (
          <React.Fragment key={item.key}>
            <div
              className={`context-menu-item ${item.disabled ? 'disabled' : ''}`}
              onClick={() => handleItemClick(item)}
            >
              <span className="context-menu-item-icon">{item.icon}</span>
              <span className="context-menu-item-label">{item.label}</span>
            </div>
            {item.dividerAfter && <div className="context-menu-divider" />}
          </React.Fragment>
        ))}
      </div>
    </div>,
    document.body
  );
};

export default ContextMenu;
