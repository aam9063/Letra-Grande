// Proceso principal de la aplicacion de escritorio (DESK-02). Sigue las reglas
// de la seccion 4 de docs/desktop.md: una sola instancia, ventana con el
// renderer aislado de Node, protocolo propio con CSP estricta, navegacion
// limitada al origen propio, enlaces externos al navegador del sistema y
// permisos denegados por defecto.
import { existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BrowserWindow, app, protocol, session, shell } from "electron";
import { resolveAppUrl, type AppUrlResolution } from "./app-url.js";
import { buildCsp } from "./csp.js";
import { proxyOriginFromEnv, rendererDistFromEnv } from "./config.js";
import { inlineScriptHashes } from "./inline-scripts.js";
import { APP_ORIGIN, isExternalWebUrl, isNavigationAllowed } from "./navigation.js";
import { NO_PERMISSIONS_ALLOWED, isPermissionAllowed } from "./permissions.js";

const APP_URL = `${APP_ORIGIN}/`;

// Extensiones que sirve el renderer estatico. La lista es cerrada a proposito:
// cualquier otra cosa responde como application/octet-stream.
const MIME_TYPES: Readonly<Record<string, string>> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json",
  ".webmanifest": "application/manifest+json",
};

/** Raiz del renderer estatico producido por `pnpm --filter @letra-grande/web build:desktop`. */
function rendererDistRoot(): string {
  const sobrecarga = rendererDistFromEnv();
  if (sobrecarga !== undefined) return path.resolve(sobrecarga);
  // En desarrollo dist/main.js vive en apps/desktop: la exportacion esta en
  // apps/web/dist-desktop. En un paquete instalado la ruta la ajusta DESK-03.
  return path.resolve(import.meta.dirname, "..", "..", "web", "dist-desktop");
}

function mimeTypeOf(filePath: string): string {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
}

function isRegularFile(absPath: string): boolean {
  return existsSync(absPath) && statSync(absPath).isFile();
}

/**
 * Convierte una ruta relativa ya validada en una absoluta dentro de la raiz.
 * Segunda barrera contra saltos de directorio: aunque la resolucion pura
 * rechace los patrones conocidos, aqui se comprueba con path.resolve que el
 * resultado sigue dentro de la raiz del renderer.
 */
function absolutePathInsideRoot(relativePath: string, root: string): string | null {
  const absoluta = path.resolve(root, relativePath);
  const relativaFinal = path.relative(root, absoluta);
  if (relativaFinal === "" || relativaFinal.startsWith("..") || path.isAbsolute(relativaFinal)) {
    return null;
  }
  return absoluta;
}

function plainTextResponse(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

/**
 * Sirve un archivo de la exportacion estatica con la CSP estricta anadida.
 * En las paginas HTML se calculan los hashes de sus scripts en linea para que
 * la CSP solo autorice esos bloques concretos del renderer.
 */
async function serveRendererFile(absPath: string, cspBase: string): Promise<Response> {
  const contenido = await readFile(absPath);
  const esHtml = mimeTypeOf(absPath).startsWith("text/html");
  const csp = esHtml
    ? buildCsp(proxyOriginFromEnv(), inlineScriptHashes(contenido.toString("utf8")))
    : cspBase;
  return new Response(new Uint8Array(contenido), {
    headers: {
      "content-type": mimeTypeOf(absPath),
      "content-security-policy": csp,
      "x-content-type-options": "nosniff",
      "cache-control": "no-cache",
    },
  });
}

/**
 * Manejador del protocolo app://. Resuelve la URL a un archivo del renderer
 * y deniega cualquier peticion que pretenda salir de ese directorio.
 */
function createProtocolHandler(root: string, cspBase: string) {
  return async (request: Request): Promise<Response> => {
    const resolucion: AppUrlResolution = resolveAppUrl(request.url, (relativePath) =>
      isRegularFile(path.resolve(root, relativePath)),
    );
    if (resolucion.kind === "rejected") {
      return plainTextResponse("Ruta no permitida", 403);
    }
    // La caida al index.html tambien pasa por la misma segunda barrera.
    const relativo =
      resolucion.kind === "fallbackIndex" ? "index.html" : resolucion.relativePath;
    const absPath = absolutePathInsideRoot(relativo, root);
    if (absPath === null) return plainTextResponse("Ruta no permitida", 403);
    try {
      return await serveRendererFile(absPath, cspBase);
    } catch {
      return plainTextResponse("Archivo no encontrado", 404);
    }
  };
}

/** Registra el esquema con privilegios de esquema estandar antes del ready. */
function registerAppProtocol(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: "app",
      privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
    },
  ]);
}

/** Registra protocolo, permisos y ventanas en la sesion por defecto. */
function configureSession(): void {
  const csp = buildCsp(proxyOriginFromEnv());
  const root = rendererDistRoot();
  protocol.handle("app", createProtocolHandler(root, csp));

  // Permisos denegados por defecto: peticiones y comprobaciones sincronas.
  session.defaultSession.setPermissionRequestHandler((_contents, permission, callback) => {
    callback(isPermissionAllowed(permission, NO_PERMISSIONS_ALLOWED));
  });
  session.defaultSession.setPermissionCheckHandler(
    (_contents, permission) => isPermissionAllowed(permission, NO_PERMISSIONS_ALLOWED),
  );
}

function createMainWindow(): BrowserWindow {
  const ventana = new BrowserWindow({
    width: 1024,
    height: 768,
    title: "Letra Grande",
    webPreferences: {
      preload: fileURLToPath(new URL("./preload.cjs", import.meta.url)),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });

  // Navegacion fuera del origen propio: bloqueada. Un enlace web se abre en el
  // navegador del sistema, nunca dentro de la ventana.
  ventana.webContents.on("will-navigate", (event, url) => {
    if (isNavigationAllowed(url)) return;
    event.preventDefault();
    if (isExternalWebUrl(url)) void shell.openExternal(url);
  });

  // Ventanas nuevas: denegadas. Los enlaces externos van al navegador del sistema.
  ventana.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternalWebUrl(url)) void shell.openExternal(url);
    return { action: "deny" };
  });

  void ventana.loadURL(APP_URL);
  return ventana;
}

function focusMainWindow(): void {
  const ventana = BrowserWindow.getAllWindows()[0];
  if (ventana !== undefined) {
    if (ventana.isMinimized()) ventana.restore();
    ventana.focus();
  }
}

// El esquema se registra antes de que arranque el bucle de eventos.
registerAppProtocol();

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", focusMainWindow);

  void app.whenReady().then(() => {
    configureSession();
    createMainWindow();
  });

  // Alcance inicial solo Windows: al cerrar la ventana se acaba el proceso.
  app.on("window-all-closed", () => {
    app.quit();
  });
}
