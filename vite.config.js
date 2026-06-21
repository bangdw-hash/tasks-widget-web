import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base는 GitHub 레포 이름과 일치해야 합니다 (예: /tasks-widget-web/)
export default defineConfig({
  base: '/tasks-widget-web/',
  plugins: [react()],
})
