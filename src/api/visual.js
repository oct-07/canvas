
import request from './request'

//风格列表
/**
 * 获取预设风格列表
 */
export const getStylePresetList = () => {
  return request.get('/index/project/index/getStylePresetList')
}
//添加风格
export const addStyle = (data) => {
  return request.post('/index/project/style/add', data)
}

/**
 * 创建新画布
 */
export const createCanvas = (data) => {
  return request.post('/index/canvas/create', data)
}

export default {
  getStylePresetList,
  addStyle,
  createCanvas
};
