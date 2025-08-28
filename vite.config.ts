import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";

// CSP插件，用于在开发模式下设置响应头
const cspPlugin = (): Plugin => ({
  name: "configure-response-headers",
  configureServer: (server) => {
    server.middlewares.use((_req, res, next) => {
      res.setHeader(
        "Content-Security-Policy",
        "default-src 'self' 'unsafe-inline' 'unsafe-eval'; script-src 'self' http://localhost:5173 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com; connect-src 'self' http://localhost:8000 http://localhost:8000/auth http://localhost:8000/auth/ http://localhost:8001 http://localhost:8002 http://localhost:8003 http://localhost:8080 ws://localhost:5173 https:; style-src 'self' 'unsafe-inline' data: blob: https:; img-src 'self' data: blob: https:; font-src 'self' data: https:; object-src 'self'; base-uri 'self';"
      );
      next();
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), cspPlugin()],
  optimizeDeps: {
    exclude: ["lucide-react"],
    include: ["pdfjs-dist"],
  },
  define: {
    global: "globalThis",
  },
  server: {
    port: 5173,
    fs: {
      allow: [".."],
    },
    // 启用错误覆盖，在浏览器中显示错误
    hmr: {
      host: "localhost",
      port: 5173,
      overlay: true,
    },
    // 代理API到后端服务
    proxy: {
      "/api": {
        target: "http://localhost:8002",
        changeOrigin: true,
      },
      "/auth": {
        target: "http://localhost:8002",
        changeOrigin: true,
      },
      "/api/dev": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
