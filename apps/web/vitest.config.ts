// Dos proyectos: `node` para el handler de la API y las pruebas que leen
// archivos del repositorio, y `jsdom` para los componentes de interfaz.
// Los specs de Playwright (e2e/) no son tests unitarios: se excluyen.
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    projects: [
      {
        test: {
          name: "node",
          environment: "node",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "jsdom",
          environment: "jsdom",
          globals: true,
          setupFiles: ["./src/test/setup.ts"],
          include: ["src/**/*.test.tsx"],
          exclude: ["**/node_modules/**", "e2e/**"],
        },
      },
    ],
  },
});
