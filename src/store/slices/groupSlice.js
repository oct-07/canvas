/**
 * 选区打组 Slice
 *
 * 采用「视觉叠加层」方案（非 ReactFlow 原生 SubFlow）：
 * 组由当前多选节点（selected === true 且数量 ≥ 2）实时驱动，
 * 组名按「节点集合签名」持久化，从而在重复框选相同节点集合时恢复用户自定义组名。
 *
 * 关键状态：
 *   - groups：{ [signature]: { name } } 组名映射，signature = 排序后的 nodeId 用 "|" 连接
 *   - activeSignature：当前激活组签名（null 表示无组）
 *   - activeGroupNodeIds：当前激活组包含的节点 id 列表
 */

const MIN_GROUP_SIZE = 2;

/** 由节点 id 列表生成稳定签名（排序后拼接） */
export const getGroupSignature = (nodeIds) =>
  [...nodeIds].sort().join("|");

export const groupInitialState = {
  // 组名映射：{ [signature]: { name } }
  groups: {},
  // 当前激活组签名
  activeSignature: null,
  // 当前激活组节点 id 列表
  activeGroupNodeIds: [],
  // 组名自增计数（用于生成默认组名「组 N」）
  groupNameSeq: 0,
};

export const createGroupSlice = (getStore, setStore) => ({
  /**
   * 根据当前选中节点同步组状态
   * @param {string[]} selectedNodeIds 当前 selected === true 的节点 id 列表
   */
  syncSelectionGroup: (selectedNodeIds) => {
    const state = getStore();

    // 选中不足 2 个 → 取消组
    if (!selectedNodeIds || selectedNodeIds.length < MIN_GROUP_SIZE) {
      if (state.activeSignature !== null) {
        setStore({ activeSignature: null, activeGroupNodeIds: [] });
      }
      return;
    }

    const signature = getGroupSignature(selectedNodeIds);

    // 已是当前激活组 → 仅更新节点列表（顺序可能变化）
    if (signature === state.activeSignature) {
      setStore({ activeGroupNodeIds: selectedNodeIds });
      return;
    }

    // 新组：若无组名记录则生成默认组名「组 N」
    if (!state.groups[signature]) {
      const seq = state.groupNameSeq + 1;
      setStore({
        groups: { ...state.groups, [signature]: { name: `组 ${seq}` } },
        groupNameSeq: seq,
        activeSignature: signature,
        activeGroupNodeIds: selectedNodeIds,
      });
    } else {
      setStore({
        activeSignature: signature,
        activeGroupNodeIds: selectedNodeIds,
      });
    }
  },

  /**
   * 重命名当前/指定组
   * @param {string} signature 组签名
   * @param {string} name 新组名
   */
  renameGroup: (signature, name) => {
    const trimmed = (name || "").trim();
    if (!trimmed) return;
    setStore((state) => ({
      groups: {
        ...state.groups,
        [signature]: { ...(state.groups[signature] || {}), name: trimmed },
      },
    }));
  },

  /** 清除激活组（不删除组名记录） */
  clearActiveGroup: () =>
    setStore({ activeSignature: null, activeGroupNodeIds: [] }),

  /** 读取当前激活组信息 */
  getActiveGroup: () => {
    const { activeSignature, groups, activeGroupNodeIds } = getStore();
    if (!activeSignature) return null;
    return {
      signature: activeSignature,
      name: groups[activeSignature]?.name || "组",
      nodeIds: activeGroupNodeIds,
    };
  },
});
