import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
} from "@ant-design/icons";

/**
 * 审核状态徽章组件

 */
const AuditBadge = ({ status }) => {
  if (!status) return null;

  const baseStyle = {
    position: "absolute",
    top: 8,
    left: 8,
    width: 20,
    height: 20,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  };

  if (status === "approved") {
    return (
      <div style={{ ...baseStyle, background: "#52c41a" }}>
        <CheckCircleOutlined style={{ color: "#fff", fontSize: 14 }} />
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div style={{ ...baseStyle, background: "#ff4d4f" }}>
        <CloseCircleOutlined style={{ color: "#fff", fontSize: 14 }} />
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div
        style={{
          ...baseStyle,
          background: "#1890ff",
        }}
      >
        <LoadingOutlined style={{ color: "#fff", fontSize: 14 }} spin />
      </div>
    );
  }

  return null;
};

export default AuditBadge;
