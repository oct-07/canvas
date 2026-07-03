import { get, post } from "@/utils/request.js";

/**
 * 资产评审
 */
export const assetReview = (data) => {
  return post("/index/index/assetReview", data);
};

/**
 * 资产评审接口
 */
export const getAssetReview = (params) => {
  return get("ndex/index/getAssetReview", params);
};

export default {
  assetReview,
  getAssetReview,
};
