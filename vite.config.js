import { defineConfig } from 'vite';

// base 用相對路徑，部署在 GitHub Pages 的子路徑（/nccu100/）也能正常載入
export default defineConfig({
  base: './',
  build: { target: 'es2020', chunkSizeWarningLimit: 1500 },
});
