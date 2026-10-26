import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'node:path';
import { validateClientEnv } from './demo/shared/config.mjs';

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  // Validate before Vite emits a bundle: never embed privileged keys, even by mistake.
  validateClientEnv(env);
  return {
    root: 'demo', envDir: '..', base: './',
    build: { outDir: '../dist', emptyOutDir: true, rollupOptions: { input: {
      explorer: resolve('demo/index.html'), pro: resolve('demo/pro.html')
    } } }
  };
});
