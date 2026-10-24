import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// base 用相對路徑，部署在 GitHub Pages 的子路徑（/nccu100/）也能正常載入
export default defineConfig({
  base: './',
  build: {
    target: 'es2020', chunkSizeWarningLimit: 1500,
    // 工作台獨立頁面，不把操作介面與換裝啟用流程匯入正式遊戲。
    rollupOptions: { input: {
      main: fileURLToPath(new URL('./index.html', import.meta.url)),
      wardrobe: fileURLToPath(new URL('./wardrobe/index.html', import.meta.url)),
    } },
  },
});
