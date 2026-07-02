import { PlusOutlined } from "@ant-design/icons";
import { Handle, Position, useStore } from "@xyflow/react";
import { useCallback, useRef, useState } from "react";

/**
 * 带加号的连接点（参考 libLib Canvas 的 Point 交互）
 *
 * 交互说明：
 *   - 连接点是位于节点侧边中点、向外凸出的一段「半椭圆弧」磁吸感应区（见需求图 3）。
 *   - 鼠标进入弧形感应区后，「+」圆点会吸附并跟随光标浮动，离开后消失（吸附归位）。
 *   - 感应区本身就是 ReactFlow 的 Handle，因此在区域内任意位置按下都能原生拖出连线，
 *     且连线端点始终锚定在节点侧边中点（Handle 包围盒中心不受 clip-path 影响）。
 *
 * 缩放对齐关键：
 *   浮动圆点渲染在被视口 zoom 变换缩放的节点内部，因此必须把「屏幕像素偏移 ÷ zoom」
 *   换算成节点本地坐标再定位，否则缩放后圆点会与真实鼠标位置错位。
 *
 * @param {"target"|"source"} type   端口类型
 * @param {Position} position        端口位置（Left / Right）
 * @param {string} id                端口 id
 * @param {string} color             主题色（不同节点类型不同）
 */

// ========== 可调常量（均为节点本地像素，会随画布缩放自动缩放）==========
const REACH_X = 40; // 感应弧向外凸出的水平半径
const REACH_Y = 48; // 感应弧的垂直半径
const DOT = 22; // 浮动加号圆点直径
const REST_OUT = 16; // 未移动时圆点默认向外的落点

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

const PlusHandle = ({ type, position, id, color = "#1890ff" }) => {
  const zoneRef = useRef(null);
  const [hover, setHover] = useState(false);
  // 浮动加号相对「包围盒中心（= 侧边中点）」的本地坐标偏移（px）
  const [dot, setDot] = useState({ x: 0, y: 0 });

  const isRight = position === Position.Right;
  const dir = isRight ? 1 : -1; // 向外为正方向
  // 当前画布缩放比例
  const zoom = useStore((s) => s.transform[2]);

  // 根据光标位置更新浮动加号坐标（换算到本地坐标，并夹取在椭圆弧范围内）
  const updateDot = useCallback(
    (e) => {
      const rect = zoneRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      // 屏幕偏移 ÷ zoom => 本地坐标偏移
      const z = zoom || 1;
      const lx = (e.clientX - cx) / z;
      const ly = (e.clientY - cy) / z;
      // 只在外侧凸出方向跟随；夹取避免溢出弧形与圆点半径
      const along = clamp(lx * dir, 0, REACH_X - DOT / 2);
      const y = clamp(ly, -(REACH_Y - DOT / 2), REACH_Y - DOT / 2);
      setDot({ x: along * dir, y });
    },
    [dir, zoom],
  );

  const handleEnter = useCallback(
    (e) => {
      setHover(true);
      updateDot(e);
    },
    [updateDot],
  );

  const handleLeave = useCallback(() => setHover(false), []);

  // 半椭圆弧：保留侧边外侧一半，并把外侧两角圆成弧形（内侧裁掉，不覆盖节点内容）
  const clipPath = isRight
    ? `inset(0 0 0 50% round 0 ${REACH_Y}px ${REACH_Y}px 0)`
    : `inset(0 50% 0 0 round ${REACH_Y}px 0 0 ${REACH_Y}px)`;

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
        // 以侧边中点为中心的方形包围盒（连线锚点 = 包围盒中心，不受 clip-path 影响）
        width: REACH_X * 2,
        height: REACH_Y * 2,
        top: "50%",
        [isRight ? "left" : "right"]: "100%",
        transform: isRight ? "translate(-50%, -50%)" : "translate(50%, -50%)",
        borderRadius: 0,
        border: "none",
        background: "transparent",
        minWidth: 0,
        minHeight: 0,
        cursor: "crosshair",
        clipPath,
        zIndex: 5,
      }}
    >
      {/* 浮动加号圆点：仅在鼠标进入感应弧时显示，跟随光标浮动 */}
      {hover && (
        <div
          style={{
            position: "absolute",
            left: `calc(50% + ${dot.x}px)`,
            top: `calc(50% + ${dot.y}px)`,
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
