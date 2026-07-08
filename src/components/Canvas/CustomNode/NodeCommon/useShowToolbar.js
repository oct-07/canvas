import useCanvasStore from "@/store/canvasStore";

/**
 * 单一选中判断
 * 仅在「当前节点被 ReactFlow 选中 + store 焦点 id 等于当前 + 画布上 selected 节点数 == 1」时为 true。
 * 用于 NodeToolbar 的 showToolbar，避免多选时多个节点同时浮出工具栏。
 *
 * @param {string} id 节点 ID
 * @param {boolean} reactFlowSelected React Flow 传入的 selected
 * @returns {boolean} 是否展示工具栏
 */
export const useShowToolbar = (id, reactFlowSelected) => {
  const selectedNodeId = useCanvasStore((state) => state.selectedNodeId);
  const selectedCount = useCanvasStore(
    (state) => (state.nodes ?? []).filter((n) => n.selected).length,
  );
  return (
    reactFlowSelected === true && selectedNodeId === id && selectedCount === 1
  );
};

export default useShowToolbar;
