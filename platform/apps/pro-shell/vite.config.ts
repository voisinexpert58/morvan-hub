import { defineConfig, loadEnv } from 'vite';
import { validateClientEnv } from '../../../demo/shared/config.mjs';
import { federation } from '@module-federation/vite';

export default defineConfig(({mode}) => {
  validateClientEnv(loadEnv(mode, '../../..', ''));
  return {
  envDir: '../../..',
  plugins: [federation({
    name: 'morvan_pro_shell',
    shared: {
      react: { singleton: true },
      'react-dom': { singleton: true }
    }
  })],
  server: { port: 4100, strictPort: true },
  build: { target: 'esnext' }
};
});

