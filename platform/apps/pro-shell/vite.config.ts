import { defineConfig } from 'vite';
import { federation } from '@module-federation/vite';

export default defineConfig({
  plugins: [federation({
    name: 'morvan_pro_shell',
    shared: {
      react: { singleton: true },
      'react-dom': { singleton: true }
    }
  })],
  server: { port: 4100, strictPort: true },
  build: { target: 'esnext' }
});
