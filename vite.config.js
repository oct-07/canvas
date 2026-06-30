import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // 第三方库分包优化
          'vendor-react': ['react', 'react-dom'],
          'vendor-antd': ['antd', '@ant-design/icons'],
          'vendor-xyflow': ['@xyflow/react'],
          'vendor-utils': ['axios', 'qs', 'zustand', 'dayjs'],
        },
      },
    },
    chunkSizeWarningLimit: 2000,
  },
})
