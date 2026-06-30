//图片视频缩略图处理
export function getThumbUrl(url) {
  if (!url) return "";

  const isAiResource = url.includes('qianzhensource.oss-cn-beijing.aliyuncs.com');
  if (!isAiResource) return url;

  const imageSuffixes = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff'];
  const parts = url.split('.');
  const fileSuffix = parts.length > 1 ? parts.pop().toLowerCase() : '';
  const isImage = imageSuffixes.includes(fileSuffix);

  if (isImage) {
    return url + '?x-oss-process=style/thumb';
  } else {
    const lastDotIndex = url.lastIndexOf(".");
    return lastDotIndex === -1 
      ? `${url}--thumb.jpeg` 
      : `${url.slice(0, lastDotIndex)}--thumb.jpeg`;
  }
}

export default { getThumbUrl }