import { DeleteOutlined } from "@ant-design/icons";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
} from "@xyflow/react";
// 引入全局仓库
import useCanvasStore from "@/store/canvasStore";

export default function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
}) {
  const { setEdges } = useReactFlow();
  // ========== 全局状态读取 ==========
  // 全局唯一选中的连线ID
  const selectedEdgeId = useCanvasStore((state) => state.selectedEdgeId);
  // 设置选中连线、清空选中
  const setActiveEdgeId = useCanvasStore((state) => state.setActiveEdgeId);

  // 判断当前这条线是否被全局选中
  const isActive = selectedEdgeId === id;

  // 生成贝塞尔曲线
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  // 删除连线：阻止冒泡，不会触发线条选中切换
  const handleDeleteEdge = (e) => {
    e.stopPropagation();
    setEdges((edgesList) => edgesList.filter((edge) => edge.id !== id));
  };

  // 点击连线：互斥单选
  const handleEdgeClick = (e) => {
    e.stopPropagation();
    // 如果当前已经选中，点击取消；否则选中这条线
    if (isActive) {
      setActiveEdgeId(null);
    } else {
      setActiveEdgeId(id);
    }
  };

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        interactionWidth={25}
        // 根据全局选中状态切换颜色
        style={{
          stroke: isActive ? "#666666" : "#ffffff",
          strokeWidth: 2,
          cursor: "pointer",
        }}
        onClick={handleEdgeClick}
      />

      <EdgeLabelRenderer>
        {/* 删除按钮永久显示 */}
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: "#262626",
            // 选中图标变白，未选中灰色
            color: isActive ? "#ffffff" : "#5d5d5d",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 9999,
          }}
          className="nodrag nopan"
          onClick={handleDeleteEdge}
        >
          <DeleteOutlined size={14} />
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
