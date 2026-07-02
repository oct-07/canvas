/**
 * 连接点磁吸交互 hook：把 magnet.js 算法接入真实 ReactFlow 画布
 *
 * - onConnectStart：记录拖拽起点，监听指针移动
 * - 指针移动：将屏幕坐标转为 flow 坐标，运行 findBestConnectionTarget，
 *   写入 useMagnetStore 驱动可视化（浮动加号 / 卡片倾斜 / 可连反馈）
 * - onConnectEnd：若光标落在有效目标的热区/卡片内则建立连线
 * - markNativeConnect：ReactFlow 原生「精确落在手柄」的连线已处理时打标，避免重复建边
 */
import { useCallback, useEffect, useRef } from "react";
import { useReactFlow } from "@xyflow/react";

import useCanvasStore, { validateConnection } from "@/store/canvasStore";
import { findBestConnectionTarget } from "./magnet";
import useMagnetStore from "./useMagnetStore";

/**
 * 将 ReactFlow 节点映射为算法所需的 flow 坐标外框
 */
const toMediaBox = (node) => ({
  id: node.id,
  type: node.type,
  x: node.position.x,
  y: node.position.y,
  width: node.measured?.width ?? node.width ?? 200,
  height: node.measured?.height ?? node.height ?? 120,
});

const createEdge = (connection) => ({
  ...connection,
  sourceHandle: "output",
  targetHandle: "input",
  id: `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  type: "custom",
  animated: false,
  style: { stroke: "#434343", strokeWidth: 2 },
});

export const useConnectionMagnet = () => {
  const { screenToFlowPosition, flowToScreenPosition, getNodes, getZoom } =
    useReactFlow();

  const startRef = useRef(null); // { nodeId, handleType }
  const resultRef = useRef(null); // 最近一次算法结果
  const didNativeConnectRef = useRef(false);

  // 复用项目既有的连线规则校验
  const canConnect = useCallback((connection) => {
    return validateConnection(
      { ...connection, sourceHandle: "output", targetHandle: "input" },
      useCanvasStore.getState(),
    );
  }, []);

  const handlePointerMove = useCallback(
    (event) => {
      const start = startRef.current;
      if (!start) return;

      const flowPoint = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const result = findBestConnectionTarget({
        flowPoint,
        startNodeId: start.nodeId,
        handleType: start.handleType,
        allNodes: getNodes().map(toMediaBox),
        allEdges: useCanvasStore.getState().edges,
        zoom: getZoom(),
        canConnect,
      });

      resultRef.current = result;

      if (!result) {
        useMagnetStore.getState().reset();
        useMagnetStore.setState({ active: true });
        return;
      }

      // 浮动加号手柄中心（flow 坐标）转屏幕坐标
      const handleClient = flowToScreenPosition({
        x: result.handleCenter.x + result.handleFloatX,
        y: result.handleCenter.y + result.handleFloatY,
      });

      useMagnetStore.getState().setMagnet({
        active: true,
        targetId: result.nodeId,
        canConnect: result.canConnect,
        tiltX: result.cardTiltX,
        tiltY: result.cardTiltY,
        isInCard: result.isInCard,
        showHandle: result.showHandle,
        handleClient,
        handlePosition: result.handlePosition,
      });
    },
    [
      screenToFlowPosition,
      flowToScreenPosition,
      getNodes,
      getZoom,
      canConnect,
    ],
  );

  const teardown = useCallback(() => {
    window.removeEventListener("pointermove", handlePointerMove);
    startRef.current = null;
    resultRef.current = null;
    useMagnetStore.getState().reset();
  }, [handlePointerMove]);

  const onConnectStart = useCallback(
    (_event, params) => {
      didNativeConnectRef.current = false;
      startRef.current = {
        nodeId: params.nodeId,
        handleType: params.handleType,
      };
      useMagnetStore.getState().setMagnet({ active: true });
      window.addEventListener("pointermove", handlePointerMove);
    },
    [handlePointerMove],
  );

  const onConnectEnd = useCallback(() => {
    const result = resultRef.current;
    // ReactFlow 原生已精确连上手柄时不重复建边
    if (!didNativeConnectRef.current && result?.canConnect) {
      const edge = createEdge(result.connection);
      const store = useCanvasStore.getState();
      store.setEdges([...store.edges, edge]);
      store.saveHistory();
    }
    teardown();
  }, [teardown]);

  // 标记 ReactFlow 原生连线已处理
  const markNativeConnect = useCallback(() => {
    didNativeConnectRef.current = true;
  }, []);

  // 卸载时清理监听
  useEffect(() => teardown, [teardown]);

  return { onConnectStart, onConnectEnd, markNativeConnect };
};

export default useConnectionMagnet;
