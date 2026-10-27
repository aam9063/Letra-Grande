// Proceso principal de la aplicacion de escritorio (DESK-02). Sigue las reglas
// de la seccion 4 de docs/desktop.md: una sola instancia, ventana con el
// renderer aislado de Node, protocolo propio con CSP estricta, navegacion
// limitada al origen propio, enlaces externos al navegador del sistema y
// permisos denegados por defecto.
import { existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BrowserWindow, app, dialog, protocol, session, shell } from "electron";
import electronUpdater from "electron-updater";
import type { UpdateInfo } from "electron-updater";
import { resolveAppUrl, type AppUrlResolution } from "./app-url.js";
import { buildCsp } from "./csp.js";
import { proxyOriginFromEnv, rendererDistOverride } from "./config.js";
import { inlineScriptHashes } from "./inline-scripts.js";
import { APP_ORIGIN, isExternalWebUrl, isNavigationAllowed, startUrl } from "./navigation.js";
import { NO_PERMISSIONS_ALLOWED, isPermissionAllowed } from "./permissions.js";
import { rendererRootError, resolveRendererRoot } from "./renderer-root.js";
import { absolutePathInsideRoot } from "./root-guard.js";
import { createVersionAnnouncer } from "./update-announce.js";
import { shouldCheckForUpdates, updateCheckResult } from "./update-check.js";
import { updateAvailableText, updateReadyText } from "./update-messages.js";

// El actualizador solo habla con GitHub Releases (decision D-12): sin
// telemetria y sin servidores de actualizacion de terceros. Nada se descarga
// ni se instala sin que la persona lo acepte en un dialogo (seccion 4 de
// docs/desktop.md).
const { autoUpdater } = electronUpdater;

/** Indicador del modo diagnostico: una comprobacion, una linea y fuera. */
const CHECK_UPDATES_FLAG = "--check-updates";

/** Memoria de versiones anunciadas de esta sesion: sin bucles de avisos. */
const announcer = createVersionAnnouncer();

function wantsDiagnosticUpdateCheck(): boolean {
  return process.argv.includes(CHECK_UPDATES_FLAG);
}

/**
 * Desactiva todo comportamiento automatico del actualizador. La descarga y la
 * instalacion siempre pasan por un dialogo con respuesta afirmativa.
 */
function forbidAutomaticUpdaterBehavior(): void {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  // Sin registro del actualizador en consola: el modo diagnostico imprime una
  // sola linea y los fallos normales quedan en silencio.
  autoUpdater.logger = null;
}

/**
 * Comprobacion unica del modo diagnostico. Devuelve la linea a imprimir y el
 * codigo de salida. Ante cualquier fallo se imprime el motivo y se sale con
 * error; nunca se abre ventana ni se muestra dialogo.
 */
async function diagnosticUpdateCheck(): Promise<{ line: string; exitCode: number }> {
  try {
    forbidAutomaticUpdaterBehavior();
    const resultado = await autoUpdater.checkForUpdates();
    const ultima = resultado?.updateInfo.version;
    const actual = app.getVersion();
    if (ultima !== undefined && ultima !== actual) {
      return updateCheckResult({ kind: "available", version: ultima });
    }
    return updateCheckResult({ kind: "none" });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    return updateCheckResult({ kind: "error", message: mensaje });
  }
}

/** Dialogo de version nueva: descarga solo si la respuesta es afirmativa. */
async function offerUpdateDownload(info: UpdateInfo): Promise<void> {
  if (!announcer.shouldAnnounce(info.version)) return;
  const texto = updateAvailableText(app.getVersion(), info.version);
  const { response } = await dialog.showMessageBox({
    type: "info",
    title: texto.title,
    message: texto.message,
    buttons: ["Descargar ahora", "Ahora no"],
    defaultId: 0,
    cancelId: 1,
    noLink: true,
  });
  if (response !== 0) return;
  try {
    await autoUpdater.downloadUpdate();
  } catch {
    // Fallo silencioso: el evento error ya lo deja en la consola.
  }
}

/** Dialogo de version descargada: instala solo si la respuesta es afirmativa. */
async function offerUpdateInstall(info: UpdateInfo): Promise<void> {
  const texto = updateReadyText(info.version);
  const { response } = await dialog.showMessageBox({
    type: "info",
    title: texto.title,
    message: texto.message,
    buttons: ["Reiniciar e instalar", "Mas tarde"],
    defaultId: 0,
    cancelId: 1,
    noLink: true,
  });
  if (response === 0) autoUpdater.quitAndInstall();
}

/**
 * Arranca el canal de actualizaciones en la app empaquetada. Comprueba al
 * arrancar; la descarga y la instalacion requieren un dialogo aceptado. Los
 * fallos son silenciosos para la persona: solo quedan en la consola.
 */
function setupUpdater(): void {
  if (!shouldCheckForUpdates({ isPackaged: app.isPackaged, env: process.env })) return;
  forbidAutomaticUpdaterBehavior();
  autoUpdater.on("error", (error) => {
    console.error("[actualizaciones]", error.message);
  });
  autoUpdater.on("update-available", (info) => {
    void offerUpdateDownload(info);
  });
  autoUpdater.on("update-downloaded", (info) => {
    void offerUpdateInstall(info);
  });
  void autoUpdater.checkForUpdates().catch(() => undefined);
}

const APP_URL = startUrl();

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

/** Raiz del renderer estatico, segun desarrollo o paquete instalado. */
function rendererDistRoot(): string {
  const sobrecarga = rendererDistOverride({ isPackaged: app.isPackaged });
  if (sobrecarga !== undefined) return path.resolve(sobrecarga);
  return resolveRendererRoot({
    isPackaged: app.isPackaged,
    resourcesPath: process.resourcesPath,
    appPath: app.getAppPath(),
  });
}

function mimeTypeOf(filePath: string): string {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
}

function isRegularFile(absPath: string): boolean {
  return existsSync(absPath) && statSync(absPath).isFile();
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
function configureSession(root: string): void {
  const csp = buildCsp(proxyOriginFromEnv());
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
} else if (wantsDiagnosticUpdateCheck()) {
  // Modo diagnostico (DESK-03b): una comprobacion del canal, una linea con el
  // resultado y salida con codigo claro. Sin ventana y sin dialogos. Sirve
  // tanto al binario instalado como a win-unpacked.
  void app.whenReady().then(async () => {
    const resultado = await diagnosticUpdateCheck();
    console.log(resultado.line);
    app.exit(resultado.exitCode);
  });
} else {
  app.on("second-instance", focusMainWindow);

  void app.whenReady().then(() => {
    // Sin renderer no hay aplicacion: se avisa con un dialogo claro y se
    // cierra, en lugar de abrir una ventana vacia.
    const root = rendererDistRoot();
    const problema = rendererRootError(root, existsSync(root));
    if (problema !== null) {
      dialog.showErrorBox("Letra Grande: falta el renderer", problema);
      app.quit();
      return;
    }
    configureSession(root);
    createMainWindow();
    setupUpdater();
  });

  // Alcance inicial solo Windows: al cerrar la ventana se acaba el proceso.
  app.on("window-all-closed", () => {
    app.quit();
  });
}
