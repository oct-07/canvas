import { Tag, Spin } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined, SyncOutlined, ClockCircleOutlined } from "@ant-design/icons";

export default function SaveStatusBar({ loading = false, tip = "未保存" }) {
  // 根据 tip 内容决定标签颜色和图标
  const getStatus = () => {
    if (loading) {
      return {
        color: "processing",
        icon: <SyncOutlined spin />,
        text: "保存中...",
      };
    }
    if (tip.includes("失败") || tip.includes("错误")) {
      return {
        color: "error",
        icon: <CloseCircleOutlined />,
        text: tip,
      };
    }
    if (tip.includes("已保存") || tip.includes("成功")) {
      return {
        color: "success",
        icon: <CheckCircleOutlined />,
        text: "已保存",
      };
    }
    if (tip.includes("等待")) {
      return {
        color: "warning",
        icon: <ClockCircleOutlined />,
        text: "等待保存...",
      };
    }
    return {
      color: "default",
      icon: null,
      text: "未保存",
    };
  };

  const status = getStatus();

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "center",
        fontSize: 14,
      }}
    >
      {loading ? (
        <Spin size="small" />
      ) : (
        <Tag
          color={status.color}
          icon={status.icon}
          style={{ margin: 0 }}
        >
          {status.text}
        </Tag>
      )}
    </div>
  );
}
