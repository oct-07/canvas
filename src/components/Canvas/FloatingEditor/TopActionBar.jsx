import useCanvasStore from "@/store/canvasStore";
import { Button } from "antd";

const MODEL_FRAME_MAP = {
  1: { label: "首尾帧" },
  2: { label: "首帧" },
  3: { label: "尾帧" },
  4: { label: "全能参考" },
};

const TopActionBar = ({
  styleValue,
  onChangeStyle,
  onOpenMark,
  onUploadRefImage,
}) => {
  const modelListMap = useCanvasStore((state) => state.modelListMap);
  const activeNodeId = useCanvasStore((state) => state.activeNodeId);
  const nodeEditors = useCanvasStore((state) => state.nodeEditors);

  const paramValues = nodeEditors[activeNodeId]?.data || {};

  const nodeModelType = paramValues.model_type;

  const modelList = nodeModelType ? modelListMap[nodeModelType] || [] : [];

  // 优先匹配节点已选模型
  let currentSelectModel =
    modelList.find((m) => m.id === paramValues.model_id) || null;

  if (!currentSelectModel && modelList.length > 0) {
    currentSelectModel = modelList[0];
  }
  console.log("最终使用模型 currentSelectModel：", currentSelectModel);

  // 处理逗号分割的多模式字符串
  const rawFrameStr = currentSelectModel?.model_frame || "";
  const frameArr = rawFrameStr.split(",").filter((item) => item.trim());

  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
      {frameArr.map((frameKey) => {
        const frameConfig = MODEL_FRAME_MAP[frameKey];
        if (!frameConfig) return null;
        return (
          <Button
            style={{
              background: "#2a2a2a",
              border: "1px solid #404040",
              color: "#fff",
              borderRadius: 6,
            }}
          >
            {frameConfig.label}
          </Button>
        );
      })}
    </div>
  );
};

export default TopActionBar;
