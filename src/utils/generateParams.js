// src/utils/mediaBody.js
/**
 * 组装图片/视频生成请求体，不处理音频
 * @param {object} nodeData 画布媒体节点完整数据
 * @returns 接口完整入参
 */
export function buildMediaBody(nodeData) {
  const {
    nodeType,
    params,
    model_frame,
    refAssetList = [],
    provider,
    model_name,
    model_id,
    prompt = "",
    negative_prompt = "",
    team_id,
    vip_weight = "",
  } = nodeData;

  // 公共基础外层字段
  const base = {
    provider,
    model_name,
    model_id,
    prompt,
    negative_prompt,
    team_id,
    vip_weight,
    task_type: nodeType,
    source: "canvas",
    params,
  };

  // 图片节点：全部素材统一 reference_image
  if (nodeType === "image") {
    const input_assets = refAssetList.map((item) => ({
      kind: "image",
      role: "reference_image",
      uri: item.url,
    }));
    return {
      ...base,
      ext_params: { input_assets },
    };
  }

  // 视频节点基础结构，自带model_frame
  const videoReq = { ...base, model_frame: String(model_frame) };
  const frameType = Number(model_frame);
  const validAssets = refAssetList.filter((item) => item?.url);

  // 模式4：全能参考，支持多张图+视频混合
  if (frameType === 4) {
    if (validAssets.length === 0) return videoReq;
    const input_assets = validAssets.map((item) => {
      const { url } = item;
      const isVideo = /\.(mp4|mov|avi|flv|wmv|webm|mkv)$/i.test(url);
      return isVideo
        ? { kind: "video", role: "feature_video", uri: url }
        : { kind: "image", role: "reference_image", uri: url };
    });
    return { ...videoReq, ext_params: { input_assets } };
  }

  // 模式1/2/3：首尾帧模式，业务层已限制素材数量，直接取值拼接
  const firstImg = validAssets[0]?.url;
  const secondImg = validAssets[1]?.url;
  const input_assets = [];

  if (frameType === 2 && firstImg) {
    // 仅首帧
    input_assets.push({ kind: "image", role: "first_frame", uri: firstImg });
  } else if (frameType === 3) {
    // 仅尾帧
    const lastUri = secondImg || firstImg;
    if (lastUri)
      input_assets.push({ kind: "image", role: "last_frame", uri: lastUri });
  } else if (frameType === 1) {
    // 首尾双帧
    if (firstImg)
      input_assets.push({ kind: "image", role: "first_frame", uri: firstImg });
    if (secondImg)
      input_assets.push({ kind: "image", role: "last_frame", uri: secondImg });
  }

  if (input_assets.length) {
    videoReq.ext_params = { input_assets };
  }
  return videoReq;
}
