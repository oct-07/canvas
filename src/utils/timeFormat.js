/**
 * 时间格式化工具函数
 * 提供时间戳转换和相对时间格式化功能
 */

/**
 * 时间戳转指定格式的日期时间字符串
 * @param {number|string|Date} timestamp - 时间戳(毫秒)或Date对象
 * @param {string} format - 格式字符串，默认 'YYYY-MM-DD HH:mm:ss'
 * @returns {string} 格式化后的日期时间字符串
 */
export function formatTimestamp(timestamp, format = 'YYYY-MM-DD HH:mm:ss') {
  if (!timestamp) return '';

  const date = timestamp instanceof Date ? timestamp : new Date(Number(timestamp));

  if (isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * 时间戳转年月日时分秒对象
 * @param {number|string|Date} timestamp - 时间戳(毫秒)或Date对象
 * @returns {Object} 包含年月日时分秒的对象
 */
export function parseTimestamp(timestamp) {
  if (!timestamp) return null;

  const date = timestamp instanceof Date ? timestamp : new Date(Number(timestamp));

  if (isNaN(date.getTime())) return null;

  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hours: date.getHours(),
    minutes: date.getMinutes(),
    seconds: date.getSeconds(),
    milliseconds: date.getMilliseconds(),
    week: date.getDay(),
    timestamp: date.getTime()
  };
}

/**
 * 获取相对时间描述
 * @param {number|string|Date} timestamp - 时间戳(毫秒)或Date对象
 * @param {Object} options - 配置选项
 * @param {string} options.locale - 语言，'zh' 或 'en'，默认 'zh'
 * @returns {string} 相对时间描述
 */
export function getRelativeTime(timestamp, options = {}) {
  if (!timestamp) return '';

  const { locale = 'zh' } = options;

  const date = timestamp instanceof Date ? timestamp : new Date(Number(timestamp));

  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const absDiff = Math.abs(diff);
  const isFuture = diff < 0;

  const seconds = Math.floor(absDiff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  const translations = {
    zh: {
      justNow: '刚刚',
      secondsAgo: '秒前',
      minutesAgo: '分钟前',
      hoursAgo: '小时前',
      daysAgo: '天前',
      weeksAgo: '周前',
      monthsAgo: '月前',
      yearsAgo: '年前',
      secondsLater: '秒后',
      minutesLater: '分钟后',
      hoursLater: '小时后',
      daysLater: '天后',
      weeksLater: '周后',
      monthsLater: '月后',
      yearsLater: '年后'
    },
    en: {
      justNow: 'just now',
      secondsAgo: 'seconds ago',
      minutesAgo: 'minutes ago',
      hoursAgo: 'hours ago',
      daysAgo: 'days ago',
      weeksAgo: 'weeks ago',
      monthsAgo: 'months ago',
      yearsAgo: 'years ago',
      secondsLater: 'seconds later',
      minutesLater: 'minutes later',
      hoursLater: 'hours later',
      daysLater: 'days later',
      weeksLater: 'weeks later',
      monthsLater: 'months later',
      yearsLater: 'years later'
    }
  };

  const t = translations[locale] || translations.zh;

  if (seconds < 5) return t.justNow;
  if (seconds < 60) return `${seconds}${isFuture ? t.secondsLater : t.secondsAgo}`;
  if (minutes < 60) return `${minutes}${isFuture ? t.minutesLater : t.minutesAgo}`;
  if (hours < 24) return `${hours}${isFuture ? t.hoursLater : t.hoursAgo}`;
  if (days < 7) return `${days}${isFuture ? t.daysLater : t.daysAgo}`;
  if (weeks < 4) return `${weeks}${isFuture ? t.weeksLater : t.weeksAgo}`;
  if (months < 12) return `${months}${isFuture ? t.monthsLater : t.monthsAgo}`;
  return `${years}${isFuture ? t.yearsLater : t.yearsAgo}`;
}

/**
 * 格式化时长
 * @param {number} ms - 毫秒数
 * @param {string} format - 输出格式：'full' | 'short'，默认 'short'
 * @returns {string} 格式化后的时长字符串
 */
export function formatDuration(ms, format = 'short') {
  if (!ms || ms < 0) return format === 'full' ? '0 milliseconds' : '0ms';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (format === 'full') {
    const parts = [];
    if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
    if (minutes % 60 > 0) parts.push(`${minutes % 60} minute${minutes % 60 > 1 ? 's' : ''}`);
    if (seconds % 60 > 0) parts.push(`${seconds % 60} second${seconds % 60 > 1 ? 's' : ''}`);
    return parts.join(' ') || '0 milliseconds';
  }

  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  if (seconds > 0) return `${seconds}s`;
  return `${ms}ms`;
}

// 别名兼容
export const formatDate = formatTimestamp;
export const formatRelativeTime = getRelativeTime;

// 统一导出
export default {
  formatTimestamp,
  formatDate,
  parseTimestamp,
  getRelativeTime,
  formatRelativeTime,
  formatDuration
};
