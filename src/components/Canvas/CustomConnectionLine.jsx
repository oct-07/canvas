import { getBezierPath } from "@xyflow/react";

import FlowingLight from "./CustomEdge/FlowingLight";

/**
 * 拖拽连接线（从节点拖出、尚未连接到目标节点时的临时连线）
 * ---------------------------------------------------------------------------
 * ReactFlow 在拖拽建连时会渲染该组件，并传入起点/终点坐标与朝向。
 * 这里画一条与正式连线一致的贝塞尔曲线，并叠加流光效果，
 * 让「拖出连线」的过程也具备与截图一致的蓝色流动光带。
 */
export default function CustomConnectionLine({
  fromX,
  fromY,
  toX,
  toY,
  fromPosition,
  toPosition,
}) {
  const [path] = getBezierPath({
    sourceX: fromX,
    sourceY: fromY,
    sourcePosition: fromPosition,
    targetX: toX,
    targetY: toY,
    targetPosition: toPosition,
  });

  return (
    <g>
      {/* 底线：与正式连线一致的细白线 */}
      <path
        d={path}
        fill="none"
        stroke="#ffffff"
        strokeWidth={2}
        strokeOpacity={0.35}
      />
      {/* 流光叠加 */}
      <FlowingLight path={path} edgeId="connection-line" />
    </g>
  );
}
