import { Tag } from "antd";

export default function SaveStatusBar() {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        alignItems: "center",
        fontSize: 18,
      }}
    >
      <Tag color="red">未保存</Tag>
    </div>
  );
}
