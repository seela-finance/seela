import { defineConfig, devices } from '@playwright/test'
import { FAKE_AI_PORT, loadStagingEnv } from './e2e/support/staging'

// E2E_STAGING=1 : parcours connectés sur le Supabase de staging, avec des comptes éphémères
// (`npm run test:staging`). Charge .env.staging.local et refuse toute autre base que le staging.
const stagingMode = process.env.E2E_STAGING === '1'
if (stagingMode) loadStagingEnv()

// Cible : PLAYWRIGHT_BASE_URL (ex. une preview Vercel) ou, à défaut, un serveur local.
const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL
// E2E_PORT : lancer les tests sur un autre port si 3000 est déjà pris
const port = Number(process.env.E2E_PORT ?? (stagingMode ? 3100 : 3000))
const baseURL = externalBaseURL ?? `http://localhost:${port}`

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
    ...(stagingMode
      ? [
          { name: 'staging-seed', testMatch: /staging\.seed\.ts/, teardown: 'staging-cleanup' },
          { name: 'staging-cleanup', testMatch: /staging\.cleanup\.ts/ },
          {
            name: 'flows',
            testMatch: /flows\/.*\.spec\.ts/,
            dependencies: ['staging-seed'],
            expect: { timeout: 20_000 },
            use: { ...devices['Desktop Chrome'] },
          },
        ]
      : []),
  ],
  webServer: externalBaseURL
    ? undefined
    : [
        {
          command: process.env.CI ? `npm run start -- -p ${port}` : `npm run dev -- -p ${port}`,
          url: baseURL,
          // Jamais de réutilisation en mode staging : un serveur déjà lancé peut viser une autre base
          reuseExistingServer: !process.env.CI && !stagingMode,
          timeout: 120_000,
        },
        ...(stagingMode
          ? [{ command: `node e2e/support/fake-anthropic.mjs ${FAKE_AI_PORT}`, url: `http://localhost:${FAKE_AI_PORT}`, reuseExistingServer: false }]
          : []),
      ],
})
