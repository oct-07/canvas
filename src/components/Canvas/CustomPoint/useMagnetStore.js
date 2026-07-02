/**
 * 连接点磁吸的临时可视化状态（独立于 canvasStore，不进入撤销/重做历史）
 *
 * 拖拽连线过程中实时写入：当前磁吸目标节点、卡片 3D 倾斜角、
 * 浮动加号手柄的屏幕坐标与可连接状态；拖拽结束后 reset。
 */
import { create } from "zustand";

const INITIAL = {
  active: false, // 是否正在拖拽连线
  targetId: null, // 当前磁吸命中的节点 id
  canConnect: false, // 该目标是否可连接
  tiltX: 0, // 卡片绕 X 轴倾斜角（deg）
  tiltY: 0, // 卡片绕 Y 轴倾斜角（deg）
  isInCard: false, // 光标是否在卡片区域内
  showHandle: false, // 是否显示浮动加号手柄（命中手柄热区）
  handleClient: null, // 浮动加号手柄的屏幕坐标 {x, y}
  handlePosition: "left", // 手柄所在侧
};

const useMagnetStore = create((set) => ({
  ...INITIAL,
  setMagnet: (payload) => set(payload),
  reset: () => set(INITIAL),
}));

export default useMagnetStore;

/**
 * 节点组件订阅自身的磁吸倾斜状态（仅命中的节点会重渲染）
 * @param {string} id 节点 id
 */
export const useNodeMagnet = (id) => {
  const isTarget = useMagnetStore((s) => s.active && s.targetId === id);
  const tiltX = useMagnetStore((s) => (s.targetId === id ? s.tiltX : 0));
  const tiltY = useMagnetStore((s) => (s.targetId === id ? s.tiltY : 0));
  const canConnect = useMagnetStore((s) =>
    s.targetId === id ? s.canConnect : false,
  );
  const isInCard = useMagnetStore((s) =>
    s.targetId === id ? s.isInCard : false,
  );
  return { isTarget, tiltX, tiltY, canConnect, isInCard };
};
