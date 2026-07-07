import useCanvasStore from "@/store/canvasStore";
import { getThumbUrl } from "@/utils/thumbnail";
import {
  DownOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PictureOutlined,
  SearchOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import { Button, Dropdown, Input, Tooltip } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 侧边栏组件 - 画布元素导航列表
 * 展示画布上已存在的图片/视频节点，支持筛选、搜索、拖拽复用
 */
const SideBar = ({ collapsed, onToggle, selectedNodeId, onNodeSelect }) => {
  const sideBarRef = useRef(null);

  // 侧边栏禁止ctrl滚轮缩放
  useEffect(() => {
    const handleWheel = (e) => {
      if (e.ctrlKey && sideBarRef.current?.contains(e.target)) {
        e.preventDefault();
      }
    };

    document.addEventListener("wheel", handleWheel, { passive: false });
    return () => document.removeEventListener("wheel", handleWheel);
  }, []);

  // 读取画布全局状态
  const {
    nodes,
    elementFilter,
    elementSearch,
    setElementFilter,
    setElementSearch,
  } = useCanvasStore();

  const [draggedItem, setDraggedItem] = useState(null);

  // 拖拽开始
  const handleDragStart = useCallback((e, item) => {
    setDraggedItem(item);
    e.dataTransfer.setData("application/json", JSON.stringify(item));
    e.dataTransfer.effectAllowed = "copy";
  }, []);

  // 拖拽结束
  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
  }, []);

  // 点击选中画布节点并定位
  const handleItemClick = useCallback(
    (e, node) => {
      if (draggedItem) return;
      onNodeSelect?.(node.id);
    },
    [draggedItem, onNodeSelect],
  );

  // 筛选下拉菜单
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

  const matchItem = filterMenuItems.find((i) => i.key === elementFilter);
  const currentFilterText = matchItem?.label ?? "全部";

  // 判断链接是否为视频
  const isVideoUrl = (url) => /\.(mp4|mov|webm|avi|flv|m4v)$/i.test(url ?? "");

  // 类型过滤
  let sourceNodes = [...nodes];
  if (elementFilter === "image") {
    sourceNodes = sourceNodes.filter((node) => {
      if (node.type === "image") return true;
      if (node.type === "upload") return !isVideoUrl(node.data?.fullurl);
      return false;
    });
  } else if (elementFilter === "video") {
    sourceNodes = sourceNodes.filter((node) => {
      if (node.type === "video") return true;
      if (node.type === "upload") return isVideoUrl(node.data?.fullurl);
      return false;
    });
  }

  // 搜索过滤
  const filteredNodes = sourceNodes.filter((node) => {
    const name = node.data?.name ?? "";
    const keyword = elementSearch ?? "";
    return name.toLowerCase().includes(keyword.toLowerCase());
  });

  // 提取素材原始url
  const getNodeUrl = useCallback((node) => {
    const d = node.data || {};
    if (
      node.type === "image" ||
      node.type === "upload" ||
      node.type === "video"
    ) {
      return d.fullurl || "";
    }
    return "";
  }, []);

  const THUMB_W = 48;
  const THUMB_H = 36;

  // 侧边栏收起状态
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
      ref={sideBarRef}
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
      {/* 顶部标题+筛选+收起按钮 */}
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

      {/* 列表区域 */}
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
          filteredNodes.map((node) => {
            const nodeUrl = getNodeUrl(node);
            const thumbUrl = getThumbUrl(nodeUrl);
            const isHighlighted = selectedNodeId === node.id;

            return (
              <div
                draggable
                onDragStart={(e) => handleDragStart(e, node)}
                onDragEnd={handleDragEnd}
                onClick={(e) => handleItemClick(e, node)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "8px 16px",
                  cursor: "grab",
                  transition: "background 0.2s ease",
                  background: isHighlighted
                    ? "rgba(23, 125, 220, 0.18)"
                    : "transparent",
                  borderLeft: isHighlighted
                    ? "2px solid #177ddc"
                    : "2px solid transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isHighlighted) {
                    e.currentTarget.style.background = "#2b2b2b";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isHighlighted) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                {/* 缩略容器 */}
                <div
                  style={{
                    width: THUMB_W,
                    height: THUMB_H,
                    borderRadius: 6,
                    overflow: "hidden",
                    flexShrink: 0,
                    background: "#2a2a2a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid #3a3a3a",
                  }}
                >
                  {nodeUrl ? (
                    isVideoUrl(nodeUrl) ? (
                      <video
                        src={nodeUrl}
                        muted
                        preload="metadata"
                        playsInline
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          borderRadius: 6,
                          background: "#1f1f1f",
                        }}
                        onLoadedMetadata={(e) => {
                          try {
                            e.currentTarget.currentTime = 0.1;
                          } catch (_) {}
                        }}
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    ) : (
                      <img
                        src={thumbUrl}
                        alt={node.data?.name || "缩略图"}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    )
                  ) : node.type === "image" ||
                    (node.type === "upload" && !isVideoUrl(nodeUrl)) ? (
                    <PictureOutlined style={{ color: "#666", fontSize: 18 }} />
                  ) : (
                    <VideoCameraOutlined
                      style={{ color: "#666", fontSize: 18 }}
                    />
                  )}
                </div>

                {/* 名称+类型标签 */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      color: isHighlighted ? "#fff" : "#f0f0f0",
                      fontSize: 13,
                      fontWeight: isHighlighted ? 500 : 400,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {node.data?.name}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: "#888",
                      lineHeight: 1,
                    }}
                  >
                    {isVideoUrl(nodeUrl) ? "视频" : "图片"}
                  </span>
                </div>

                {/* 选中圆点标记 */}
                {isHighlighted && (
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#177ddc",
                      flexShrink: 0,
                    }}
                  />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default SideBar;
