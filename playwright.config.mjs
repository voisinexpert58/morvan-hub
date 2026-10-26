import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR || './test-results/browser', timeout: 45000, workers: 1,
  use: { baseURL: 'http://127.0.0.1:4173', headless: true },
  webServer: {
    command: 'npm run dev -- --port 4173 --strictPort', url: 'http://127.0.0.1:4173', reuseExistingServer: false,
    env: { VITE_SUPABASE_URL: 'https://morvan-test.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_only', VITE_DEMO_MODE: 'false' }
  }
});
