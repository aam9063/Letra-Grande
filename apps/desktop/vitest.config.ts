// Solo las pruebas del codigo fuente: la salida compilada (dist) contiene
// copias de los mismos tests y no debe ejecutarse dos veces.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
