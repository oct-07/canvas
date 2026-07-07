import { DeleteOutlined } from "@ant-design/icons";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useInternalNode,
  useReactFlow,
  useStore,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// 引入全局仓库
import useCanvasStore from "@/store/canvasStore";

// ========== 可调常量 ==========
const HIT_EXTEND = 16; // 命中范围：向线条两侧各扩展（flow 单位），屏宽容差 ≈ (STROKE_WIDTH/2 + HIT_EXTEND) / zoom 像素
const HOVER_DELAY = 400; // 悬停 N ms 后显示删除图标
const DELETE_SIZE = 24; // 删除图标直径
const STROKE_WIDTH = 2; // 连接线线宽
const SAMPLE = 128; // 采样点数量（沿线等弧长采样，用于最近距离判定；预算到内存，无 DOM 读）

/**
 * 计算连接线端点的真实锚点（= Handle 包围盒中心 = 节点边缘）。
 *
 * 背景：ReactFlow 的 getHandlePosition 对 Right 端返回「包围盒右边缘」、对 Left 端
 * 返回「包围盒左边缘」，而 Point 组件的感应区 Handle 尺寸较大且以节点边缘为中心，
 * 因此 ReactFlow 给出的 sourceX/targetX 会落在节点边缘之外，造成连线与节点之间的间隙。
 * 这里改用 Handle 包围盒中心重算端点，使连线精准贴合节点边缘（不修改 Point 组件本身）。
 */
function getEdgeAnchor(internalNode, handleType, handleId, fallbackX, fallbackY) {
  const bounds = internalNode?.internals?.handleBounds;
  const list = handleType === "source" ? bounds?.source : bounds?.target;
  if (!list || list.length === 0) return { x: fallbackX, y: fallbackY };
  const handle = handleId ? list.find((h) => h.id === handleId) : list[0];
  if (!handle) return { x: fallbackX, y: fallbackY };
  const pos = internalNode.internals.positionAbsolute;
  return {
    x: pos.x + handle.x + handle.width / 2,
    y: pos.y + handle.y + handle.height / 2,
  };
}

