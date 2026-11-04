import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: "*.spec.ts",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3100",
    headless: true,
    launchOptions: process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] }
      : {},
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "node tests/fake-supabase.mjs",
      port: 55431,
      reuseExistingServer: false,
    },
    {
      command: "npm start",
      url: "http://127.0.0.1:3100",
      reuseExistingServer: false,
      env: {
        PORTAL_MODE: "local",
        PORTAL_ORIGIN: "http://127.0.0.1:3100",
        SUPABASE_URL: "http://127.0.0.1:55431",
        SUPABASE_PUBLISHABLE_KEY: "fixture-publishable",
      },
    },
    {
      command: "npx next start --hostname 127.0.0.1 --port 3101",
      url: "http://127.0.0.1:3101",
      reuseExistingServer: false,
      env: {
        PORTAL_MODE: "closed",
        PORTAL_ORIGIN: "http://127.0.0.1:3101",
        SUPABASE_URL: "http://127.0.0.1:55431",
        SUPABASE_PUBLISHABLE_KEY: "fixture-publishable",
      },
    },
    {
      command: "npx next start --hostname 127.0.0.1 --port 3103",
      url: "http://127.0.0.1:3103",
      reuseExistingServer: false,
      env: {
        // A proposed future mode must not accidentally enable today's portal.
        PORTAL_MODE: "hosted",
        PORTAL_ORIGIN: "http://127.0.0.1:3103",
        SUPABASE_URL: "http://127.0.0.1:55431",
        SUPABASE_PUBLISHABLE_KEY: "fixture-publishable",
      },
    },
  ],
});
