/**
 * 选区打组叠加层（视觉叠加层方案，非 ReactFlow 原生 SubFlow）
 *
 * 当画布中被框选的节点 ≥ 2 时，渲染：
 *   1. 覆盖选区的虚线选框 + 半透明填充（随 viewport 缩放/平移，使用 ViewportPortal）
 *   2. 选框左上角的可编辑组名标签
 *   3. 选框右侧居中的「组 Handle」，从此处拖线可将组内所有节点同时连接到目标节点
 *
 * 组 Handle 的拖线不走 ReactFlow 原生连线，而是自行追踪指针：
 * 拖动时用 fixed 全屏 SVG 画一条从组 Handle 到光标的预览线；
 * 松手时命中目标节点则遍历组内节点，对通过 validateConnection 的逐一建边。
 */
import useCanvasStore, { validateConnection } from "@/store/canvasStore";
import { resolveAssetMediaType } from "@/utils/modelAssetLimit";
import { PlusOutlined } from "@ant-design/icons";
import {
  useReactFlow,
  useStore,
  ViewportPortal,
} from "@xyflow/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";

// 选框相对节点包围盒的外扩内边距（flow 坐标）
const GROUP_PADDING = 28;

/** 读取节点尺寸（优先 measured，回退到默认值） */
const getNodeSize = (node) => ({
  width: node.measured?.width ?? node.width ?? 200,
  height: node.measured?.height ?? node.height ?? 120,
});

