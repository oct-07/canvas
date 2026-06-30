/**
 * 缩略图生成工具
 */

/**
 * 生成图片缩略图
 * @param {string|File} source - 图片源（URL 或 File 对象）
 * @param {Object} options - 配置选项
 * @returns {Promise<string>} 缩略图 DataURL
 */
export const generateThumbnail = async (source, options = {}) => {
  const {
    maxWidth = 200,
    maxHeight = 200,
    quality = 0.8,
    type = 'image/jpeg',
  } = options

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        // 计算缩放比例
        let { width, height } = img
        const ratio = Math.min(maxWidth / width, maxHeight / height)

        if (ratio < 1) {
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }

        canvas.width = width
        canvas.height = height

        // 绘制缩略图
        ctx.drawImage(img, 0, 0, width, height)

        // 导出
        const dataUrl = canvas.toDataURL(type, quality)
        resolve(dataUrl)
      } catch (error) {
        reject(error)
      }
    }

    img.onerror = () => {
      reject(new Error('图片加载失败'))
    }

    // 设置图片源
    if (typeof source === 'string') {
      img.src = source
    } else if (source instanceof File) {
      const reader = new FileReader()
      reader.onload = (e) => {
        img.src = e.target.result
      }
      reader.onerror = () => reject(new Error('文件读取失败'))
      reader.readAsDataURL(source)
    } else {
      reject(new Error('不支持的图片源类型'))
    }
  })
}

/**
 * 从 Canvas 元素生成缩略图
 * @param {HTMLCanvasElement} canvas - Canvas 元素
 * @param {Object} options - 配置选项
 * @returns {string} 缩略图 DataURL
 */
export const generateThumbnailFromCanvas = (canvas, options = {}) => {
  const {
    maxWidth = 200,
    maxHeight = 200,
    quality = 0.8,
    type = 'image/jpeg',
  } = options

  const canvas2d = canvas.getContext('2d')
  if (!canvas2d) {
    throw new Error('无法获取 Canvas 2D 上下文')
  }

  const { width, height } = canvas
  const ratio = Math.min(maxWidth / width, maxHeight / height)

  const targetCanvas = document.createElement('canvas')
  targetCanvas.width = Math.round(width * ratio)
  targetCanvas.height = Math.round(height * ratio)

  const ctx = targetCanvas.getContext('2d')
  ctx.drawImage(canvas, 0, 0, targetCanvas.width, targetCanvas.height)

  return targetCanvas.toDataURL(type, quality)
}

/**
 * 生成 DOM 元素缩略图
 * @param {HTMLElement} element - DOM 元素
 * @param {Object} options - 配置选项
 * @returns {Promise<string>} 缩略图 DataURL
 */
export const generateThumbnailFromElement = async (element, options = {}) => {
  const {
    maxWidth = 200,
    maxHeight = 200,
    quality = 0.8,
    type = 'image/png',
    backgroundColor = '#ffffff',
  } = options

  // 使用 html2canvas 库（如果可用）
  if (typeof window.html2canvas === 'function') {
    const canvas = await window.html2canvas(element, {
      backgroundColor,
      scale: 2,
    })
    return generateThumbnailFromCanvas(canvas, { maxWidth, maxHeight, quality, type })
  }

  // 备选方案：使用 SVG foreignObject
  return new Promise((resolve, reject) => {
    try {
      const { width, height } = element.getBoundingClientRect()
      const ratio = Math.min(maxWidth / width, maxHeight / height)

      const data = new XMLSerializer().serializeToString(element)
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
          <foreignObject width="100%" height="100%">
            <div xmlns="http://www.w3.org/1999/xhtml" style="background: ${backgroundColor}">
              ${data}
            </div>
          </foreignObject>
        </svg>
      `

      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(width * ratio)
        canvas.height = Math.round(height * ratio)

        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        resolve(canvas.toDataURL(type, quality))
      }

      img.onerror = () => reject(new Error('SVG 转图片失败'))
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)))
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * 获取图片尺寸
 * @param {string|File} source - 图片源
 * @returns {Promise<{width: number, height: number}>}
 */
export const getImageSize = (source) => {
  return new Promise((resolve, reject) => {
    const img = new Image()

    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }

    img.onerror = () => {
      reject(new Error('图片加载失败'))
    }

    if (typeof source === 'string') {
      img.src = source
    } else if (source instanceof File) {
      const reader = new FileReader()
      reader.onload = (e) => {
        img.src = e.target.result
      }
      reader.onerror = () => reject(new Error('文件读取失败'))
      reader.readAsDataURL(source)
    } else {
      reject(new Error('不支持的图片源类型'))
    }
  })
}

/**
 * 压缩图片文件
 * @param {File} file - 图片文件
 * @param {Object} options - 配置选项
 * @returns {Promise<File>} 压缩后的文件
 */
export const compressImage = async (file, options = {}) => {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.8,
    type = 'image/jpeg',
  } = options

  const dataUrl = await generateThumbnail(file, {
    maxWidth,
    maxHeight,
    quality,
    type,
  })

  // 转换 dataURL 为 File
  const arr = dataUrl.split(',')
  const mime = arr[0].match(/:(.*?);/)[1]
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }

  return new File([u8arr], file.name.replace(/\.\w+$/, `.${type.split('/')[1]}`), {
    type,
  })
}

/**
 * 获取文件预览 URL
 * @param {File|Blob} file - 文件对象
 * @returns {string} Object URL
 */
export const getFilePreviewUrl = (file) => {
  return URL.createObjectURL(file)
}

/**
 * 释放 Object URL
 * @param {string} url - Object URL
 */
export const revokeFilePreviewUrl = (url) => {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}

export default {
  generateThumbnail,
  generateThumbnailFromCanvas,
  generateThumbnailFromElement,
  getImageSize,
  compressImage,
  getFilePreviewUrl,
  revokeFilePreviewUrl,
}
