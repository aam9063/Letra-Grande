// Resolucion de la raiz del renderer estatico (DESK-03). En desarrollo el
// renderer es la exportacion estatica de apps/web dentro del repositorio; en
// la app instalada electron-builder lo copia a una carpeta fija de
// extraResources. Logica pura, cubierta por pruebas.
import path from "node:path";

/** Carpeta fija de extraResources donde viaja el renderer en el paquete. */
export const PACKAGED_RENDERER_DIRNAME = "renderer";

/** Datos que Electron da al proceso principal para resolver la raiz. */
export interface RendererRootContext {
  /** true cuando la app corre desde el paquete instalado. */
  isPackaged: boolean;
  /** process.resourcesPath: carpeta de recursos del paquete instalado. */
  resourcesPath: string;
  /** app.getAppPath(): en desarrollo, la carpeta de apps/desktop. */
  appPath: string;
}

/**
 * Raiz del renderer estatico producido por
 * `pnpm --filter @letra-grande/web build:desktop`. En desarrollo apunta a
 * apps/web/dist-desktop del repositorio; en el paquete instalado, a la carpeta
 * fija de recursos que copia electron-builder.
 */
export function resolveRendererRoot(context: RendererRootContext): string {
  if (context.isPackaged) {
    return path.resolve(context.resourcesPath, PACKAGED_RENDERER_DIRNAME);
  }
  return path.resolve(context.appPath, "..", "web", "dist-desktop");
}

/**
 * Mensaje de error cuando falta el directorio del renderer. Devuelve null si
 * esta presente. El proceso principal lo muestra en un dialogo y cierra, en
 * lugar de servir una aplicacion vacia.
 */
export function rendererRootError(root: string, exists: boolean): string | null {
  if (exists) return null;
  return (
    `No se encuentra el renderer estatico en: ${root}. ` +
    'En desarrollo ejecuta "pnpm --filter @letra-grande/web build:desktop" ' +
    "antes de arrancar la aplicacion. Si la app esta instalada, reinstala el paquete."
  );
}
