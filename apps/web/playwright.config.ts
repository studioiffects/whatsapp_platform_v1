import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 90_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "npm run start:dev",
      url: "http://localhost:3001/api/v1/health",
      cwd: "../api",
      reuseExistingServer: true,
      timeout: 120_000,
      env: {
        ...process.env,
        PORT: "3001",
      },
    },
    {
      command: "npm run dev",
      url: "http://localhost:3000/login",
      cwd: ".",
      reuseExistingServer: true,
      timeout: 120_000,
      env: {
        ...process.env,
        NEXTAUTH_URL: "http://localhost:3000",
        NEXTAUTH_SECRET: "replace_with_strong_secret",
        API_BASE_URL: "http://localhost:3001/api/v1",
        NEXT_PUBLIC_API_BASE_URL: "http://localhost:3001/api/v1",
      },
    },
  ],
});
