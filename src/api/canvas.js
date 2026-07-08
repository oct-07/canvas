import { get, post } from "@/utils/request.js";

/**
 * 获取画布详情
 */
export const getCanvasDetail = (params) => {
  return get("/index/canvas/detail", params);
};

/**
 * 保存画布数据
 */
export const saveCanvas = (data) => {
  return post("/index/canvas/save", data);
};

//会员信息
export const getMemberInfo = (params) => {
  return get("/index/member/getMemberInfo", params);
};
export default {
  getCanvasDetail,
  saveCanvas,
  getMemberInfo,
};
