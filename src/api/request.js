import { message } from 'antd'
import axios from 'axios'

// 创建 axios 实例
/**
 * 创建 axios 实例，配置请求/响应拦截器
 * 自动添加 token、处理错误、标准化响应格式
 */
const createAxiosInstance = (options = {}) => {
  const instance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
    timeout: options.timeout || 30000,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  // 请求拦截器
  instance.interceptors.request.use(
    (config) => {
      const fixedToken = 'c43e1641-cc81-4d1a-80db-f423462522af'
      config.headers.token = fixedToken
      return config
    },
    (error) => {
      return Promise.reject(error)
    }
  )

  // 响应拦截器
  instance.interceptors.response.use(
    (response) => {
      const res = response.data
      // 后端规范：code=0 代表业务成功，code=1 代表业务失败
      if (res.code !== 1) {
        message.error(res.message || '请求失败')
        // 抛出完整后端返回体，方便业务捕获错误信息
        return Promise.reject(res)
      }
      // 成功直接返回后端data字段（真实业务数据）
      return res.data
    },
    (error) => {
      // HTTP 错误处理
      if (error.response) {
        const { status, data } = error.response
        switch (status) {
          case 401:
            message.error('未授权，请重新登录')
            localStorage.removeItem('token')
            window.location.href = '/login'
            break
          case 403:
            message.error('拒绝访问')
            break
          case 404:
            message.error('请求的资源不存在')
            break
          case 500:
            message.error('服务器错误')
            break
          default:
            message.error(data?.message || '网络错误')
        }
      } else if (error.request) {
        message.error('网络连接失败，请检查网络')
      } else {
        message.error(error.message || '请求配置错误')
      }
      return Promise.reject(error)
    }
  )

  return instance
}

// 默认导出的请求实例
const request = createAxiosInstance()

export default request
export { createAxiosInstance }
