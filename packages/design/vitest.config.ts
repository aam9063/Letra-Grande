import { defineConfig } from "vitest/config";

// Entorno jsdom para render de componentes con @testing-library/react.
export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
  },
});
