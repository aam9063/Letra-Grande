import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const live = process.env.E2E_LIVE === "1";

export default defineConfig({
  testDir: "./e2e",
  // Los tests etiquetados @live llaman a NaN de verdad: solo con E2E_LIVE=1.
  grep: live ? /@live/ : undefined,
  grepInvert: live ? undefined : /@live/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    locale: "es-ES",
    timezoneId: "Europe/Madrid",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "mobile-chrome", use: { ...devices["Pixel 7"] } },
  ],
  // Se prueba la build de producción: el service worker de la PWA no se comporta igual en desarrollo.
  webServer: {
    command: `pnpm build && pnpm exec next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: {
      ...(process.env as Record<string, string>),
      AI_PROVIDER: live ? "nan" : "mock",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
