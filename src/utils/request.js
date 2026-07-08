import { message } from "antd";
import axios from "axios";

// 全局鉴权失效标记
let isTokenInvalid = false;

const createAxiosInstance = (options = {}) => {
  const instance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "https://ai.hnqzhj.com",
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
      // 全局标记已失效，直接阻断本次请求，不发送
      if (isTokenInvalid) {
        return Promise.reject(new Error("token已失效，禁止发起请求"));
      }

      // 临时测试固定token
      const fixedToken = "b4e735d8-9540-412c-b4fd-46704f31d108";
      config.headers.token = fixedToken;
      config.headers.TeamId = 3;
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
      if (response.config.responseType === "blob") {
        return response;
      }
      if (typeof res.code === "object" && res.msg === "上传成功") {
        return res;
      }

      if (res.code !== 1) {
        message.error(res.msg || "请求失败");
        return Promise.reject(res);
      }
      return res.data;
    },
    (error) => {
      // HTTP状态码401处理（对应Vue过期code逻辑）
      if (error.response) {
        const { status } = error.response;
        if (status === 401) {
          // 只弹一次提示，避免疯狂弹窗
          if (!isTokenInvalid) {
            isTokenInvalid = true;
            message.warning("请登录后操作");
          }
          // 直接拒绝，不再走下方通用错误
          return Promise.reject(error);
        }

        const { data } = error.response;
        switch (status) {
          case 403:
            message.error("拒绝访问");
            break;
          case 404:
            message.error("请求的资源不存在");
            break;
          case 500:
            message.error(data?.message || "服务器内部错误");
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

const request = createAxiosInstance();

export const get = (url, params = {}, config = {}) => {
  return request.get(url, { params, ...config });
};

export const post = (url, data = {}, config = {}) => {
  return request.post(url, data, config);
};

// 重置鉴权锁（登录成功后调用，恢复接口请求）
export const resetTokenValid = () => {
  isTokenInvalid = false;
};

export default request;
export { createAxiosInstance };
