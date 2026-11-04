import { defineConfig } from "@playwright/test";
if (!process.env.SUPABASE_PUBLISHABLE_KEY) throw new Error("Supply the isolated local stack's public key.");
export default defineConfig({
  testDir: "./tests", testMatch: "*.local.ts", workers: 1, timeout: 60000,
  use: { baseURL: "http://127.0.0.1:3102", headless: true,
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] } : {} },
  webServer: { command: "npx next start --hostname 127.0.0.1 --port 3102", url: "http://127.0.0.1:3102", reuseExistingServer: false,
    env: { PORTAL_MODE: "local", PORTAL_ORIGIN: "http://127.0.0.1:3102", SUPABASE_URL: "http://127.0.0.1:56321", SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY } },
});
