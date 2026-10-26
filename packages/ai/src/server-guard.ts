// La capa de proveedor es solo de servidor: guarda en tiempo de carga (R1).
// Si un bundler la mete en el bundle del cliente, falla al cargar en el navegador.
import { LlmError } from "./errors.js";

// Detección por defecto: la presencia de window en globalThis delata un navegador.
export function esContextoNavegador(): boolean {
  return typeof (globalThis as { window?: unknown }).window !== "undefined";
}

// Detect es inyectable para poder probar la guarda sin un navegador real.
export function assertServerContext(detect: () => boolean = esContextoNavegador): void {
  if (detect()) {
    throw new LlmError(
      "invalidInput",
      "La capa de proveedor de IA es solo de servidor: no se puede importar en el navegador. La clave del proveedor vive solo en variables de entorno del servidor.",
    );
  }
}
