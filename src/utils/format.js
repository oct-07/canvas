/**
 * 数字千分位格式化
 * @param {number | string} num 待格式化数字
 * @returns {string} 带千分位分隔符字符串，异常返回 --
 */
export function formatThousand(num) {
  if (num === null || num === undefined || isNaN(Number(num))) {
    return "--";
  }
  return Number(num).toLocaleString("zh-CN");
}

/**
 * 千分位 + 固定保留小数位
 * @param {number | string} num
 * @param {number} digits 保留几位小数，默认2
 * @returns {string}
 */
export function formatThousandFixed(num, digits = 2) {
  if (num === null || num === undefined || isNaN(Number(num))) {
    return "--";
  }
  return Number(num).toFixed(digits).toLocaleString("zh-CN");
}
