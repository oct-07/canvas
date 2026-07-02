export const PARAM_NAME_MAP = {
  count: "图片数量",
  resolution_tier: "分辨率",
  aspect_ratio: "比例",
  duration: "时长",
  quality_mode: "画质模式",
  audio_enabled: "音频开关",
  result_mode: "结果模式",
  prompt_enhance: "提示词增强",
  web_search: "联网搜索",
};

export function getParamChineseName(str, backendCnName) {
  // 本地映射优先级更高，没有匹配再用后端返回的中文，兜底原始英文
  return PARAM_NAME_MAP[str] || backendCnName || str;
}