export default function CustomEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  sourceHandleId,
  targetHandleId,
  animated,
}) {
  const { setEdges, screenToFlowPosition } = useReactFlow();

  // ========== 全局状态读取 ==========
  const selectedEdgeId = useCanvasStore((state) => state.selectedEdgeId);
  const setActiveEdgeId = useCanvasStore((state) => state.setActiveEdgeId);
  // 全局唯一删除图标所属连线（保证全局最多 1 个）
  const hoverDeleteEdgeId = useCanvasStore((state) => state.hoverDeleteEdgeId);
  const setHoverDeleteEdgeId = useCanvasStore(
    (state) => state.setHoverDeleteEdgeId,
  );

  const isActive = selectedEdgeId === id;
  const zoom = useStore((s) => s.transform[2]);

  // ========== 问题1：端点校准，消除连线与节点的衔接间隙 ==========
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  const sAnchor = getEdgeAnchor(
    sourceNode,
    "source",
    sourceHandleId,
    sourceX,
    sourceY,
  );
  const tAnchor = getEdgeAnchor(
    targetNode,
    "target",
    targetHandleId,
    targetX,
    targetY,
  );

  // 生成贝塞尔曲线（仅端点位置被校准，曲率/弯曲形态逻辑保持不变）
  const [edgePath] = getBezierPath({
    sourceX: sAnchor.x,
    sourceY: sAnchor.y,
    targetX: tAnchor.x,
    targetY: tAnchor.y,
    sourcePosition,
    targetPosition,
  });

  // ========== 问题2：悬停跟随式删除按钮 ==========
  const timerRef = useRef(null);
  const [engaged, setEngaged] = useState(false); // 光标是否处于连线有效区域内
  const [cursor, setCursor] = useState(null); // 光标在画布坐标系中的实时位置
  const showDelete = hoverDeleteEdgeId === id;

  // 预算好的采样点 + 累计弧长（替代每帧调用 SVG.getPointAtLength，性能更稳）
  // 仅在 edgePath 变化时重建一次。
  const sampleTable = useMemo(() => {
    if (typeof document === "undefined") return null;
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", edgePath);
    const total = p.getTotalLength();
    const points = new Array(SAMPLE + 1);
    const cumLens = new Array(SAMPLE + 1);
    cumLens[0] = 0;
    for (let i = 0; i <= SAMPLE; i++) {
      const pt = p.getPointAtLength((total * i) / SAMPLE);
      points[i] = pt;
      cumLens[i] = (total * i) / SAMPLE;
    }
    return { points, cumLens, total };
  }, [edgePath]);

  // 计算画布坐标点到曲线的最近距离（画布坐标单位）。
  // 思路：先用二分查找定位到距离光标「弧长最近」的采样段，再在该段线性插值细找一点；
  // 全程纯数组运算，不读写 DOM。
  const distanceToPath = useCallback(
    (fx, fy) => {
      const table = sampleTable;
      if (!table) return Infinity;
      const { points, cumLens, total } = table;
      if (total === 0) return Math.hypot(points[0].x - fx, points[0].y - fy);

      let best = Infinity;

      // 1) 找最近采样段（二分）
      let lo = 0;
      let hi = SAMPLE;
      // 先用相邻段中点距最小的近似定位（O(SAMPLE) 一次最多 128 次，可接受；保留字面逻辑）
      let approxIdx = 0;
      let approxMin = Infinity;
      for (let i = 0; i < SAMPLE; i++) {
        const a = points[i];
        const b = points[i + 1];
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const d = Math.hypot(mx - fx, my - fy);
        if (d < approxMin) {
          approxMin = d;
          approxIdx = i;
        }
      }
      // 2) 在该段以及左右各 1 段做线性插值（3 段覆盖）
      for (let k = -1; k <= 1; k++) {
        const i = approxIdx + k;
        if (i < 0 || i >= SAMPLE) continue;
        const a = points[i];
        const b = points[i + 1];
        // 将光标投影到 ab 上，取最近点
        const vx = b.x - a.x;
        const vy = b.y - a.y;
        const segLen2 = vx * vx + vy * vy;
        if (segLen2 === 0) {
          const d = Math.hypot(a.x - fx, a.y - fy);
          if (d < best) best = d;
          continue;
        }
        const t = Math.max(
          0,
          Math.min(
            1,
            ((fx - a.x) * vx + (fy - a.y) * vy) / segLen2,
          ),
        );
        const px = a.x + vx * t;
        const py = a.y + vy * t;
        const d = Math.hypot(px - fx, py - fy);
        if (d < best) best = d;
      }
      return best;
    },
    [sampleTable],
  );

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // 退出连线有效区域：重置计时、隐藏图标
  const disengage = useCallback(() => {
    clearTimer();
    setEngaged(false);
    setCursor(null);
    if (useCanvasStore.getState().hoverDeleteEdgeId === id) {
      setHoverDeleteEdgeId(null);
    }
  }, [clearTimer, id, setHoverDeleteEdgeId]);

  // 进入连线有效区域：开始 3 秒计时
  const handleAreaEnter = useCallback(
    (e) => {
      setCursor(screenToFlowPosition({ x: e.clientX, y: e.clientY }));
      setEngaged(true);
      clearTimer();
      timerRef.current = setTimeout(() => {
        setHoverDeleteEdgeId(id);
      }, HOVER_DELAY);
    },
    [clearTimer, id, screenToFlowPosition, setHoverDeleteEdgeId],
  );

  // 处于有效区域时，用文档级 pointermove 统一处理「跟随 + 离开判定」，
  // 从而不受删除图标（覆盖在光标上）遮挡的影响。
  useEffect(() => {
    if (!engaged) return;
    const onMove = (e) => {
      const flow = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      // 屏容差恒定 = (可视化线宽 / 2 + 命中扩展) 像素 → flow 坐标除以 zoom。
      // 与下方透明 stroke 路径的命中宽度保持一致，避免两种容差基准造成"鼠标停在
      // 线上却不断 enter/leave 抖动"。
      const tol = (STROKE_WIDTH / 2 + HIT_EXTEND) / (zoom || 1);
      if (distanceToPath(flow.x, flow.y) <= tol) {
        // 仍在有效区域：图标跟随光标（不重置计时）
        setCursor(flow);
      } else {
        // 移出有效区域：立即重置并隐藏
        disengage();
      }
    };
    document.addEventListener("pointermove", onMove);
    return () => document.removeEventListener("pointermove", onMove);
  }, [engaged, zoom, distanceToPath, screenToFlowPosition, disengage]);

  // 卸载时清理计时器
  useEffect(() => clearTimer, [clearTimer]);

  /**
   * 全局兜底：在「未 engaged」状态下，任何鼠标移动只要落在本 Edge 容差内，
   * 就启动悬停计时。这样可以兜住以下场景：
   *   1. 透明 path 的 mouseenter 因上方节点 / 其它事件层被吞；
   *   2. 删除按钮刚刚消失、用户原位停留时（这里 engaged 仍为 false）需要再次进入。
   * 一旦 hovered 标记位，就启计时；engaged 状态由独立的 document.pointermove 维持。
   */
  const handleDocPointerMoveIdle = useCallback(
    (e) => {
      if (engaged) return;
      if (hoverDeleteEdgeId === id) return;
      const flow = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const tol = (STROKE_WIDTH / 2 + HIT_EXTEND) / (zoom || 1);
      if (distanceToPath(flow.x, flow.y) <= tol) {
        // 等价于 handleAreaEnter，但去掉对 setEngaged / setCursor 的依赖重复
        setEngaged(true);
        setCursor(flow);
        clearTimer();
        timerRef.current = setTimeout(() => {
          setHoverDeleteEdgeId(id);
        }, HOVER_DELAY);
      }
    },
    [
      engaged,
      hoverDeleteEdgeId,
      id,
      zoom,
      distanceToPath,
      screenToFlowPosition,
      clearTimer,
      setHoverDeleteEdgeId,
    ],
  );

  useEffect(() => {
    document.addEventListener("pointermove", handleDocPointerMoveIdle);
    return () =>
      document.removeEventListener("pointermove", handleDocPointerMoveIdle);
  }, [handleDocPointerMoveIdle]);

  // 删除连线：立即移除并隐藏图标
  const handleDeleteEdge = useCallback(
    (e) => {
      e.stopPropagation();
      clearTimer();
      setHoverDeleteEdgeId(null);
      setEdges((edgesList) => edgesList.filter((edge) => edge.id !== id));
    },
    [clearTimer, id, setEdges, setHoverDeleteEdgeId],
  );

  // 点击连线：互斥单选
  const handleEdgeClick = useCallback(
    (e) => {
      e.stopPropagation();
      setActiveEdgeId(isActive ? null : id);
    },
    [isActive, id, setActiveEdgeId],
  );

  return (
    <>
      {/* 可见连线（本身不接收指针事件，命中交给下方加宽的透明路径） */}
      <BaseEdge
        id={id}
        path={edgePath}
        interactionWidth={0}
        style={
          isActive && !animated
            ? { stroke: "#666666", strokeWidth: STROKE_WIDTH, pointerEvents: "none" }
            : { strokeWidth: STROKE_WIDTH, pointerEvents: "none" }
        }
        animated={animated}
      />

      {/* 透明加宽交互路径：命中范围 = 线条 ±HIT_EXTEND flow 单位（屏容差 ≈
          (STROKE_WIDTH/2 + HIT_EXTEND) 像素，按 1/zoom 补偿）。
          该路径位于 ReactFlow 视口变换层内，自动适配画布的缩放与平移。
          注意：本组件另在 document 上挂了 pointermove 监听做兜底，当本
          path 的 mouseenter 因上层节点拦截而未触发时，仍能进入悬停状态。 */}
      <path
        d={edgePath}
        fill="none"
        strokeOpacity={0}
        strokeWidth={(STROKE_WIDTH + HIT_EXTEND * 2) / (zoom || 1)}
        className="react-flow__edge-interaction"
        style={{ cursor: "pointer", pointerEvents: "stroke" }}
        onClick={handleEdgeClick}
        onMouseEnter={handleAreaEnter}
      />

      {/* 删除图标：实时跟随光标显示，层级高于连线 */}
      {showDelete && cursor && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${cursor.x}px, ${cursor.y}px)`,
              pointerEvents: "all",
              width: DELETE_SIZE,
              height: DELETE_SIZE,
              borderRadius: "50%",
              background: "#262626",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              zIndex: 9999,
            }}
            className="nodrag nopan"
            onClick={handleDeleteEdge}
          >
            <DeleteOutlined style={{ fontSize: 14 }} />
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
