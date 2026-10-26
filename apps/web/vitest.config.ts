import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Entorno jsdom para render de componentes con @testing-library/react.
// Los specs de Playwright (e2e/) no son tests unitarios: se excluyen.
export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    exclude: ["**/node_modules/**", "e2e/**"],
  },
});
