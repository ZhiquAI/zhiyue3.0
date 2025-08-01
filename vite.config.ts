import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// CSP插件，用于在开发模式下设置响应头
const cspPlugin = (): Plugin => ({
  name: 'configure-response-headers',
  configureServer: server => {
    server.middlewares.use((_req, res, next) => {
      res.setHeader(
        'Content-Security-Policy',
        "script-src 'self' 'unsafe-inline' 'unsafe-eval';"
      );
      next();
    });
  }
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), cspPlugin()],
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
    // 代理API到后端服务
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/api/dev': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
});