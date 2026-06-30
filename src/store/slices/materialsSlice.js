/**
 * 素材管理 Slice
 * 管理图片和视频素材
 */

/**
 * 素材 Slice 初始状态
 */
export const materialsInitialState = {
  materials: {
    images: [
      { id: 'img1', name: 'Mountain', url: 'https://picsum.photos/200/150?random=1', type: 'image' },
      { id: 'img2', name: 'Ocean', url: 'https://picsum.photos/200/150?random=2', type: 'image' },
      { id: 'img3', name: 'Forest', url: 'https://picsum.photos/200/150?random=3', type: 'image' },
      { id: 'img4', name: 'City', url: 'https://picsum.photos/200/150?random=4', type: 'image' },
      { id: 'img5', name: 'Sunset', url: 'https://picsum.photos/200/150?random=5', type: 'image' },
      { id: 'img6', name: 'Snow', url: 'https://picsum.photos/200/150?random=6', type: 'image' },
    ],
    videos: [
      { id: 'vid1', name: 'Nature Video', url: 'https://www.w3schools.com/html/mov_bbb.mp4', type: 'video', thumbnail: 'https://picsum.photos/200/150?random=7' },
      { id: 'vid2', name: 'Tech Demo', url: 'https://www.w3schools.com/html/movie.mp4', type: 'video', thumbnail: 'https://picsum.photos/200/150?random=8' },
    ],
  },
  activeTab: 'images',
  searchQuery: '',
}

/**
 * 创建素材 Slice
 * @param {object} getStore - 获取 store 的函数
 * @param {object} setStore - 设置 store 的函数
 * @returns {object} 素材相关的 state 和 actions
 */
export const createMaterialsSlice = (getStore, setStore) => ({
  /**
   * 切换素材 Tab
   */
  setActiveTab: (tab) => setStore({ activeTab: tab }),

  /**
   * 设置搜索关键词
   */
  setSearchQuery: (query) => setStore({ searchQuery: query }),
})
