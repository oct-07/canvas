import { PlusOutlined } from "@ant-design/icons";
import { Handle } from "@xyflow/react";
import { useState } from "react";

/**
 * 带加号的连接点（常驻显示）
 * 替换 ReactFlow 节点边缘默认的圆点 handle。
 *
 * @param {"target"|"source"} type   端口类型
 * @param {Position} position        端口位置（Left / Right）
 * @param {string} id                端口 id
 * @param {string} color             主题色（不同节点类型不同）
 * @param {string} offsetKey         "left" | "right"，控制水平偏移方向
 */
const PlusHandle = ({ type, position, id, color = "#1890ff", offsetKey }) => {
  const [hover, setHover] = useState(false);

  const size = hover ? 22 : 18;

  return (
    <Handle
      type={type}
      position={position}
      id={id}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        border: "2px solid #1f1f1f",
        boxShadow: hover
          ? `0 0 0 4px ${color}44, 0 2px 6px rgba(0,0,0,0.5)`
          : "0 1px 4px rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "width 0.12s ease, height 0.12s ease, box-shadow 0.12s ease",
        [offsetKey]: hover ? -11 : -9,
        cursor: "crosshair",
        zIndex: 5,
      }}
    >
      <PlusOutlined
        style={{
          fontSize: hover ? 12 : 10,
          color: "#fff",
          pointerEvents: "none",
          transition: "font-size 0.12s ease",
        }}
      />
    </Handle>
  );
};

export default PlusHandle;
