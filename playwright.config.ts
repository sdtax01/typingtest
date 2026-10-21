import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

// The sandbox ships a pre-installed Chromium; elsewhere Playwright's own browser is used.
const sandboxChromium = '/opt/pw-browsers/chromium';
const executablePath = existsSync(sandboxChromium) ? sandboxChromium : undefined;

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  fullyParallel: true,
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:4173', launchOptions: { executablePath, args: ['--no-sandbox'] } },
  webServer: { command: 'npx vite build --mode e2e && npx vite preview --host 127.0.0.1 --port 4173 --strictPort', url: 'http://127.0.0.1:4173', reuseExistingServer: true, timeout: 180_000 },
});
