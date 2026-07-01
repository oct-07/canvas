const ASPECT_RATIO_MAP = {
  auto: { label: "自适应", width: 1024, height: 1024 },
  "272": { label: "1:1", width: 1024, height: 1024 },
  "273": { label: "4:3", width: 1024, height: 768 },
  "274": { label: "3:4", width: 768, height: 1024 },
  "275": { label: "16:9", width: 1920, height: 1080 },
  "276": { label: "9:16", width: 1080, height: 1920 },
  "277": { label: "21:9", width: 2560, height: 1080 },
};

export function getAspectRatioSize(valueId) {
  return ASPECT_RATIO_MAP[valueId] || ASPECT_RATIO_MAP["272"];
}

export function getNodeStyleFromAspect(valueId, nodeWidth = 220) {
  const size = getAspectRatioSize(valueId);
  const scale = nodeWidth / 1024;
  return {
    width: nodeWidth,
    height: Math.round(size.height * scale),
  };
}

export default ASPECT_RATIO_MAP;
