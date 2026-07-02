import { post } from "./request";

//生成图片跟视频
/**
 * 调用 AI 生成图片或视频内容
 */
export const createContent = (data) => {
  return post("/index/aicreate/createContent", data);
};

//获取模型列表
/**
 * 获取可用的 AI 模型列表
 */
export const getModelSku = (params) => {
  return post("/index/aicreate/getModelSku", params);
};

export default {
  createContent,
  getModelSku,
};
