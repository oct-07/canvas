import { post } from "./request";

export function uploadMedia(file, extraParams = {}, onProgress) {
  const imgTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  const videoTypes = ["video/mp4", "video/mov"];
  const allowTypes = [...imgTypes, ...videoTypes];

  if (!allowTypes.includes(file.type)) {
    return Promise.reject(new Error("仅支持图片jpg/png/gif/webp、视频mp4/mov"));
  }

  const isVideo = videoTypes.includes(file.type);
  const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return Promise.reject(new Error(isVideo ? "视频最大100M" : "图片最大10M"));
  }

  const formData = new FormData();
  formData.append("file", file);
  Object.entries(extraParams).forEach(([k, v]) => {
    formData.append(k, v);
  });

  return post("/index/ajax/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    onUploadProgress: (e) => {
      if (!e.total) return;
      const percent = Math.round((e.loaded / e.total) * 100);
      onProgress?.(percent);
    },
  }).then((res) => {
    return res.code;
  });
}
