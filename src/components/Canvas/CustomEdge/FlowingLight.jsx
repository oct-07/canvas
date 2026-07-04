import { memo } from "react";

/**
 * 连接线「流光」效果
 * ---------------------------------------------------------------------------
 * 在给定的贝塞尔路径 `path` 上叠加一条由起点流向终点的蓝色流动光带：
 *   1. 光晕拖尾层：较宽、较柔和（高斯模糊），形成一节流光的渐变尾巴与光晕；
 *   2. 明亮内核层：较细、较亮，位于每一节流光的前端，形成「头亮尾淡」的方向感。
 * 两层使用相同的虚线节奏（实体 + 间隔）并同步做 stroke-dashoffset 动画，
 * 于是呈现「一节一节、彼此间隔、持续流动」的效果（详见截图）。
 *
 * 复用场景：
 *   - 已连接的连线：悬停 / 选中时开启（CustomEdge）
 *   - 拖拽中的连接线：拖拽过程常驻（CustomConnectionLine）
 */

// ===== 可调常量（单位：flow 画布坐标，会随缩放一起视觉缩放）=====
const DASH = 4; // 每一节流光「实体」长度
const GAP = 28; // 相邻两节流光之间的间隔
const CELL = DASH + GAP; // 一个循环周期长度，用于无缝衔接的位移量
const DURATION = 1; // 单个周期流动耗时（秒），越小越快

// 颜色（蓝色高亮，控制在整体蓝色点缀色系内）
const GLOW_COLOR = "#4a9eff"; // 光晕拖尾
const CORE_COLOR = "#dcecff"; // 明亮内核

function FlowingLightBase({ path, edgeId, glowWidth = 6, coreWidth = 2 }) {
  const filterId = `rf-flow-glow-${edgeId}`;

  // dashoffset 动画位移量 / 时长，通过 CSS 变量传入 keyframes，
  // 使实际虚线节奏与位移周期严格一致（无缝循环）。
  const dashVars = {
    "--rf-flow-cell": CELL,
    "--rf-flow-duration": `${DURATION}s`,
  };

  return (
    <g className="rf-flow-light" style={{ pointerEvents: "none" }}>
      <defs>
        {/* 让虚线的每一节实体产生柔和光晕（模糊后与原图叠加） */}
        <filter
          id={filterId}
          x="-60%"
          y="-60%"
          width="220%"
          height="220%"
          filterUnits="objectBoundingBox"
        >
          <feGaussianBlur stdDeviation="2.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* 光晕拖尾层：宽、柔、半透明 */}
      <path
        d={path}
        fill="none"
        stroke={GLOW_COLOR}
        strokeWidth={glowWidth}
        strokeLinecap="round"
        strokeOpacity={0.55}
        strokeDasharray={`${DASH} ${GAP}`}
        filter={`url(#${filterId})`}
        className="rf-flow-dash"
        style={dashVars}
      />

      {/* 明亮内核层：细、亮，形成每节流光的「头部高光」 */}
      <path
        d={path}
        fill="none"
        stroke={CORE_COLOR}
        strokeWidth={coreWidth}
        strokeLinecap="round"
        strokeOpacity={0.95}
        strokeDasharray={`${DASH} ${GAP}`}
        className="rf-flow-dash"
        style={dashVars}
      />
    </g>
  );
}

const FlowingLight = memo(FlowingLightBase);
export default FlowingLight;
