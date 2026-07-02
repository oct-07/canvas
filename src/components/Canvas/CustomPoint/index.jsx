/**
 * CustomPoint —— 连接点磁吸交互 Demo（参考 libLib Canvas 的 Point 组件）
 *
 * 从卡片两侧的连接点（Handle）按下并拖拽连线时：
 *   - 磁吸浮动加号：光标接近目标节点的手柄热区时，加号手柄向光标浮动 (handleFloat)
 *   - 卡片 3D 倾斜：光标进入卡片区域时，卡片按 cardTilt 做透视倾斜
 *   - 可连 / 不可连反馈：根据 canConnect 显示绿色可连或红色禁止状态
 *
 * 核心算法位于 ./magnet.js（纯函数，可被真实 Canvas 复用）。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { findBestConnectionTarget } from "./magnet";

// ========== 初始节点数据（flow 坐标系 == 像素坐标） ==========
const INITIAL_NODES = [
  { id: "n1", x: 120, y: 90, width: 180, height: 130, title: "输入 · 提示词", kind: "input", accent: "#5b8cff" },
  { id: "n2", x: 460, y: 70, width: 200, height: 150, title: "处理 · 风格迁移", kind: "process", accent: "#4ade80" },
  { id: "n3", x: 460, y: 300, width: 200, height: 150, title: "处理 · 放大", kind: "process", accent: "#4ade80" },
  { id: "n4", x: 820, y: 200, width: 190, height: 140, title: "输出 · 成品", kind: "output", accent: "#fbbf24" },
];

const INITIAL_EDGES = [];

const COLORS = {
  bg: "#0d0d0d",
  card: "#1a1a1a",
  cardBorder: "rgba(255,255,255,0.12)",
  edge: "#5b8cff",
  valid: "#4ade80",
  invalid: "#f87171",
  handle: "#3a3a3a",
  handleBorder: "rgba(255,255,255,0.25)",
  text: "rgba(255,255,255,0.85)",
  textDim: "rgba(255,255,255,0.45)",
};

const CustomPoint = () => {
  const containerRef = useRef(null);
  const [nodes] = useState(INITIAL_NODES);
  const [edges, setEdges] = useState(INITIAL_EDGES);

  // 拖拽状态：{ startNodeId, handleType, startX, startY }
  const [drag, setDrag] = useState(null);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const dragRef = useRef(null);
  dragRef.current = drag;

  // 将屏幕坐标转换为容器内坐标（此 Demo 中 zoom=1，即 flow 坐标）
  const toLocal = useCallback((clientX, clientY) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  // 某节点某侧手柄的中心坐标
  const handleCenter = useCallback((node, side) => {
    if (side === "source") {
      return { x: node.x + node.width, y: node.y + node.height / 2 };
    }
    return { x: node.x, y: node.y + node.height / 2 };
  }, []);

  // 开始拖拽连线
  const startDrag = useCallback(
    (e, nodeId, handleType) => {
      e.stopPropagation();
      e.preventDefault();
      const node = nodes.find((n) => n.id === nodeId);
      const start = handleCenter(node, handleType);
      setDrag({ startNodeId: nodeId, handleType, startX: start.x, startY: start.y });
      setCursor(toLocal(e.clientX, e.clientY));
    },
    [nodes, handleCenter, toLocal]
  );

  // 实时计算最佳连接目标
  const best = useMemo(() => {
    if (!drag) return null;
    return findBestConnectionTarget({
      flowPoint: cursor,
      startNodeId: drag.startNodeId,
      handleType: drag.handleType,
      allNodes: nodes,
      allEdges: edges,
      zoom: 1,
    });
  }, [drag, cursor, nodes, edges]);

  // 全局监听移动 / 抬起
  useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current) return;
      setCursor(toLocal(e.clientX, e.clientY));
    };
    const onUp = () => {
      const d = dragRef.current;
      if (!d) return;
      // 抬起时若命中有效目标则建立连接
      const target = findBestConnectionTarget({
        flowPoint: toLocalRef.current.point,
        startNodeId: d.startNodeId,
        handleType: d.handleType,
        allNodes: nodes,
        allEdges: edges,
        zoom: 1,
      });
      if (target && target.canConnect) {
        setEdges((prev) => [...prev, target.connection]);
      }
      setDrag(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [nodes, edges, toLocal]);

  // 保存最新光标位置供 pointerup 读取
  const toLocalRef = useRef({ point: { x: 0, y: 0 } });
  toLocalRef.current.point = cursor;

  // 生成连线路径（贝塞尔）
  const edgePath = useCallback(
    (from, to) => {
      const dx = Math.max(Math.abs(to.x - from.x) * 0.5, 40);
      return `M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`;
    },
    []
  );

  // 已建立的连线
  const renderedEdges = useMemo(
    () =>
      edges.map((edge, i) => {
        const s = nodes.find((n) => n.id === edge.source);
        const t = nodes.find((n) => n.id === edge.target);
        if (!s || !t) return null;
        const from = handleCenter(s, "source");
        const to = handleCenter(t, "target");
        return (
          <path
            key={`${edge.source}-${edge.target}-${i}`}
            d={edgePath(from, to)}
            fill="none"
            stroke={COLORS.edge}
            strokeWidth={2}
          />
        );
      }),
    [edges, nodes, handleCenter, edgePath]
  );

  // 拖拽中的临时连线（终点吸附到最佳目标手柄，否则跟随光标）
  const dragLine = useMemo(() => {
    if (!drag) return null;
    const from = { x: drag.startX, y: drag.startY };
    let to = cursor;
    let color = COLORS.edge;
    if (best) {
      if (best.showHandle) {
        to = {
          x: best.handleCenter.x + best.handleFloatX,
          y: best.handleCenter.y + best.handleFloatY,
        };
      }
      color = best.canConnect ? COLORS.valid : COLORS.invalid;
    }
    return { d: edgePath(from, to), color };
  }, [drag, cursor, best, edgePath]);

  const clearEdges = useCallback(() => setEdges([]), []);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: COLORS.bg,
        display: "flex",
        flexDirection: "column",
        color: COLORS.text,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* 工具栏 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "12px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          fontSize: 13,
        }}
      >
        <span style={{ fontWeight: 600 }}>连接点磁吸 · Anchor Point</span>
        <span style={{ color: COLORS.textDim }}>
          从卡片右侧圆点拖出连线 → 靠近目标节点感受磁吸浮动加号、卡片倾斜与可连/禁止反馈
        </span>
        <button type="button" onClick={clearEdges} style={btnStyle}>
          清空连线
        </button>
      </div>

      {/* 画布 */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          position: "relative",
          overflow: "hidden",
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
          perspective: "1200px",
        }}
      >
        {/* 连线层（SVG 覆盖整个画布） */}
        <svg
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 1,
          }}
        >
          {renderedEdges}
          {dragLine && (
            <path
              d={dragLine.d}
              fill="none"
              stroke={dragLine.color}
              strokeWidth={2.5}
              strokeDasharray="6 5"
            />
          )}
        </svg>

        {/* 节点层 */}
        {nodes.map((node) => {
          const isBest = best && best.nodeId === node.id;
          const tiltX = isBest ? best.cardTiltX : 0;
          const tiltY = isBest ? best.cardTiltY : 0;
          const feedbackColor = isBest
            ? best.canConnect
              ? COLORS.valid
              : COLORS.invalid
            : null;

          return (
            <div
              key={node.id}
              style={{
                position: "absolute",
                left: node.x,
                top: node.y,
                width: node.width,
                height: node.height,
                zIndex: 2,
                transformStyle: "preserve-3d",
                transform: `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
                transition: drag ? "transform 0.08s ease-out" : "transform 0.2s ease-out",
              }}
            >
              {/* 卡片主体 */}
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: COLORS.card,
                  border: `1.5px solid ${feedbackColor || COLORS.cardBorder}`,
                  borderRadius: 12,
                  boxShadow: isBest
                    ? `0 0 0 3px ${feedbackColor}33, 0 12px 30px rgba(0,0,0,0.5)`
                    : "0 6px 18px rgba(0,0,0,0.35)",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}
              >
                <div
                  style={{
                    padding: "8px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: node.accent,
                    }}
                  />
                  {node.title}
                </div>
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    color: COLORS.textDim,
                  }}
                >
                  {node.kind === "input" && "无入边 · 仅可连出"}
                  {node.kind === "process" && "可连入 / 可连出"}
                  {node.kind === "output" && "无出边 · 仅可连入"}
                </div>
              </div>

              {/* 左侧连接点（target） */}
              {node.kind !== "input" && (
                <HandleDot
                  side="left"
                  onPointerDown={(e) => startDrag(e, node.id, "target")}
                />
              )}
              {/* 右侧连接点（source） */}
              {node.kind !== "output" && (
                <HandleDot
                  side="right"
                  onPointerDown={(e) => startDrag(e, node.id, "source")}
                />
              )}
            </div>
          );
        })}

        {/* 磁吸浮动加号手柄（覆盖在最佳目标的热点侧） */}
        {best && best.showHandle && (
          <div
            style={{
              position: "absolute",
              left:
                best.handleCenter.x +
                best.handleFloatX -
                (best.handlePosition === "left" ? 0 : 0),
              top: best.handleCenter.y + best.handleFloatY,
              transform: "translate(-50%, -50%)",
              zIndex: 5,
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: best.canConnect ? COLORS.valid : COLORS.invalid,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0d0d0d",
                fontSize: 18,
                fontWeight: 700,
                boxShadow: `0 0 0 4px ${
                  (best.canConnect ? COLORS.valid : COLORS.invalid) + "40"
                }`,
                transition: "background 0.1s",
              }}
            >
              {best.canConnect ? "+" : "×"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// 连接点圆点（卡片左右两侧中点）
const HandleDot = ({ side, onPointerDown }) => (
  <div
    onPointerDown={onPointerDown}
    style={{
      position: "absolute",
      top: "50%",
      [side]: 0,
      transform: `translate(${side === "left" ? "-50%" : "50%"}, -50%)`,
      width: 14,
      height: 14,
      borderRadius: "50%",
      background: COLORS.handle,
      border: `2px solid ${COLORS.handleBorder}`,
      cursor: "crosshair",
      zIndex: 3,
    }}
  />
);

const btnStyle = {
  marginLeft: "auto",
  padding: "5px 12px",
  background: "#262626",
  color: "rgba(255,255,255,0.85)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 6,
  fontSize: 12,
  cursor: "pointer",
};

export default CustomPoint;
