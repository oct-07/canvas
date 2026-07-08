import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  StarOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { Spin, Tag } from "antd";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";

import { getMemberInfo } from "@/api";
import { formatThousand } from "@/utils";

const SaveStatusBar = forwardRef(({ loading = false, tip = "未保存" }, ref) => {
  const [point, setPoint] = useState("--");

  // 抽取刷新积分函数
  const refreshPoint = async () => {
    try {
      const res = await getMemberInfo();
      console.log(res);
      if (res?.my_points !== undefined) {
        setPoint(formatThousand(res.my_points));
      }
    } catch (err) {
      console.error("获取会员积分失败", err);
    }
  };

  useEffect(() => {
    refreshPoint();
  }, []);

  // 向外暴露方法给父组件ref调用
  useImperativeHandle(ref, () => ({
    refreshPoint,
  }));

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
        gap: "30px",
        alignItems: "center",
        fontSize: "18px",
      }}
    >
      {loading ? (
        <Spin size="small" />
      ) : (
        <Tag color={status.color} icon={status.icon} style={{ margin: 0 }}>
          {status.text}
        </Tag>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <span
          style={{ background: "#1f1f1f", borderRadius: "8px", padding: "5px" }}
        >
          积分：
          <StarOutlined style={{ color: "#00c4f9" }} />
          {point}
        </span>
      </div>
    </div>
  );
});

export default SaveStatusBar;
