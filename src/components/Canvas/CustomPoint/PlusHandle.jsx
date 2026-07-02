import { PlusOutlined } from "@ant-design/icons";
import { Handle, Position } from "@xyflow/react";
import { useCallback, useRef, useState } from "react";

/**
 * 带加号的连接点（参考 libLib Canvas 的 Point 交互）
 *
 * 交互说明：
 *   - 连接点不再是固定在侧边中点的小圆点，而是沿节点该侧的一整条「磁吸感应带」。
 *   - 鼠标进入感应带（截图中节点右侧红框区域）后，「+」圆点会吸附并跟随光标上下浮动。
 *   - 感应带本身就是 ReactFlow 的 Handle，因此在带内任意位置按下都能原生拖出连线，
 *     且连线端点始终锚定在节点侧边中点（感应带中心），已有连线不会因浮动而偏移。
 *
 * @param {"target"|"source"} type   端口类型
 * @param {Position} position        端口位置（Left / Right）
 * @param {string} id                端口 id
 * @param {string} color             主题色（不同节点类型不同）
 * @param {string} offsetKey         "left" | "right"，控制水平偏移方向
 */

// ========== 可调常量 ==========
const ZONE_WIDTH = 44; // 磁吸感应带宽度（向节点外侧延伸）
const ZONE_EDGE_OVERLAP = 6; // 感应带向节点内侧覆盖的宽度（保证贴边可触发）
const ZONE_PAD_Y = 14; // 感应带上下额外延伸，扩大侧边可触发范围
const DOT = 22; // 浮动加号圆点直径

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

const PlusHandle = ({ type, position, id, color = "#1890ff", offsetKey }) => {
  const zoneRef = useRef(null);
  const [hover, setHover] = useState(false);
  // 浮动加号在感应带内的坐标（px，相对感应带左上角）
  const [dot, setDot] = useState({ x: 0, y: 0 });

  const isRight = position === Position.Right;

  // 根据光标位置更新浮动加号坐标（做上下 / 左右夹取，避免溢出感应带）
  const updateDot = useCallback((e) => {
    const rect = zoneRef.current?.getBoundingClientRect();
    if (!rect) return;
    const y = clamp(e.clientY - rect.top, DOT / 2, rect.height - DOT / 2);
    const x = clamp(e.clientX - rect.left, DOT / 2, rect.width - DOT / 2);
    setDot({ x, y });
  }, []);

  const handleEnter = useCallback(
    (e) => {
      setHover(true);
      updateDot(e);
    },
    [updateDot],
  );

  const handleLeave = useCallback(() => setHover(false), []);

  return (
    <Handle
      ref={zoneRef}
      type={type}
      position={position}
      id={id}
      onMouseEnter={handleEnter}
      onMouseMove={updateDot}
      onMouseLeave={handleLeave}
      onClick={(e) => e.stopPropagation()}
      style={{
        // 覆盖 ReactFlow 默认小圆点样式，改为侧边纵向感应带
        width: ZONE_WIDTH,
        height: "auto",
        top: -ZONE_PAD_Y,
        bottom: -ZONE_PAD_Y,
        [offsetKey]: -(ZONE_WIDTH - ZONE_EDGE_OVERLAP),
        transform: "none",
        borderRadius: 0,
        border: "none",
        background: "transparent",
        minWidth: 0,
        minHeight: 0,
        cursor: "crosshair",
        zIndex: 5,
      }}
    >
      {/* 浮动加号圆点：仅在鼠标进入感应带时显示，跟随光标浮动 */}
      {hover && (
        <div
          style={{
            position: "absolute",
            left: dot.x,
            top: dot.y,
            width: DOT,
            height: DOT,
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            background: color,
            border: "2px solid #1f1f1f",
            boxShadow: `0 0 0 4px ${color}44, 0 2px 8px rgba(0,0,0,0.5)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            // 圆点不接收指针事件，按下事件透传给底层 Handle 以原生拖出连线
            pointerEvents: "none",
            // 只对位移做过渡，形成轻微「磁吸吸附」的缓动感
            transition: "left 0.06s ease-out, top 0.06s ease-out",
            willChange: "left, top",
          }}
        >
          <PlusOutlined style={{ fontSize: 12, color: "#fff" }} />
        </div>
      )}
    </Handle>
  );
};

export default PlusHandle;
