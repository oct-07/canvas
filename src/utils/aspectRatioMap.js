// 后端返回的prop_value_id 作为key，和后端数据完全对齐
// 同时支持按 label 索引（如 "16:9"），供前端直接存储使用
const ASPECT_RATIO_MAP = {
  242: { label: "auto", width: 1024, height: 1024 },
  227: { label: "1:1", width: 1024, height: 1024 },
  228: { label: "4:3", width: 1024, height: 768 },
  229: { label: "3:4", width: 768, height: 1024 },
  230: { label: "16:9", width: 1920, height: 1080 },
  231: { label: "9:16", width: 1080, height: 1920 },
  232: { label: "3:2", width: 1536, height: 1024 },
  233: { label: "2:3", width: 1024, height: 1536 },
  234: { label: "5:4", width: 1280, height: 1024 },
  235: { label: "4:5", width: 1024, height: 1280 },
  236: { label: "2:1", width: 2048, height: 1024 },
  237: { label: "1:2", width: 1024, height: 2048 },
  238: { label: "21:9", width: 2560, height: 1080 },
  239: { label: "9:21", width: 1024, height: 2389 },
  240: { label: "3:1", width: 3072, height: 1024 },
  241: { label: "1:3", width: 1024, height: 3072 },
};

// 按 label 建立反向索引，便于直接通过 "16:9" 这种字符串读取
const ASPECT_RATIO_BY_LABEL = Object.values(ASPECT_RATIO_MAP).reduce(
  (acc, item) => {
    acc[item.label] = item;
    return acc;
  },
  {},
);

export function getAspectRatioSize(valueOrLabel) {
  // 优先按 valueId 查找，再按 label 查找，最后回退到 1:1
  const match =
    ASPECT_RATIO_MAP[valueOrLabel] ||
    ASPECT_RATIO_BY_LABEL[valueOrLabel] ||
    ASPECT_RATIO_MAP["227"];
  console.log(`[getAspectRatioSize] 传入valueOrLabel:${valueOrLabel} 匹配配置:`, match);
  return match;
}

// 新增：直接返回宽/高比例字符串，给CSS aspectRatio 使用
export function getAspectRatioStr(valueOrLabel) {
  const size = getAspectRatioSize(valueOrLabel);
  const ratioStr = `${size.width} / ${size.height}`;
  console.log(`[getAspectRatioStr] label:${size.label} 比例字符串:${ratioStr}`);
  return ratioStr;
}

export default ASPECT_RATIO_MAP;
