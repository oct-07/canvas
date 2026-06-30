
import request from './request'


/**
 * 获取画布详情
 */
export const getCanvasDetail = (id) => {
  return request.get(`/index/canvas/detail`, { params: { id } })
}


/**
 * 保存画布数据
 */
export const saveCanvas = (data) => {
  return request.post('/index/canvas/save', data)
}

export default {
  getCanvasDetail,
  saveCanvas,
}