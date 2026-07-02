import { message } from "antd";
import axios from "axios";

// 创建 axios 实例
/**
 * 创建 axios 实例，配置请求/响应拦截器
 * 自动添加 token、处理错误、标准化响应格式
 */
const createAxiosInstance = (options = {}) => {
  const instance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
    timeout: options.timeout || 30000,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  // 请求拦截器
  instance.interceptors.request.use(
    (config) => {
      const fixedToken = "c43e1641-cc81-4d1a-80db-f423462522af";
      config.headers.token = fixedToken;
      return config;
    },
    (error) => {
      return Promise.reject(error);
    },
  );

  // 响应拦截器
  instance.interceptors.response.use(
    (response) => {
      const res = response.data;
      if (typeof res.code === "object" && res.msg === "上传成功") {
        return res;
      }
      if (res.code !== 1) {
        message.error(res.message || "请求失败");

        return Promise.reject(res);
      }
      return res.data;
    },
    (error) => {
      // HTTP 错误处理（原代码完全保留）
      if (error.response) {
        const { status, data } = error.response;
        switch (status) {
          case 401:
            message.error("未授权，请重新登录");
            localStorage.removeItem("token");
            window.location.href = "/login";
            break;
          case 403:
            message.error("拒绝访问");
            break;
          case 404:
            message.error("请求的资源不存在");
            break;
          case 500:
            message.error("服务器错误");
            break;
          default:
            message.error(data?.message || "网络错误");
        }
      } else if (error.request) {
        message.error("网络连接失败，请检查网络");
      } else {
        message.error(error.message || "请求配置错误");
      }
      return Promise.reject(error);
    },
  );

  return instance;
};

// 默认导出的请求实例
const request = createAxiosInstance();

export const get = (url, params = {}, config = {}) => {
  return request.get(url, { params, ...config });
};

export const post = (url, data = {}, config = {}) => {
  return request.post(url, data, config);
};

export default request;
export { createAxiosInstance };
