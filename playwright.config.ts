import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 10_000
  },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry"
  },
  webServer: {
    command: "npm run dev:webpack",
    url: "http://localhost:3000/api/health",
    env: {
      AUTH_SECRET: process.env.AUTH_SECRET ?? "playwright-local-secret",
      CHECKOUT_PAYMENT_MOCK: "true",
      DATABASE_URL:
        process.env.DATABASE_URL ??
        "postgresql://nerdlingolab:nerdlingolab_dev_password@localhost:5432/nerdlingolab"
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] }
    }
  ]
});
