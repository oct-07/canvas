import { Layout } from "antd";
import { useState } from "react";
import CanvasTitleEdit from "./CanvasTitleEdit";
import SaveStatusBar from "./SaveStatusBar";
import StyleSelect from "./StyleSelect";

const { Header } = Layout;

export default function CanvasHeader() {
  const [currentStyle, setCurrentStyle] = useState("shadow");

  return (
    <Header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 16px",
        height: 56,
      }}
    >
      {/* 左侧画布名称输入 */}
      <CanvasTitleEdit />

      {/* 右侧操作栏 */}
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <SaveStatusBar />
        {/* 风格弹窗 */}
        <StyleSelect value={currentStyle} onChange={setCurrentStyle} />
      </div>
    </Header>
  );
}
