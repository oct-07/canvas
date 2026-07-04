import { memo, useMemo } from "react";

/**
 * 连接线「流星」效果（两端渐隐的透明度渐变）
 * ---------------------------------------------------------------------------
 * 在给定贝塞尔路径 `path` 上叠加一束蓝色高光，像流星一样从起点滑向终点后循环。
 * 关键：整束高光在「前端渐入、尾端渐出」——即沿行进方向呈透明度渐变（见截图圈注）。
 *
 * 实现要点：
 *   - `pathLength={1}` 把路径长度归一化为 1，dash 单位即「路径占比」，故无论连线
 *     长短，流星长度恒为固定占比、同一时刻只出现一束；
 *   - 用「多层同心居中、长度由长到短递减」的虚线叠加：中段被最多层覆盖 → 最亮，
 *     越靠两端覆盖层数越少 → 越透明，从而形成两端渐隐的透明度渐变；
 *   - 每层长度不同，为保持居中，需各自向前偏移 (COMET-L)/2，通过 CSS 变量
 *     `--rf-off-from/--rf-off-to` 注入 keyframes；各层位移量恒等于一个周期 PERIOD，
 *     因此所有层完全同步，整体呈现为「一束」；
 *   - 另叠两层加宽并模糊的光晕，营造柔和辉光。
 *
 * 复用场景：
 *   - 已连接的连线：悬停 / 选中时开启（CustomEdge）
 *   - 拖拽中的连接线：拖拽过程常驻（CustomConnectionLine）
 */

// ===== 可调常量 =====
const COMET = 0.2; // 流星整体长度（占整条路径的比例）
const PERIOD = 1 + COMET; // 单个循环位移量（流星长 + 间隔 1，保证同时只有一束）
const DURATION = 1.7; // 流星扫完整条路径的耗时（秒），越小越快
const CORE_LAYERS = 6; // 亮核同心层数（越多渐变越细腻）

// 颜色（蓝色高亮，控制在整体蓝色点缀色系内）
const GLOW_COLOR = "#3d8bff"; // 光晕
const CORE_EDGE = "#8fc2ff"; // 流星较长层（偏蓝）
const CORE_MID = "#eaf3ff"; // 流星最短层（近白蓝，最亮中心）

/** 线性插值两个 #rrggbb 颜色 */
function lerpColor(a, b, t) {
  const pa = [parseInt(a.slice(1, 3), 16), parseInt(a.slice(3, 5), 16), parseInt(a.slice(5, 7), 16)];
  const pb = [parseInt(b.slice(1, 3), 16), parseInt(b.slice(3, 5), 16), parseInt(b.slice(5, 7), 16)];
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

function FlowingLightBase({ path, glowWidth = 7, coreWidth = 2.2 }) {
  // 生成所有图层：2 层光晕 + N 层同心亮核
  const layers = useMemo(() => {
    const list = [];

    // 单层的 dash / 居中偏移配置（length 为该层流星长度占比）
    const build = (length) => {
      const shift = (COMET - length) / 2; // 短层向前偏移以与整束居中对齐
      return {
        strokeDasharray: `${length} ${PERIOD - length}`,
        style: {
          "--rf-off-from": PERIOD - shift,
          "--rf-off-to": -shift,
          "--rf-meteor-duration": `${DURATION}s`,
        },
      };
    };

    // 光晕层（最宽、最柔、半透明）——用整束长度，模糊扩散
    list.push({
      key: "glow-outer",
      ...build(COMET),
      stroke: GLOW_COLOR,
      strokeWidth: glowWidth,
      strokeOpacity: 0.3,
      blur: 4,
    });
    list.push({
      key: "glow-inner",
      ...build(COMET),
      stroke: GLOW_COLOR,
      strokeWidth: glowWidth * 0.55,
      strokeOpacity: 0.55,
      blur: 1.6,
    });

    // 亮核同心层：长度由 COMET 递减到 COMET*0.18，叠加成中段亮、两端渐隐
    for (let i = 0; i < CORE_LAYERS; i += 1) {
      const t = i / (CORE_LAYERS - 1); // 0(最长) → 1(最短)
      const length = COMET * (1 - 0.82 * t);
      list.push({
        key: `core-${i}`,
        ...build(length),
        stroke: lerpColor(CORE_EDGE, CORE_MID, t),
        strokeWidth: coreWidth,
        strokeOpacity: 0.32,
        blur: 0,
      });
    }

    return list;
  }, [glowWidth, coreWidth]);

  return (
    <g style={{ pointerEvents: "none" }}>
      {layers.map((l) => (
        <path
          key={l.key}
          d={path}
          pathLength={1}
          fill="none"
          strokeLinecap="round"
          className="rf-meteor"
          stroke={l.stroke}
          strokeWidth={l.strokeWidth}
          strokeOpacity={l.strokeOpacity}
          strokeDasharray={l.strokeDasharray}
          style={l.blur ? { ...l.style, filter: `blur(${l.blur}px)` } : l.style}
        />
      ))}
    </g>
  );
}

const FlowingLight = memo(FlowingLightBase);
export default FlowingLight;
