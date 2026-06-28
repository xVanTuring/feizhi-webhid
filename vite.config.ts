import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// WebHID 仅在安全上下文(https 或 localhost)可用。GitHub Pages 走 https，可用。
// 部署在项目页 https://xvanturing.github.io/feizhi-webhid/，生产构建需带子路径 base；
// 开发(localhost 根路径)保持 '/'。用 mode 区分：
//   vite(dev)→development→'/'；vite build / preview→production→'/feizhi-webhid/'。
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/feizhi-webhid/' : '/',
  plugins: [svelte()],
  server: { port: 5174 },
}));
