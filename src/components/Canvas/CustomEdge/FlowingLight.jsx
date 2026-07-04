import { memo } from "react";

/**
 * 连接线「流星」效果
 * ---------------------------------------------------------------------------
 * 在给定的贝塞尔路径 `path` 上叠加一束蓝色高光，像流星一样从起点滑向终点，
 * 到达终点后循环。整束由「亮头 + 渐隐尾」构成，营造方向感与速度感（详见截图）。
 *
 * 实现要点：
 *   - 通过 `pathLength={1}` 将路径长度归一化为 1，dash 单位即「路径占比」，
 *     于是无论连线长短，流星长度始终为路径的固定占比、一次只出现一束；
 *   - `strokeDasharray = "<流星长> 1"`：间隔取 1（≥ 全长）保证同一时刻只有一束；
 *   - `stroke-dashoffset` 从「流星长 + 1」匀速动画到 0，使这束高光从头扫到尾；
 *   - 叠三层（外光晕 / 内光晕 / 亮核）+ CSS 模糊，形成柔和的流星光晕；
 *   - 三层共用同一 dasharray 与同一动画，完全同步移动，故呈现为「一束」。
 *
 * 复用场景：
 *   - 已连接的连线：悬停 / 选中时开启（CustomEdge）
 *   - 拖拽中的连接线：拖拽过程常驻（CustomConnectionLine）
 */

// ===== 可调常量 =====
const COMET = 0.22; // 流星长度（占整条路径的比例）
const PERIOD = 1 + COMET; // dashoffset 单个循环位移量（流星长 + 间隔1）
const DURATION = 1.6; // 流星扫完整条路径的耗时（秒），越小越快

// 颜色（蓝色高亮，控制在整体蓝色点缀色系内）
const GLOW_COLOR = "#3d8bff"; // 光晕
const CORE_COLOR = "#eaf3ff"; // 亮核（近白蓝）

function FlowingLightBase({ path, glowWidth = 7, coreWidth = 2.4 }) {
  // dashoffset 动画位移量 / 时长，通过 CSS 变量传入 keyframes
  const flowVars = {
    "--rf-meteor-period": PERIOD,
    "--rf-meteor-duration": `${DURATION}s`,
  };

  // 三层共用的 dash 与动画配置（归一化坐标，dash 单位 = 路径占比）
  const common = {
    d: path,
    pathLength: 1,
    fill: "none",
    strokeLinecap: "round",
    strokeDasharray: `${COMET} 1`,
    className: "rf-meteor",
    style: flowVars,
  };

  return (
    <g style={{ pointerEvents: "none" }}>
      {/* 外层光晕：最宽、最柔、半透明 */}
      <path
        {...common}
        stroke={GLOW_COLOR}
        strokeWidth={glowWidth}
        strokeOpacity={0.35}
        style={{ ...flowVars, filter: "blur(4px)" }}
      />
      {/* 内层光晕：较窄、较亮 */}
      <path
        {...common}
        stroke={GLOW_COLOR}
        strokeWidth={glowWidth * 0.55}
        strokeOpacity={0.7}
        style={{ ...flowVars, filter: "blur(1.5px)" }}
      />
      {/* 亮核：细、亮，构成流星最亮的头部高光 */}
      <path
        {...common}
        stroke={CORE_COLOR}
        strokeWidth={coreWidth}
        strokeOpacity={0.95}
      />
    </g>
  );
}

const FlowingLight = memo(FlowingLightBase);
export default FlowingLight;
