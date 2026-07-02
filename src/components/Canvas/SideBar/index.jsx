import useCanvasStore from "@/store/canvasStore";
import {
  DownOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PictureOutlined,
  SearchOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import { Button, Dropdown, Input, Tooltip } from "antd";
import { useCallback, useState } from "react";

/**
 * 侧边栏组件 - 画布元素导航列表
 * 展示画布上已存在的图片/视频节点，支持筛选、搜索、拖拽复用
 */
const SideBar = ({ collapsed, onToggle }) => {
  // 读取节点切片状态
  const {
    nodes,
    elementFilter,
    elementSearch,
    setElementFilter,
    setElementSearch,
  } = useCanvasStore();

  const [draggedItem, setDraggedItem] = useState(null);

  // 拖拽节点
  const handleDragStart = useCallback((e, item) => {
    setDraggedItem(item);
    e.dataTransfer.setData("application/json", JSON.stringify(item));
    e.dataTransfer.effectAllowed = "copy";
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
  }, []);

  // 下拉菜单配置
  const filterMenuItems = [
    { key: "all", label: "全部" },
    { key: "image", label: "图片" },
    { key: "video", label: "视频" },
  ];
  const filterMenuConfig = {
    items: filterMenuItems,
    selectedKeys: [elementFilter],
    onClick: ({ key }) => setElementFilter(key),
  };

  // 关键修复：find兜底，找不到返回 {label:'全部'}
  const matchItem = filterMenuItems.find((i) => i.key === elementFilter);
  const currentFilterText = matchItem?.label ?? "全部";

  // 1. 类型过滤
  let sourceNodes = [...nodes];
  if (elementFilter === "image") {
    sourceNodes = sourceNodes.filter((node) => node.type === "image");
  } else if (elementFilter === "video") {
    sourceNodes = sourceNodes.filter((node) => node.type === "video");
  }

  // 2. 搜索过滤
  const filteredNodes = sourceNodes.filter((node) =>
    node.name?.toLowerCase().includes(elementSearch.toLowerCase()),
  );

  // 收起状态
  if (collapsed) {
    return (
      <div
        style={{
          position: "fixed",
          left: 12,
          top: 72,
          zIndex: 100,
        }}
      >
        <Tooltip title="展开画布元素列表" placement="right">
          <Button
            type="text"
            icon={<MenuUnfoldOutlined />}
            onClick={onToggle}
            style={{
              background: "#1f1f1f",
              borderRadius: 8,
              color: "rgba(255, 255, 255, 0.85)",
              width: 40,
              height: 40,
            }}
          />
        </Tooltip>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        top: 56,
        width: 300,
        height: "calc(100vh - 56px)",
        background: "#1f1f1f",
        display: "flex",
        flexDirection: "column",
        zIndex: 50,
        borderRadius: "10px",
      }}
    >
      {/* 顶部标题栏 + 筛选下拉 + 收起按钮 */}
      <div
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid #303030",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: 20, color: "#fff", fontWeight: 500 }}>
          画布元素
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Dropdown trigger={["click"]} menu={filterMenuConfig}>
            <span
              style={{
                color: "#cccccc",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {currentFilterText}
              <DownOutlined style={{ fontSize: 12 }} />
            </span>
          </Dropdown>
          <Tooltip title="收起侧边栏">
            <Button
              type="text"
              icon={<MenuFoldOutlined />}
              onClick={onToggle}
              style={{ color: "rgba(255, 255, 255, 0.65)" }}
            />
          </Tooltip>
        </div>
      </div>

      {/* 搜索框 */}
      <div style={{ padding: "10px 16px", borderBottom: "1px solid #303030" }}>
        <Input
          placeholder="搜索画布节点..."
          prefix={
            <SearchOutlined style={{ color: "rgba(255, 255, 255, 0.35)" }} />
          }
          value={elementSearch}
          onChange={(e) => setElementSearch(e.target.value)}
          style={{
            background: "#262626",
            border: "1px solid #303030",
            borderRadius: 6,
            color: "#fff",
          }}
        />
      </div>

      {/* 节点列表区域 */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px 0",
        }}
      >
        {filteredNodes.length === 0 ? (
          <div
            style={{
              color: "#888888",
              textAlign: "center",
              padding: "40px 16px",
            }}
          >
            暂无匹配画布节点
          </div>
        ) : (
          filteredNodes.map((node) => (
            <Tooltip title={node.name} key={node.id} placement="right">
              <div
                draggable
                onDragStart={(e) => handleDragStart(e, node)}
                onDragEnd={handleDragEnd}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 16px",
                  cursor: "grab",
                  transition: "background 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#2b2b2b";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                {/* 节点类型图标 */}
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 6,
                    background: "#383838",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {node.type === "image" ? (
                    <PictureOutlined style={{ color: "#ddd", fontSize: 18 }} />
                  ) : (
                    <VideoCameraOutlined
                      style={{ color: "#ddd", fontSize: 18 }}
                    />
                  )}
                </div>
                {/* 节点名称超长省略 */}
                <span
                  style={{
                    color: "#f0f0f0",
                    fontSize: 14,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: 1,
                  }}
                >
                  {node.name}
                </span>
              </div>
            </Tooltip>
          ))
        )}
      </div>
    </div>
  );
};

export default SideBar;
