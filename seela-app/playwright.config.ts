import { defineConfig, devices } from '@playwright/test'

// Cible : PLAYWRIGHT_BASE_URL (ex. une preview Vercel) ou, à défaut, un serveur local.
const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL
const baseURL = externalBaseURL ?? 'http://localhost:3000'

// Les tests authentifiés ne tournent que si un compte de test est fourni
// (projet Supabase de staging uniquement — jamais la prod).
const hasTestUser = Boolean(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD)

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'fr-FR',
  },
  projects: [
    // Tests de fonctions pures (lib/), sans navigateur.
    { name: 'unit', testMatch: /unit\/.*\.spec\.ts/ },
    {
      name: 'public',
      testMatch: /public\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      testMatch: /public\/.*\.spec\.ts/,
      use: { ...devices['Pixel 7'] },
    },
    ...(hasTestUser
      ? [
          { name: 'setup', testMatch: /auth\.setup\.ts/ },
          {
            name: 'authenticated',
            testMatch: /authenticated\/.*\.spec\.ts/,
            dependencies: ['setup'],
            use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/user.json' },
          },
        ]
      : []),
  ],
  webServer: externalBaseURL
    ? undefined
    : {
        command: process.env.CI ? 'npm run start' : 'npm run dev',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
})
