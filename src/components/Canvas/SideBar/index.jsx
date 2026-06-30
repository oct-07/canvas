import useCanvasStore from "@/store/canvasStore";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PictureOutlined,
  SearchOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import { Button, Input, Tabs, Tooltip } from "antd";
import { useCallback, useState } from "react";

/**
 * 侧边栏组件 - 素材选择面板
 * 显示图片和视频素材，支持拖拽到画布
 */
const SideBar = ({ collapsed, onToggle }) => {
  const { materials, activeTab, searchQuery, setActiveTab, setSearchQuery } =
    useCanvasStore();

  const [draggedItem, setDraggedItem] = useState(null);

  /**
   * 开始拖拽素材，将素材数据存入 dataTransfer
   */
  const handleDragStart = useCallback((e, item) => {
    setDraggedItem(item);
    e.dataTransfer.setData("application/json", JSON.stringify(item));
    e.dataTransfer.effectAllowed = "copy";
  }, []);

  /**
   * 拖拽结束时清除拖拽状态
   */
  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
  }, []);

  const filteredImages =
    materials?.images?.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()),
    ) || [];

  const filteredVideos =
    materials?.videos?.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()),
    ) || [];

  // tab 配置数组，替代 TabPane
  const tabItems = [
    {
      key: "images",
      label: (
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <PictureOutlined />
          Images
        </span>
      ),
      children: (
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 12,
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 12,
            alignContent: "start",
          }}
        >
          {filteredImages.map((item) => (
            <Tooltip title={item.name} key={item.id}>
              <div
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                onDragEnd={handleDragEnd}
                style={{
                  aspectRatio: "4/3",
                  background: `url(${item.url}) center/cover no-repeat`,
                  borderRadius: 8,
                  border: "2px solid transparent",
                  cursor: "grab",
                  transition: "all 0.2s ease",
                  position: "relative",
                  overflow: "hidden",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#177ddc";
                  e.currentTarget.style.transform = "scale(1.02)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "transparent";
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: "4px 8px",
                    background:
                      "linear-gradient(0deg, rgba(0,0,0,0.8) 0%, transparent 100%)",
                  }}
                >
                  <span
                    style={{
                      color: "#fff",
                      fontSize: 10,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      display: "block",
                    }}
                  >
                    {item.name}
                  </span>
                </div>
              </div>
            </Tooltip>
          ))}
        </div>
      ),
    },
    {
      key: "videos",
      label: (
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <VideoCameraOutlined />
          Videos
        </span>
      ),
      children: (
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 12,
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 12,
            alignContent: "start",
          }}
        >
          {filteredVideos.map((item) => (
            <Tooltip title={item.name} key={item.id}>
              <div
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                onDragEnd={handleDragEnd}
                style={{
                  aspectRatio: "16/10",
                  background: `url(${item.thumbnail}) center/cover no-repeat`,
                  borderRadius: 8,
                  border: "2px solid transparent",
                  cursor: "grab",
                  transition: "all 0.2s ease",
                  position: "relative",
                  overflow: "hidden",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#177ddc";
                  e.currentTarget.style.transform = "scale(1.02)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "transparent";
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "rgba(23, 125, 220, 0.9)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <VideoCameraOutlined
                    style={{ color: "#fff", fontSize: 14 }}
                  />
                </div>
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: "4px 8px",
                    background:
                      "linear-gradient(0deg, rgba(0,0,0,0.8) 0%, transparent 100%)",
                  }}
                >
                  <span
                    style={{
                      color: "#fff",
                      fontSize: 10,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      display: "block",
                    }}
                  >
                    {item.name}
                  </span>
                </div>
              </div>
            </Tooltip>
          ))}
        </div>
      ),
    },
  ];

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
        <Tooltip title="Expand Sidebar" placement="right">
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
        width: 280,
        height: "calc(100vh - 56px)",
        background: "#1f1f1f",
        display: "flex",
        flexDirection: "column",
        zIndex: 50,
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #303030",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Input
          placeholder="Search materials..."
          prefix={
            <SearchOutlined style={{ color: "rgba(255, 255, 255, 0.35)" }} />
          }
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            background: "#262626",
            border: "1px solid #303030",
            borderRadius: 6,
          }}
        />
        <Tooltip title="Collapse">
          <Button
            type="text"
            icon={<MenuFoldOutlined />}
            onClick={onToggle}
            style={{ color: "rgba(255, 255, 255, 0.65)" }}
          />
        </Tooltip>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        style={{ flex: 1, display: "flex", flexDirection: "column" }}
        tabBarStyle={{
          margin: 0,
          padding: "0 16px",
          borderBottom: "1px solid #303030",
        }}
      />
    </div>
  );
};

export default SideBar;
