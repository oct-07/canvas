import { Input } from "antd";
import { useEffect, useState } from "react";
// 引入画布仓库
import { useCanvasStore } from "@/store/canvasStore.js";

export default function CanvasTitleEdit({ defaultValue = "" }) {
  const [value, setValue] = useState(defaultValue);
  // 取出保存名称方法
  const { saveCanvasName } = useCanvasStore();

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  // 触发保存
  const handleSave = () => {
    const trimText = value.trim();
    if (!trimText) return;
    saveCanvasName(trimText);
  };

  return (
    <div style={{ width: 240, background: "#1f1f1f", borderRadius: 8 }}>
      <Input
        placeholder="请输入画布名称"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        // 失焦保存
        onBlur={handleSave}
        // 回车保存
        onKeyDown={(e) => e.key === "Enter" && handleSave()}
        style={{ width: "100%" }}
      />
    </div>
  );
}
