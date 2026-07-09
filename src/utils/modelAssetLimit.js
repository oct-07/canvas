/**
 * 模型素材数量上限校验
 * - 视频模型（model_type === "1"）：分别用 model_param_img_num / model_param_video_num 限制图片、视频
 * - 图片模型（model_type === "2"）：用 model_reference_drawing_num 限制图片总数，不允许上传视频
 *
 * 数据源：当前节点的 refAssetList（与 upstreamMediaArray 同源），按 type 字段分别计数
 */

const VIDEO_MODEL_TYPE = "1";
const IMAGE_MODEL_TYPE = "2";

/**
 * 把 refAssetList 转成 { imageCount, videoCount }
 * - 优先看 type 字段：type === "video" / "image" 时直接采用
 * - 兜底看 URL 后缀：mp4 / mov / avi / flv / wmv / webm / mkv 视为视频，其他视为图片
 * - 其余 type 值（如上游误传的 "upload"）会落到兜底分支
 */
export function countAssetsByType(refAssetList) {
  const list = Array.isArray(refAssetList) ? refAssetList : [];
  const VIDEO_RE = /\.(mp4|mov|avi|flv|wmv|webm|mkv)$/i;
  const isVideoAsset = (asset) => {
    if (asset?.type === "video") return true;
    if (asset?.type === "image") return false;
    return VIDEO_RE.test(asset?.url || "") || VIDEO_RE.test(asset?.name || "");
  };
  let imageCount = 0;
  let videoCount = 0;
  list.forEach((asset) => {
    if (!asset) return;
    if (isVideoAsset(asset)) {
      videoCount += 1;
    } else {
      imageCount += 1;
    }
  });
  return { imageCount, videoCount };
}

/**
 * 把源节点的 type / data 映射成写入 refAssetList 的媒体类型（"video" | "image"）
 * - 视频/图片节点：直接用 sourceNode.type
 * - upload 节点：按 data.mediaType 或 url / name 后缀兜底判断
 */
export function resolveAssetMediaType(sourceNode) {
  if (!sourceNode) return "image";
  const t = sourceNode.type;
  if (t === "video" || t === "image") return t;
  if (t === "upload") {
    const d = sourceNode.data || {};
    if (d.mediaType === "video" || d.mediaType === "image") return d.mediaType;
    const VIDEO_RE = /\.(mp4|mov|avi|flv|wmv|webm|mkv)$/i;
    if (VIDEO_RE.test(d.url || "") || VIDEO_RE.test(d.name || ""))
      return "video";
    return "image";
  }
  // 未知节点类型：兜底按 url 后缀
  const VIDEO_RE = /\.(mp4|mov|avi|flv|wmv|webm|mkv)$/i;
  const url = sourceNode.data?.url || "";
  const name = sourceNode.data?.name || "";
  return VIDEO_RE.test(url) || VIDEO_RE.test(name) ? "video" : "image";
}

/**
 * 按 model_type 分支取当前模型对图片/视频的最大数量限制
 * @returns {{ maxImage: number|null, maxVideo: number|null }}
 *   - maxImage / maxVideo 为 null 表示该模型类型不限制该项
 */
export function getAssetLimitsByModel(modelType, model) {
  const safeModel = model || {};
  // 统一把数字字段规整为数字；缺失/为 0/负数 视为「不限制」
  const toLimit = (val) => {
    if (val === undefined || val === null || val === "") return null;
    const n = Number(val);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  };

  if (String(modelType) === VIDEO_MODEL_TYPE) {
    return {
      maxImage: toLimit(safeModel.model_param_img_num),
      maxVideo: toLimit(safeModel.model_param_video_num),
    };
  }

  if (String(modelType) === IMAGE_MODEL_TYPE) {
    return {
      maxImage: toLimit(safeModel.model_reference_drawing_num),
      // 图片模型不允许上传视频，固定返回 0
      maxVideo: 0,
    };
  }

  // 未知 model_type：不限制
  return { maxImage: null, maxVideo: null };
}

/**
 * 校验 refAssetList 是否超出当前模型允许的上限
 */
export function validateAssetLimits({ modelType, model, refAssetList }) {
  const { imageCount, videoCount } = countAssetsByType(refAssetList);
  const { maxImage, maxVideo } = getAssetLimitsByModel(modelType, model);

  // 图片模型：禁止视频
  if (maxVideo === 0 && videoCount > 0) {
    return {
      passed: false,
      message: "当前图片模型不支持上传视频，请移除视频素材后再提交",
      imageCount,
      videoCount,
      maxImage,
      maxVideo,
    };
  }

  if (maxImage !== null && imageCount > maxImage) {
    return {
      passed: false,
      message: `当前模型最多上传 ${maxImage} 张图片，当前已有 ${imageCount} 张`,
      imageCount,
      videoCount,
      maxImage,
      maxVideo,
    };
  }

  if (maxVideo !== null && videoCount > maxVideo) {
    return {
      passed: false,
      message: `当前模型最多上传 ${maxVideo} 个视频，当前已有 ${videoCount} 个`,
      imageCount,
      videoCount,
      maxImage,
      maxVideo,
    };
  }

  return { passed: true, imageCount, videoCount, maxImage, maxVideo };
}
