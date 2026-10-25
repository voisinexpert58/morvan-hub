import { defineConfig } from 'vite';
import { federation } from '@module-federation/vite';

export default defineConfig({
  plugins: [federation({
    name: 'morvan_accueil',
    filename: 'remoteEntry.js',
    exposes: { './App': './src/Accueil.tsx' },
    shared: {
      react: { singleton: true },
      'react-dom': { singleton: true }
    }
  })],
  server: { port: 4201, strictPort: true, cors: {origin:'http://localhost:4100'} },
  preview: { port: 4201, strictPort: true, cors: {origin:'http://localhost:4100'} },
  build: { target: 'esnext' }
});
