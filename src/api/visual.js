import { get, post } from "@/utils/request.js";

//风格列表
/**
 * 获取预设风格列表
 * @param {number|null} type - 分类类型：1=真人，2=2D，3=3D，4=自定义，不传=全部
 */
export const getStylePresetList = (type) => {
  // type 为 null/undefined 时不传递参数，表示查询全部
  const params = type != null ? { type } : {};
  return get("/index/project/index/getStylePresetList", params);
};

//添加风格
export const addStyle = (data) => {
  return post("/index/project/style/add", data);
};

/**
 * 创建新画布
 */
export const createCanvas = (data) => {
  return post("/index/canvas/create", data);
};

export default {
  getStylePresetList,
  addStyle,
  createCanvas,
};
