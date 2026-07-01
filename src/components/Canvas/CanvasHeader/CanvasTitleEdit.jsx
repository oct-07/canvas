import { Input } from "antd";

export default function CanvasTitleEdit() {
  return (
    <div style={{ width: 240, background: "#1f1f1f", borderRadius: 8 }}>
      <Input placeholder="请输入画布名称" style={{ width: "100%" }} />
    </div>
  );
}
