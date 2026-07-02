import { get, post } from "@/utils/request.js";

/**
 * 获取画布详情
 */
export const getCanvasDetail = (id) => {
  return get("/index/canvas/detail", { id });
};

/**
 * 保存画布数据
 */
export const saveCanvas = (data) => {
  return post("/index/canvas/save", data);
};

export default {
  getCanvasDetail,
  saveCanvas,
};
