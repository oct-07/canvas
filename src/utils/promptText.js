export function replaceAssetTagsWithText(
  clone,
  { assetList, isVideo, getSeq },
) {
  if (!clone || typeof clone.querySelectorAll !== "function") {
    return { replacedCount: 0, missedIds: [] };
  }
  const idToItem = new Map((assetList || []).map((a) => [a.id, a]));
  let replacedCount = 0;
  const missedIds = [];

  clone.querySelectorAll("[data-asset-id]").forEach((tag) => {
    const assetId = tag.dataset.assetId;
    const seq = getSeq(assetId);
    const item = idToItem.get(assetId);
    const prefix = isVideo(item) ? "视频" : "图片";
    const text = seq !== undefined ? `${prefix}${seq}` : prefix;

    // 整个 contenteditable="false" 外壳都要被替换为纯文本节点
    const outerShell = tag.closest('[contenteditable="false"]') || tag;
    outerShell.parentNode?.replaceChild(
      document.createTextNode(text),
      outerShell,
    );
    replacedCount += 1;
    if (seq === undefined) missedIds.push(assetId);
  });

  return { replacedCount, missedIds };
}

/**克隆编辑器 DOM → 替换原子块 → 取出纯文本
 */
export function buildPurePromptText(editorRoot, deps) {
  if (!editorRoot) {
    return { text: "", replacedCount: 0, missedIds: [] };
  }
  const clone = editorRoot.cloneNode(true);
  const { replacedCount, missedIds } = replaceAssetTagsWithText(clone, deps);
  return {
    text: clone.textContent || "",
    replacedCount,
    missedIds,
  };
}
