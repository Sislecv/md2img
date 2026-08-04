import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // 相对路径：兼容 GitHub Pages 子路径部署
  base: "./",
  define: {
    // satori 0.24 依赖的 Node 全局，浏览器需 polyfill
    "process.env.NODE_ENV": JSON.stringify("development"),
    process: {
      env: {},
      browser: true,
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    // PRoot 环境无 inotify，文件变更需轮询检测，否则 vite 缓存旧模块
    watch: { usePolling: true, interval: 200 },
  },
});
