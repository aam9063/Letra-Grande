// Segunda barrera contra saltos de directorio: comprueba que el archivo que se
// va a servir resuelve, una vez seguidos los enlaces simbolicos, a una ruta
// real dentro de la raiz real del renderer. Un enlace dentro del renderer que
// apunte fuera queda asi bloqueado, no solo los patrones lexicos.
import { realpathSync } from "node:fs";
import path from "node:path";

/**
 * Convierte una ruta relativa ya validada en una absoluta dentro de la raiz.
 * Primero la barrera lexica (sin subir de directorio) y despues la real:
 * se comparan las rutas canonicas de realpath. Si el archivo todavia no existe
 * se mantiene la aceptacion lexica y el manejador respondera 404 al leerlo.
 * Devuelve null si la ruta escapa de la raiz.
 */
export function absolutePathInsideRoot(relativePath: string, root: string): string | null {
  const absoluta = path.resolve(root, relativePath);
  const relativaFinal = path.relative(root, absoluta);
  if (relativaFinal === "" || relativaFinal.startsWith("..") || path.isAbsolute(relativaFinal)) {
    return null;
  }
  try {
    const raizReal = realpathSync(root);
    const real = realpathSync(absoluta);
    if (real !== raizReal && !real.startsWith(raizReal + path.sep)) {
      return null;
    }
  } catch {
    // No se pudo resolver el camino real (por ejemplo, archivo inexistente):
    // la decision queda en la barrera lexica y en la lectura posterior.
  }
  return absoluta;
}
