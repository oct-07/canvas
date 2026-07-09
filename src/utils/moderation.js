import { assetReview, getAssetReview } from "@/api";

// ===================== 审核缓存 =====================

/**
 * 全局审核结果缓存
 */
const auditCache = new Map();

/**
 * 生成缓存唯一键

 */
export function buildAuditKey(imageUrl, provider) {
  return `${imageUrl}::${provider}`;
}

/**
 * 根据 imageUrl 和 provider 查询审核缓存
 */
export function getAuditCache(imageUrl, provider) {
  return auditCache.get(buildAuditKey(imageUrl, provider));
}

/**
 * 将审核结果写入缓存

 */
export function setAuditCache(record) {
  auditCache.set(buildAuditKey(record.imageUrl, record.provider), record);
}

/**
 * 根据 imageUrl 获取该图片在所有厂商下的审核状态
 */
export function getAuditCacheByImage(imageUrl) {
  const results = [];
  auditCache.forEach((record, key) => {
    if (key.startsWith(`${imageUrl}::`)) {
      results.push(record);
    }
  });
  return results;
}

// ===================== 轮询查询审核结果 =====================

/**
 * 轮询查询审核状态，直到返回最终结果或超时
 */
export function pollAuditResult(url, maxWaitMs = 60000, intervalMs = 3000) {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const tryQuery = async () => {
      try {
        const res = await getAssetReview({ url });
        console.log(`[Moderation] getAssetReview 响应`, { url, res });
        if (res === "1") {
          console.log("[Moderation] 审核通过", { url });
          resolve({ status: "approved", timestamp: Date.now() });
          return;
        }
        console.log(`[Moderation] 审核处理中，继续轮询`, { url, res });
      } catch (err) {
        console.error("[Moderation] pollAuditResult 查询出错", { url, err });
      }

      if (Date.now() - startTime >= maxWaitMs) {
        resolve({
          status: "rejected",
          errorMsg: "审核超时",
          timestamp: Date.now(),
        });
        return;
      }

      setTimeout(tryQuery, intervalMs);
    };

    tryQuery();
  });
}

// ===================== 核心审核发起与结果处理 =====================

/**
 * 判断当前模型是否需要审核
 * 根据模型接口返回的 is_check 字段判断：1=需要审核，0=不需要审核
 */
export function isModerationRequired(isCheck) {
  return Number(isCheck) === 1;
}

/**
 * 对单张图片发起审核请求
 */
export async function submitModeration(imageUrl, provider) {
  try {
    await assetReview({ url: imageUrl, provider });
    console.log("[Moderation] assetReview 请求成功，开始轮询结果", {
      imageUrl,
      provider,
    });
    const result = await pollAuditResult(imageUrl);
    return {
      ...result,
      imageUrl,
      provider,
      timestamp: Date.now(),
    };
  } catch (err) {
    console.error("[Moderation] submitModeration error:", err);
    return {
      status: "rejected",
      imageUrl,
      provider,
      errorMsg: err?.msg || err?.message || "审核请求失败",
      timestamp: Date.now(),
    };
  }
}

/**
 * 对多张图片发起审核（并行执行，任一失败不影响其他）
 */
export async function submitModerationBatch(assets) {
  const results = new Map();
  await Promise.allSettled(
    assets.map(async (asset) => {
      const record = await submitModeration(asset.url, asset.provider);
      results.set(asset.url, record);
      setAuditCache(record);
    }),
  );
  return results;
}

/**
 * 根据当前模型，对 refAssetList 中的图片执行审核
 * 策略：先全部查缓存，有未命中项则批量发起审核
 */
export async function ensureModerationForAssets(refAssetList, provider) {
  if (!Array.isArray(refAssetList) || refAssetList.length === 0) {
    return [];
  }

  const results = [];
  const pendingAssets = [];

  for (const asset of refAssetList) {
    const url = asset?.url;
    const mime = asset?.mime || asset?.type || "";
    // 视频文件跳过审核（视频无需审核）
    if (!url || mime.startsWith("video")) continue;

    const cached = getAuditCache(url, provider);
    if (cached) {
      results.push({ url, record: cached });
    } else {
      pendingAssets.push({ url, provider });
    }
  }

  // 有未命中缓存的项，发起批量审核
  if (pendingAssets.length > 0) {
    await submitModerationBatch(pendingAssets);
    for (const asset of pendingAssets) {
      const record = getAuditCache(asset.url, provider);
      results.push({ url: asset.url, record: record || null });
    }
  }

  return results;
}

/**
 * 判断某张图片+厂商的审核是否已通过
 */
export function isAuditApproved(imageUrl, provider) {
  if (!imageUrl || !provider) return false;
  const record = getAuditCache(imageUrl, provider);
  return record?.status === "approved";
}

/**
 * 获取某图片+厂商的审核状态
 */
export function getAuditStatus(imageUrl, provider) {
  if (!imageUrl || !provider) return null;
  return getAuditCache(imageUrl, provider)?.status ?? null;
}
