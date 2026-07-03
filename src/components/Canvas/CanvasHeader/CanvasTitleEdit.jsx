import { useCanvasStore } from "@/store/canvasStore.js";
import { Input } from "antd";
import { useEffect, useState } from "react";

export default function CanvasTitleEdit() {
  // 必须单独 selector 订阅 canvasName，才会响应更新
  const canvasName = useCanvasStore((s) => s.canvasName);
  const saveCanvasName = useCanvasStore((s) => s.saveCanvasName);

  const [inputVal, setInputVal] = useState("");

  // 仓库名称变更，同步到输入框
  useEffect(() => {
    setInputVal(canvasName);
  }, [canvasName]);

  const handleSave = () => {
    const trimText = inputVal.trim();
    if (!trimText) return;
    saveCanvasName(trimText);
  };

  return (
    <div style={{ width: 240, background: "#1f1f1f", borderRadius: 8 }}>
      <Input
        placeholder="请输入画布名称"
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => e.key === "Enter" && handleSave()}
        style={{ width: "100%" }}
      />
    </div>
  );
}
