import useCanvasStore from "@/store/canvasStore";
import {
  ArrowUpOutlined,
  CloudUploadOutlined,
  CopyOutlined,
  PictureOutlined,
  UpCircleOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import { Menu } from "antd";
import { useEffect, useRef } from "react";

/**
 * 画布右键菜单组件 - 根据右键目标（画布/节点）显示不同操作
 * 支持添加图片/视频/上传素材、复制粘贴、删除节点等操作
 */
const ContextMenu = ({ onAddImage, onAddVideo, onAddUpload }) => {
  const menuRef = useRef(null);
  const uploadInputRef = useRef(null);
  const {
    contextMenu,
    clipboard,
    copyNode,
    pasteNode,
    removeNode,
    duplicateNode,
    hideContextMenu,
    selectedNodeId,
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
      document.addEventListener("click", handleClickOutside);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [contextMenu.visible, hideContextMenu]);

  /**
   * 按 ESC 键关闭菜单
   */
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        hideContextMenu();
      }
    };

    if (contextMenu.visible) {
      document.addEventListener("keydown", handleEsc);
    }

    return () => {
      document.removeEventListener("keydown", handleEsc);
    };
  }, [contextMenu.visible, hideContextMenu]);

  if (!contextMenu.visible) return null;

  const handleUploadFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file || !onAddUpload) return;

    console.log("[ContextMenu] handleUploadFileChange 被调用", Date.now());

    // 停止冒泡，防止触发 document click → hideContextMenu → 菜单卸载
    // handleAddUpload 中 .click() 触发的文件选择，Menu 已 stopPropagation，
    // 但保守处理防止其他路径触发
    e.stopPropagation();

    const menuX = Number(uploadInputRef.current?.dataset.menuX || contextMenu.x);
    const menuY = Number(uploadInputRef.current?.dataset.menuY || contextMenu.y);

    // 上传文件选择后，创建带 pendingFile 的节点，实际上传由 UploadMediaNode useEffect 处理
    onAddUpload({ x: menuX, y: menuY, file });
    hideContextMenu();

    if (uploadInputRef.current) {
      uploadInputRef.current.value = "";
    }
  };

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
   * 仅删除节点（移除连线删除分支）
   */
  const handleDelete = () => {
    if (contextMenu.target === "node" && contextMenu.targetId) {
      removeNode(contextMenu.targetId);
    }
    hideContextMenu();
  };

  /**
   * 复制选中节点及其关联连线，生成全新副本
   */
  const handleDuplicate = () => {
    if (contextMenu.target === "node" && contextMenu.targetId) {
      const { duplicateNode } = useCanvasStore.getState();
      duplicateNode(contextMenu.targetId);
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
   * 在菜单位置添加上传素材节点
   */
  const handleAddUpload = () => {
    if (uploadInputRef.current) {
      uploadInputRef.current.dataset.menuX = String(contextMenu.x);
      uploadInputRef.current.dataset.menuY = String(contextMenu.y);
      uploadInputRef.current.click();
    }
  };

  /**
   * 根据右键目标类型返回对应的菜单项列表
   */
  const getMenuItems = () => {
    if (contextMenu.target === "canvas") {
      return [
        {
          key: "add-image",
          label: "添加图片",
          icon: <PictureOutlined />,
          onClick: handleAddImage,
        },
        {
          key: "add-video",
          label: "添加视频",
          icon: <VideoCameraOutlined />,
          onClick: handleAddVideo,
        },
        {
          key: "add-upload",
          label: "添加上传素材",
          icon: <CloudUploadOutlined />,
          onClick: handleAddUpload,
        },
        { type: "divider" },
        {
          key: "paste",
          label: "粘贴",
          icon: <UpCircleOutlined />,
          onClick: handlePaste,
        },
      ];
    }

    if (contextMenu.target === "node") {
      return [
        {
          key: "copy",
          label: "复制",
          icon: <UpCircleOutlined />,
          onClick: handleCopy,
        },
        {
          key: "duplicate",
          label: "创建副本",
          icon: <CopyOutlined />,
          onClick: handleDuplicate,
        },
        { type: "divider" },
        {
          key: "delete",
          label: "删除",
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
        position: "fixed",
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
          background: "#1f1f1f",
          border: "1px solid #303030",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
          minWidth: "160px",
        }}
      />
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/mov"
        style={{ display: "none" }}
        onChange={handleUploadFileChange}
      />
    </div>
  );
};

export default ContextMenu;
