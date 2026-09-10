import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45_000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.TEST_BASE_URL || "http://localhost:3005",
    browserName: "chromium",
    viewport: { width: 1440, height: 1100 },
    permissions: ["camera", "microphone"],
    launchOptions: {
      args: [
        "--use-fake-device-for-media-stream",
        "--use-fake-ui-for-media-stream",
        "--host-resolver-rules=MAP chatruletka.test 127.0.0.1",
      ],
    },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: process.env.TEST_BASE_URL
    ? undefined
    : {
        command: "npm run dev -- --port 3005",
        url: "http://localhost:3005/api/health",
        reuseExistingServer: true,
        timeout: 90_000,
      },
});