/** 构造一条组级连线 */
const buildEdge = (source, target) => ({
  source,
  target,
  sourceHandle: "output",
  targetHandle: "input",
  id: `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  type: "custom",
  animated: false,
  style: { stroke: "#434343", strokeWidth: 2 },
});

const SelectionGroup = () => {
  const { screenToFlowPosition, flowToScreenPosition } = useReactFlow();
  const zoom = useStore((s) => s.transform[2]);

  // 组状态（浅比较，避免无关渲染）
  const { activeSignature, activeGroupNodeIds, groupName, nodes } =
    useCanvasStore(
      useShallow((s) => ({
        activeSignature: s.activeSignature,
        activeGroupNodeIds: s.activeGroupNodeIds,
        groupName: s.activeSignature
          ? s.groups[s.activeSignature]?.name || "组"
          : "",
        nodes: s.nodes,
      })),
    );

  // 组名编辑态
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const nameInputRef = useRef(null);

  // 组 Handle 拖线预览
  const [dragPreview, setDragPreview] = useState(null); // { start:{x,y}, end:{x,y} }
  const dragStartRef = useRef(null);

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  // ========== 组 Handle 拖线：批量建边 ==========
  const multiConnect = useCallback((sourceIds, targetId) => {
    const store = useCanvasStore.getState();
    const latestNodes = store.nodes;

    const newEdges = [];
    const assetsForTarget = [];

    sourceIds.forEach((sourceId) => {
      const connection = {
        source: sourceId,
        target: targetId,
        sourceHandle: "output",
        targetHandle: "input",
      };
      if (!validateConnection(connection, store)) return;
      newEdges.push(buildEdge(sourceId, targetId));

      // 媒体节点：同步把素材写入目标节点 refAssetList（与单节点连线行为一致）
      const sourceNode = latestNodes.find((n) => n.id === sourceId);
      const isMediaNode =
        sourceNode && ["video", "image", "upload"].includes(sourceNode.type);
      if (isMediaNode && sourceNode?.data?.url) {
        assetsForTarget.push({
          id: `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: resolveAssetMediaType(sourceNode),
          url: sourceNode.data.url || "",
          name: sourceNode.data.name || "",
          sourceNodeId: sourceId,
        });
      }
    });

    if (newEdges.length === 0) return;

    store.setEdges([...store.edges, ...newEdges]);

    // 合并写入目标节点的 refAssetList（去重）
    if (assetsForTarget.length > 0) {
      const targetNode = latestNodes.find((n) => n.id === targetId);
      const current = targetNode?.data?.refAssetList || [];
      const merged = [...current];
      assetsForTarget.forEach((asset) => {
        if (!merged.some((a) => a.url === asset.url)) merged.push(asset);
      });
      store.updateNodeData(targetId, { refAssetList: merged });
    }

    store.saveHistory();
  }, []);

  const handleDragMove = useCallback((e) => {
    setDragPreview((prev) =>
      prev ? { ...prev, end: { x: e.clientX, y: e.clientY } } : prev,
    );
  }, []);

  const handleDragUp = useCallback(
    (e) => {
      window.removeEventListener("pointermove", handleDragMove);
      window.removeEventListener("pointerup", handleDragUp);
      document.body.style.cursor = "";

      const start = dragStartRef.current;
      dragStartRef.current = null;
      setDragPreview(null);
      if (!start) return;

      // 命中目标节点：光标落点在某个「非组内」节点包围盒内
      const flowPt = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const store = useCanvasStore.getState();
      const groupSet = new Set(start.sourceIds);

      // 逆序遍历，优先命中后渲染（更靠上）的节点
      const target = [...store.nodes].reverse().find((n) => {
        if (groupSet.has(n.id)) return false;
        const { width, height } = getNodeSize(n);
        return (
          flowPt.x >= n.position.x &&
          flowPt.x <= n.position.x + width &&
          flowPt.y >= n.position.y &&
          flowPt.y <= n.position.y + height
        );
      });

      if (target) multiConnect(start.sourceIds, target.id);
    },
    [screenToFlowPosition, handleDragMove, multiConnect],
  );

  const handleGroupHandleDown = useCallback(
    (e, handleScreenPos) => {
      e.stopPropagation();
      e.preventDefault();
      // 阻止 ReactFlow 挂在 pane 上的原生 D3 拖拽/框选监听接管此次按下
      e.nativeEvent?.stopImmediatePropagation?.();
      dragStartRef.current = { sourceIds: [...activeGroupNodeIds] };
      setDragPreview({
        start: handleScreenPos,
        end: { x: e.clientX, y: e.clientY },
      });
      document.body.style.cursor = "crosshair";
      window.addEventListener("pointermove", handleDragMove);
      window.addEventListener("pointerup", handleDragUp);
    },
    [activeGroupNodeIds, handleDragMove, handleDragUp],
  );

  // 卸载时清理监听
  useEffect(
    () => () => {
      window.removeEventListener("pointermove", handleDragMove);
      window.removeEventListener("pointerup", handleDragUp);
    },
    [handleDragMove, handleDragUp],
  );

  // 无激活组 → 不渲染
  if (!activeSignature || activeGroupNodeIds.length < 2) return null;

  const groupNodes = nodes.filter((n) => activeGroupNodeIds.includes(n.id));
  if (groupNodes.length < 2) return null;

  // ========== 计算选区包围盒（flow 坐标） ==========
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  groupNodes.forEach((n) => {
    const { width, height } = getNodeSize(n);
    left = Math.min(left, n.position.x);
    top = Math.min(top, n.position.y);
    right = Math.max(right, n.position.x + width);
    bottom = Math.max(bottom, n.position.y + height);
  });

  const boxX = left - GROUP_PADDING;
  const boxY = top - GROUP_PADDING;
  const boxW = right - left + GROUP_PADDING * 2;
  const boxH = bottom - top + GROUP_PADDING * 2;

  // 组 Handle 中心（flow 坐标）：选框右侧居中
  const handleFlowX = boxX + boxW;
  const handleFlowY = boxY + boxH / 2;

  // 反向缩放：让组名/Handle 在任意缩放下保持恒定屏幕尺寸
  const inv = 1 / (zoom || 1);

  return (
    <>
      <ViewportPortal>
        {/* 选框叠加层：虚线边框 + 半透明填充。pointerEvents:none 不遮挡节点交互 */}
        <div
          style={{
            position: "absolute",
            transform: `translate(${boxX}px, ${boxY}px)`,
            width: boxW,
            height: boxH,
            border: "1px dashed rgba(255,255,255,0.45)",
            borderRadius: 8,
            background: "rgba(255,255,255,0.03)",
            pointerEvents: "none",
            zIndex: 4,
          }}
        />

        {/* 组名标签：选框左上角外侧，反向缩放保持恒定尺寸，可点击编辑 */}
        <div
          className="nopan nodrag nowheel"
          style={{
            position: "absolute",
            transform: `translate(${boxX}px, ${boxY}px) scale(${inv})`,
            transformOrigin: "left bottom",
            top: -30,
            left: 0,
            pointerEvents: "all",
            zIndex: 6,
          }}
        >
          {editingName ? (
            <input
              ref={nameInputRef}
              value={nameDraft}
              onChange={(ev) => setNameDraft(ev.target.value)}
              onBlur={() => {
                useCanvasStore
                  .getState()
                  .renameGroup(activeSignature, nameDraft);
                setEditingName(false);
              }}
              onKeyDown={(ev) => {
                if (ev.key === "Enter") ev.currentTarget.blur();
                if (ev.key === "Escape") setEditingName(false);
              }}
              onClick={(ev) => ev.stopPropagation()}
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "#fff",
                background: "rgba(38,38,38,0.95)",
                border: "1px solid #177ddc",
                borderRadius: 6,
                padding: "2px 8px",
                outline: "none",
                minWidth: 80,
              }}
            />
          ) : (
            <span
              onClick={(ev) => {
                ev.stopPropagation();
                setNameDraft(groupName);
                setEditingName(true);
              }}
              style={{
                display: "inline-block",
                fontSize: 12,
                fontWeight: 500,
                color: "rgba(255,255,255,0.85)",
                background: "rgba(38,38,38,0.7)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 6,
                padding: "2px 8px",
                cursor: "text",
                whiteSpace: "nowrap",
                userSelect: "none",
              }}
              title="点击修改组名"
            >
              {groupName}
            </span>
          )}
        </div>

        {/* 组 Handle：选框右侧居中的圆形连接点，反向缩放保持恒定尺寸 */}
        <div
          className="nopan nodrag nowheel"
          onPointerDownCapture={(e) => {
            const screenPos = flowToScreenPosition({
              x: handleFlowX,
              y: handleFlowY,
            });
            handleGroupHandleDown(e, screenPos);
          }}
          style={{
            position: "absolute",
            transform: `translate(${handleFlowX}px, ${handleFlowY}px) scale(${inv})`,
            transformOrigin: "center center",
            marginLeft: -14,
            marginTop: -14,
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "#177ddc",
            border: "2px solid #1f1f1f",
            boxShadow: "0 0 0 4px rgba(23,125,220,0.25), 0 2px 8px rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "crosshair",
            pointerEvents: "all",
            zIndex: 1001,
          }}
          title="拖动以连接组内所有节点"
        >
          <PlusOutlined style={{ fontSize: 14, color: "#fff" }} />
        </div>
      </ViewportPortal>

      {/* 组 Handle 拖线预览：fixed 全屏 SVG，从 Handle 到光标 */}
      {dragPreview && (
        <svg
          style={{
            position: "fixed",
            inset: 0,
            width: "100vw",
            height: "100vh",
            pointerEvents: "none",
            zIndex: 9998,
          }}
        >
          <path
            d={`M ${dragPreview.start.x} ${dragPreview.start.y} C ${
              dragPreview.start.x + 80
            } ${dragPreview.start.y}, ${dragPreview.end.x - 80} ${
              dragPreview.end.y
            }, ${dragPreview.end.x} ${dragPreview.end.y}`}
            stroke="#177ddc"
            strokeWidth={2}
            fill="none"
            strokeDasharray="6 4"
          />
        </svg>
      )}
    </>
  );
};

export default SelectionGroup;
