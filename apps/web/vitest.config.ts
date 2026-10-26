// Tests de la app web (AI-01): proyecto node para el handler de la API
// y proyecto jsdom para componentes de interfaz más adelante.
import { defineConfig } from "vitest/config";

export default defineConfig({
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
          include: ["src/**/*.test.tsx"],
          // Aún no hay tests de componentes: AI-02 añadirá los primeros.
          passWithNoTests: true,
        },
      },
    ],
  },
});
