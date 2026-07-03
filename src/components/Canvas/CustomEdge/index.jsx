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
const STROKE_WIDTH = 2; // 连接线线宽
const HIT_EXTEND = 4; // 有效命中范围：向线条两侧各扩展 4px
const HOVER_DELAY = 3000; // 悬停满 3 秒后显示删除图标
const DELETE_SIZE = 24; // 删除图标直径
const SAMPLE = 48; // 采样点数量（用于计算光标到贝塞尔曲线的距离）

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

  // 用于测量「光标到曲线距离」的离屏 path 元素（随 edgePath 变化重建）
  const measurePath = useMemo(() => {
    if (typeof document === "undefined") return null;
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", edgePath);
    return p;
  }, [edgePath]);

  // 计算画布坐标点到曲线的最近距离（画布坐标单位）
  const distanceToPath = useCallback(
    (fx, fy) => {
      if (!measurePath) return Infinity;
      const total = measurePath.getTotalLength();
      let min = Infinity;
      for (let i = 0; i <= SAMPLE; i++) {
        const pt = measurePath.getPointAtLength((total * i) / SAMPLE);
        const d = Math.hypot(pt.x - fx, pt.y - fy);
        if (d < min) min = d;
      }
      return min;
    },
    [measurePath],
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
      // 命中容差换算到画布坐标：屏幕像素 / zoom
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
        style={{
          stroke: isActive ? "#666666" : "#ffffff",
          strokeWidth: STROKE_WIDTH,
          pointerEvents: "none",
        }}
      />

      {/* 透明加宽交互路径：命中范围 = 线条 ±4px */}
      <path
        d={edgePath}
        fill="none"
        strokeOpacity={0}
        strokeWidth={STROKE_WIDTH + HIT_EXTEND * 2}
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
