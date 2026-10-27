// Flujo del canal de actualizaciones (DESK-03b). El comportamiento esta
// desacoplado de Electron: el actualizador y los dialogos son dependencias
// inyectables, de modo que las pruebas pueden demostrar que nada se descarga
// ni se instala sin respuesta afirmativa (seccion 4 de docs/desktop.md).

import type { VersionAnnouncer } from "./update-announce.js";
import {
  downloadErrorText,
  updateAvailableText,
  updateReadyText,
  type DialogText,
} from "./update-messages.js";

/** Version nueva anunciada por el feed. Solo importa su numero. */
export interface UpdateInfoLike {
  readonly version: string;
}

/** Superficie del actualizador que usa el flujo. La real es la de Electron. */
export interface UpdaterLike {
  autoDownload: boolean;
  autoInstallOnAppQuit: boolean;
  logger?: unknown;
  on(
    event: "update-available" | "update-downloaded",
    listener: (info: UpdateInfoLike) => unknown,
  ): unknown;
  on(event: "error", listener: (error: Error) => unknown): unknown;
  checkForUpdates(): Promise<unknown>;
  downloadUpdate(): Promise<unknown>;
  quitAndInstall(): void;
}

/** Dialogos y datos que el flujo necesita de la aplicacion. */
export interface UpdateFlowDeps {
  readonly updater: UpdaterLike;
  /** Memoria de versiones anunciadas: la misma version no se avisa dos veces. */
  readonly shouldAnnounce: VersionAnnouncer["shouldAnnounce"];
  /** Version instalada, para el texto del dialogo. */
  currentVersion(): string;
  /** true solo si la persona acepta descargar ahora. */
  askDownload(text: DialogText): Promise<boolean>;
  /** true solo si la persona acepta reiniciar e instalar ahora. */
  askInstall(text: DialogText): Promise<boolean>;
  /** Aviso breve cuando la descarga falla. Sin reintentos. */
  notifyDownloadError(): Promise<void> | void;
}

/**
 * Desactiva todo comportamiento automatico del actualizador: sin descarga ni
 * instalacion sin dialogo, y sin registro en consola (el modo diagnostico
 * imprime una sola linea y los fallos normales quedan en silencio).
 */
export function forbidAutomaticUpdaterBehavior(updater: UpdaterLike): void {
  updater.autoDownload = false;
  updater.autoInstallOnAppQuit = false;
  updater.logger = null;
}

/** Version nueva: pregunta antes de descargar y avisa si la descarga falla. */
export async function handleUpdateAvailable(
  deps: UpdateFlowDeps,
  info: UpdateInfoLike,
): Promise<void> {
  if (!deps.shouldAnnounce(info.version)) return;
  const texto = updateAvailableText(deps.currentVersion(), info.version);
  if (!(await deps.askDownload(texto))) return;
  try {
    await deps.updater.downloadUpdate();
  } catch {
    // Fallo de descarga: un aviso corto y se queda ahi. Sin reintentos ni
    // dialogos repetidos.
    await deps.notifyDownloadError();
  }
}

/** Descarga terminada: reinicia e instala solo con respuesta afirmativa. */
export async function handleUpdateDownloaded(
  deps: UpdateFlowDeps,
  info: UpdateInfoLike,
): Promise<void> {
  const texto = updateReadyText(info.version);
  if (await deps.askInstall(texto)) deps.updater.quitAndInstall();
}

/**
 * Arranca el canal: aplica el candado, registra los eventos y comprueba una
 * vez. Los fallos de red son silenciosos para la persona: solo consola.
 */
export function setupUpdater(deps: UpdateFlowDeps): void {
  forbidAutomaticUpdaterBehavior(deps.updater);
  deps.updater.on("error", (error) => {
    console.error("[actualizaciones]", error.message);
  });
  deps.updater.on("update-available", (info) => handleUpdateAvailable(deps, info));
  deps.updater.on("update-downloaded", (info) => handleUpdateDownloaded(deps, info));
  void deps.updater.checkForUpdates().catch(() => undefined);
}
