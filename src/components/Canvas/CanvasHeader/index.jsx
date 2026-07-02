import { Layout } from "antd";
import { useEffect, useState } from "react";
import CanvasTitleEdit from "./CanvasTitleEdit";
import SaveStatusBar from "./SaveStatusBar";
import StyleSelect from "./StyleSelect";

const { Header } = Layout;

export default function CanvasHeader({ canvasName }) {
  const [name, setName] = useState(canvasName || "");

  useEffect(() => {
    setName(canvasName || "");
  }, [canvasName]);

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
      <CanvasTitleEdit defaultValue={name} />

      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <SaveStatusBar />
        <StyleSelect />
      </div>
    </Header>
  );
}
