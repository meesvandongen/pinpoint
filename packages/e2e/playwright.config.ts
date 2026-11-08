import { defineConfig } from '@playwright/test'

const CI = !!process.env.CI

/**
 * Two servers: the dev server, which has the test tools on like a preview deployment, and a
 * production build, which has the service worker and none of the test tools.
 */
export default defineConfig({
  testDir: './tests',
  timeout: 180_000,
  expect: { timeout: 15_000 },
  retries: CI ? 1 : 0,
  workers: 2,
  reporter: CI ? [['github'], ['list']] : 'list',
  use: {
    locale: 'en-GB',
    trace: 'off',
    // Software rendering, so the map works on machines without a GPU.
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
  },
  webServer: [
    {
      command: 'pnpm --filter pinpoint-app exec vp dev',
      url: 'http://localhost:3000/content/index.json',
      reuseExistingServer: !CI,
      cwd: '../..',
      timeout: 180_000,
    },
    {
      command: 'VITE_TEST_TOOLS=false pnpm --filter pinpoint-app run build && pnpm --filter pinpoint-app exec vp preview --port 4173 --strictPort',
      url: 'http://localhost:4173/sw.js',
      reuseExistingServer: !CI,
      cwd: '../..',
      timeout: 180_000,
    },
  ],
  projects: [
    { name: 'preview', testMatch: /(journey|tools|admin)\.spec\.ts/, use: { baseURL: 'http://localhost:3000' } },
    { name: 'production', testMatch: /offline\.spec\.ts/, use: { baseURL: 'http://localhost:4173' } },
  ],
})
