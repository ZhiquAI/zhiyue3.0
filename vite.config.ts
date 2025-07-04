import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['pdfjs-dist']
  },
  define: {
    global: 'globalThis',
  },
  server: {
    fs: {
      allow: ['..']
    },
    // 启用错误覆盖，在浏览器中显示错误
    hmr: {
      overlay: true
    },
    // 代理日志同步API到后端服务
    proxy: {
      '/api/dev': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
});