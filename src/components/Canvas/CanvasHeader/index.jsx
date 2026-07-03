import { useCanvasStore } from "@/store/canvasStore.js";
import { Layout } from "antd";
import { useEffect, useRef, useState } from "react";
import CanvasTitleEdit from "./CanvasTitleEdit";
import SaveStatusBar from "./SaveStatusBar";
import StyleSelect from "./StyleSelect";

const { Header } = Layout;

export default function CanvasHeader({ canvasName }) {
  const headerRef = useRef(null);
  const [name, setName] = useState(canvasName || "");

  // 侧边栏不缩放
  useEffect(() => {
    const handleWheel = (e) => {
      if (e.ctrlKey && headerRef.current?.contains(e.target)) {
        e.preventDefault();
      }
    };

    document.addEventListener("wheel", handleWheel, { passive: false });
    return () => document.removeEventListener("wheel", handleWheel);
  }, []);

  // 只拿风格保存、保存状态、当前风格值
  const { saveCanvasStyle, saveLoading, saveTip, globalStyle } =
    useCanvasStore();

  useEffect(() => {
    setName(canvasName || "");
  }, [canvasName]);

  return (
    <Header
      ref={headerRef}
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
        <SaveStatusBar loading={saveLoading} tip={saveTip} />

        <StyleSelect
          isGlobal={true}
          onChange={(styleId) => {
            // 全局画布风格，单独调用保存接口
            if (styleId) saveCanvasStyle(styleId);
          }}
        />
      </div>
    </Header>
  );
}
