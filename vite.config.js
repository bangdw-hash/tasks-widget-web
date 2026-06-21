import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/tasks-widget-web/',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Firebase를 별도 청크로 분리 → 병렬 로드 + 브라우저 캐시 활용
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          // React 코어도 분리
          react: ['react', 'react-dom'],
        },
      },
    },
  },
})
