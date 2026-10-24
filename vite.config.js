import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// 兩次獨立打包，避免 MPA 共用 chunk 提前執行 gameplay，破壞房間註冊順序。
// 第二次保留主遊戲產物，工作台仍使用相對路徑支援 GitHub Pages 子目錄。
export default defineConfig(({ mode }) => ({
  base: './',
  build: {
    target: 'es2020', chunkSizeWarningLimit: 1500,
    emptyOutDir: mode !== 'wardrobe',
    copyPublicDir: mode !== 'wardrobe',
    assetsDir: mode === 'wardrobe' ? 'wardrobe/assets' : 'assets',
    rollupOptions: { input: mode === 'wardrobe'
      ? fileURLToPath(new URL('./wardrobe/index.html', import.meta.url))
      : fileURLToPath(new URL('./index.html', import.meta.url)),
    },
  },
}));
