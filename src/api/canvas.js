
import request from './request'


export const getCanvasDetail = (id) => {
  return request.get(`/index/canvas/detail`, { params: { id } })
}


export const saveCanvas = (data) => {
  return request.post('/index/canvas/save', data)
}

export default {
  getCanvasDetail,
  saveCanvas,
}