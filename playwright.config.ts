import { defineConfig, devices } from "@playwright/test";
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

// End to end tests in a real browser, against the example chat app and a
// ToolDB relay node. Only used for tests: `npm run test:e2e`, after building
// the packages and installing the example (`cd example && npm install`).
const RELAY_PORT = 8091;
const APP_PORT = 5181;

export default defineConfig({
  testDir: "e2e",
  testMatch: "*.e2e.ts",
  timeout: 60000,
  fullyParallel: false,
  reporter: process.env.CI ? "list" : "line",
  use: {
    baseURL: `http://127.0.0.1:${APP_PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node relay.mjs",
      cwd: "example",
      url: `http://127.0.0.1:${RELAY_PORT}`,
      env: {
        PORT: String(RELAY_PORT),
        RELAY_DATA: mkdtempSync(join(tmpdir(), "tooldb-e2e-relay-")),
      },
      reuseExistingServer: false,
    },
    {
      command: `npx vite --host 127.0.0.1 --port ${APP_PORT} --strictPort`,
      cwd: "example",
      url: `http://127.0.0.1:${APP_PORT}`,
      env: { VITE_RELAYS: `ws://127.0.0.1:${RELAY_PORT}` },
      reuseExistingServer: false,
    },
  ],
});
