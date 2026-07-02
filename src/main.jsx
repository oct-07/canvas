import { ConfigProvider, theme } from "antd";
import zhCN from "antd/locale/zh_CN";
import React from "react";
import ReactDOM from "react-dom/client";

import "@/assets/styles/global.css";
import "@/assets/styles/reset.css";

import App from "@/App";

/**
 * React 应用入口文件
 * 配置 Antd 暗色主题并渲染 App 组件
 */

// 暗色主题配置
const darkTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: "#177ddc",
    colorBgContainer: "#1f1f1f",
    colorBgElevated: "#262626",
    colorBgLayout: "#0d0d0d",
    colorText: "rgba(255, 255, 255, 0.85)",
    colorTextSecondary: "rgba(255, 255, 255, 0.45)",
    colorBorder: "#303030",
    colorBorderSecondary: "#434343",
    borderRadius: 8,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  components: {
    Button: {
      colorPrimaryHover: "#4098fc",
    },
    Input: {
      colorBgContainer: "#1f1f1f",
    },
    Select: {
      colorBgContainer: "#1f1f1f",
    },
  },
};

/**
 * 渲染 React 应用到 DOM
 */
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ConfigProvider theme={darkTheme} locale={zhCN}>
      <App />
    </ConfigProvider>
  </React.StrictMode>,
);
