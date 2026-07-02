/**
 * 磁吸浮动加号手柄覆盖层
 * 拖拽连线且命中手柄热区时，在屏幕坐标处渲染一个跟随光标浮动的圆形手柄：
 *   - 可连接：绿色 +
 *   - 不可连接：红色 ×
 */
import { PlusOutlined, CloseOutlined } from "@ant-design/icons";
import useMagnetStore from "./useMagnetStore";

const MagnetHandle = () => {
  const active = useMagnetStore((s) => s.active);
  const showHandle = useMagnetStore((s) => s.showHandle);
  const handleClient = useMagnetStore((s) => s.handleClient);
  const canConnect = useMagnetStore((s) => s.canConnect);

  if (!active || !showHandle || !handleClient) return null;

  const color = canConnect ? "#52c41a" : "#ff4d4f";

  return (
    <div
      style={{
        position: "fixed",
        left: handleClient.x,
        top: handleClient.y,
        width: 28,
        height: 28,
        transform: "translate(-50%, -50%)",
        borderRadius: "50%",
        background: color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontSize: 14,
        boxShadow: `0 0 0 4px ${color}33, 0 2px 8px rgba(0,0,0,0.4)`,
        pointerEvents: "none",
        zIndex: 10000,
        transition: "background 0.12s ease, box-shadow 0.12s ease",
      }}
    >
      {canConnect ? <PlusOutlined /> : <CloseOutlined />}
    </div>
  );
};

export default MagnetHandle;
