import { PlusOutlined } from "@ant-design/icons";
import { Handle, Position, useStore } from "@xyflow/react";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 带加号的连接点（参考 libLib Canvas 的 Point 交互）
 *
 * 交互说明：
 *   - 鼠标移入「节点」时，左右两侧都会出现「+」引导点（停靠在侧边中点外侧）。
 *   - 感应区是位于侧边中点、向外凸出的「半椭圆弧」（D 形，见需求图 2）。
 *   - 光标进入该半椭圆弧时，「+」圆点吸附并跟随光标浮动；光标离开椭圆后释放归位
 *     （不再跟随，但只要仍在节点上圆点就保持完整显示，绝不被裁切）。
 *   - 半椭圆弧本身就是 ReactFlow 的 Handle，在其中任意位置按下都能原生拖出连线，
 *     且连线端点始终锚定在节点侧边中点（Handle 包围盒中心 = 侧边中点）。
 *
 * 关键实现点：
 *   1. 圆点渲染为 Handle 的「兄弟节点」而非子节点，因此不会被 Handle 的 clip-path 裁切。
 *   2. 感应区用 clip-path: path() 裁出外凸半椭圆（D 形），内半侧被裁掉，不遮挡节点内容/点击。
 *   3. 圆点渲染在被视口 zoom 缩放的节点内部，故把「屏幕像素偏移 ÷ zoom」换算成本地坐标，
 *      保证任意缩放下圆点都精确贴合光标。
 *
 * @param {"target"|"source"} type   端口类型
 * @param {Position} position        端口位置（Left / Right）
 * @param {string} id                端口 id
 * @param {string} color             主题色
 */

// ========== 可调常量（均为节点本地像素，会随画布缩放自动缩放）==========
const REACH_X = 40; // 感应半椭圆向外凸出的水平半径
const REACH_Y = 46; // 感应半椭圆的垂直半径
const DOT = 22; // 浮动加号圆点直径
const REST_OUT = 14; // 停靠（未跟随）时圆点向外的落点距离

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

const PlusHandle = ({ type, position, id, color = "#1890ff" }) => {
  const zoneRef = useRef(null);
  // 节点是否被 hover（用于两侧同时显示引导点）
  const [nodeHover, setNodeHover] = useState(false);
  // 光标是否正在半椭圆感应区内（用于跟随）
  const [inZone, setInZone] = useState(false);
  // 浮动加号相对「侧边中点」的本地坐标偏移（px）
  const [dot, setDot] = useState({ x: 0, y: 0 });

  const isRight = position === Position.Right;
  const dir = isRight ? 1 : -1; // 向外为正方向
  const zoom = useStore((s) => s.transform[2]);

  // 监听所属节点的 hover，使左右两侧引导点同时出现
  useEffect(() => {
    const nodeEl = zoneRef.current?.closest(".react-flow__node");
    if (!nodeEl) return;
    const enter = () => setNodeHover(true);
    const leave = () => setNodeHover(false);
    nodeEl.addEventListener("mouseenter", enter);
    nodeEl.addEventListener("mouseleave", leave);
    return () => {
      nodeEl.removeEventListener("mouseenter", enter);
      nodeEl.removeEventListener("mouseleave", leave);
    };
  }, []);

  // 光标在感应区内时，换算到本地坐标并让圆点跟随（夹取在椭圆半径内）
  const updateDot = useCallback(
    (e) => {
      const rect = zoneRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = rect.left + rect.width / 2; // 侧边中点（屏幕坐标）
      const cy = rect.top + rect.height / 2;
      const z = zoom || 1;
      const lx = (e.clientX - cx) / z; // 屏幕偏移 ÷ zoom => 本地偏移
      const ly = (e.clientY - cy) / z;
      const along = clamp(lx * dir, 0, REACH_X); // 只在外侧凸出方向跟随
      const y = clamp(ly, -REACH_Y, REACH_Y);
      setDot({ x: along * dir, y });
    },
    [dir, zoom],
  );

  const handleEnter = useCallback(
    (e) => {
      setInZone(true);
      updateDot(e);
    },
    [updateDot],
  );

  // 离开半椭圆感应区：释放跟随，圆点归位到停靠点（若仍在节点上仍保持显示）
  const handleLeave = useCallback(() => {
    setInZone(false);
    setDot({ x: 0, y: 0 });
  }, []);

  // 圆点是否可见：节点被 hover，或光标在感应区内
  const visible = nodeHover || inZone;
  // 圆点位置：跟随时用实时偏移；否则停靠在外侧
  const dotX = inZone ? dot.x : dir * REST_OUT;
  const dotY = inZone ? dot.y : 0;

  // 外凸半椭圆（D 形）裁剪路径：包围盒宽 2*REACH_X、高 2*REACH_Y，边缘在水平中点。
  // 仅保留外侧半椭圆（sweep=1 向右凸 / sweep=0 向左凸），内半侧裁掉不遮挡节点。
  const H = REACH_Y * 2;
  const sweep = isRight ? 1 : 0;
  const clipPath = `path('M ${REACH_X} 0 A ${REACH_X} ${REACH_Y} 0 0 ${sweep} ${REACH_X} ${H} Z')`;

  return (
    <>
      {/* 半椭圆感应区（同时也是连线 Handle）——透明、被裁成 D 形 */}
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
          width: REACH_X * 2,
          height: H,
          top: "50%",
          left: isRight ? "100%" : 0,
          transform: "translate(-50%, -50%)",
          borderRadius: 0,
          border: "none",
          background: "transparent",
          minWidth: 0,
          minHeight: 0,
          cursor: "crosshair",
          clipPath,
          zIndex: 5,
        }}
      />

      {/* 浮动加号圆点：作为 Handle 的兄弟节点渲染，永不被裁切、始终完整显示 */}
      {visible && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: isRight ? "100%" : 0,
            // 先移动到侧边中点，再叠加偏移，最后居中自身
            transform: `translate(calc(-50% + ${dotX}px), calc(-50% + ${dotY}px))`,
            width: DOT,
            height: DOT,
            borderRadius: "50%",
            background: color,
            border: "2px solid #1f1f1f",
            boxShadow: `0 0 0 4px ${color}44, 0 2px 8px rgba(0,0,0,0.5)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            // 圆点不接收指针事件，按下事件透传给底层 Handle 以原生拖出连线
            pointerEvents: "none",
            // 仅对位移做过渡，形成轻微「磁吸吸附」缓动
            transition: "transform 0.08s ease-out",
            willChange: "transform",
            zIndex: 6,
          }}
        >
          <PlusOutlined style={{ fontSize: 12, color: "#fff" }} />
        </div>
      )}
    </>
  );
};

export default PlusHandle;
