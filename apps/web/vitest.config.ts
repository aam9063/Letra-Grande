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
        },
        // El tsconfig de la app usa jsx "preserve" para Next: aquí se compila
        // con el runtime automático de React para los tests de componentes.
        esbuild: { jsx: "automatic" },
      },
    ],
  },
});
