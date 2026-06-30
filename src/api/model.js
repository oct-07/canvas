
import request from './request'

//生成图片跟视频
export const createContent = (data) => {
  return request.post('/index/aicreate/createContent', data)
}

//获取模型列表
export const getModelSku = () => {
  return request.post('/index/aicreate/getModelSku')
}

export default {
  createContent,
  getModelSku
}