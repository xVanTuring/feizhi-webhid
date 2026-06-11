import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// WebHID 仅在安全上下文(https 或 localhost)可用，dev server 默认 localhost 已满足。
export default defineConfig({
  plugins: [svelte()],
  server: { port: 5174 },
});
