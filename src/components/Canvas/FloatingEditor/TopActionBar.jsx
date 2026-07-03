import useCanvasStore from "@/store/canvasStore";
import { Button } from "antd";
import { useState } from "react";

const MODEL_FRAME_MAP = {
  1: { label: "首尾帧" },
  2: { label: "首帧" },
  3: { label: "尾帧" },
  4: { label: "全能参考" },
};

// 模拟上游传入的参考图片数据，对应截图里5张图
const MOCK_UPSTREAM_IMAGES = [
  {
    url: "https://picsum.photos/id/1031/200/200",
    count: 1,
  },
  {
    url: "https://picsum.photos/id/1025/200/200",
    count: 2,
  },
];

// 素材预览子组件
const RefImagePreviewBar = () => {
  const refImageList = MOCK_UPSTREAM_IMAGES;
  if (!refImageList.length) return null;

  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: 6,
          borderRadius: 8,
          width: "fit-content",
          overflowX: "auto",
          scrollbarWidth: "none",
        }}
      >
        {refImageList.map((imgItem, idx) => (
          <div
            key={idx}
            style={{
              position: "relative",
              width: 72,
              height: 72,
              borderRadius: 6,
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            <img
              src={imgItem.url}
              alt="参考素材"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            <div
              style={{
                position: "absolute",
                top: 2,
                right: 2,
                background: "rgba(0,0,0,0.75)",
                color: "#fff",
                fontSize: 12,
                width: 20,
                height: 20,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {imgItem.count}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const TopActionBar = ({
  styleValue,
  onChangeStyle,
  onOpenMark,
  onUploadRefImage,
  // 新增参数 hasVideo：是否上传视频，外部传入布尔值
  hasVideo = false,
}) => {
  const [activeFrameKey, setActiveFrameKey] = useState("");
  const refImageList = MOCK_UPSTREAM_IMAGES;
  // 素材总数量
  const imgTotal = refImageList.length;

  const modelListMap = useCanvasStore((state) => state.modelListMap);
  const activeNodeId = useCanvasStore((state) => state.activeNodeId);
  const nodeEditors = useCanvasStore((state) => state.nodeEditors);

  const paramValues = nodeEditors[activeNodeId]?.data || {};
  const nodeModelType = paramValues.model_type;
  const modelList = nodeModelType ? modelListMap[nodeModelType] || [] : [];

  let currentSelectModel =
    modelList.find((m) => m.id === paramValues.model_id) || null;
  if (!currentSelectModel && modelList.length > 0) {
    currentSelectModel = modelList[0];
  }

  const rawFrameStr = currentSelectModel?.model_frame || "";
  const frameArr = rawFrameStr.split(",").filter((item) => item.trim());

  // 判断当前按钮是否禁用
  const getBtnDisabled = (frameKey) => {
    // 有视频：只允许4全能参考，其余全部禁用
    if (hasVideo) {
      return frameKey !== "4";
    }
    // 图片总数 = 1：全部可用
    if (imgTotal === 1) return false;
    // 图片总数 = 2：禁用2、3，只允许1、4
    if (imgTotal === 2) {
      return frameKey === "2" || frameKey === "3";
    }
    // 图片 > 2：只允许4，其余禁用
    if (imgTotal > 2) {
      return frameKey !== "4";
    }
    return false;
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        {frameArr.map((frameKey) => {
          const frameConfig = MODEL_FRAME_MAP[frameKey];
          if (!frameConfig) return null;
          const isActive = activeFrameKey === frameKey;
          const disabled = getBtnDisabled(frameKey);

          return (
            <Button
              key={frameKey}
              disabled={disabled}
              onClick={() => setActiveFrameKey(frameKey)}
              style={{
                background: isActive ? "#383838" : "#2a2a2a",
                border: isActive ? "1px solid #383838" : "1px solid #404040",
                color: isActive ? "#fff" : "#fff",
                borderRadius: 6,
              }}
            >
              {frameConfig.label}
            </Button>
          );
        })}
      </div>
      <RefImagePreviewBar />
    </div>
  );
};

export default TopActionBar;
