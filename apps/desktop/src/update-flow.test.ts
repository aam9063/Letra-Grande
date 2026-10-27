import { describe, expect, it } from "vitest";
import { createVersionAnnouncer } from "./update-announce.js";
import type { DialogText } from "./update-messages.js";
import {
  forbidAutomaticUpdaterBehavior,
  handleUpdateAvailable,
  handleUpdateDownloaded,
  setupUpdater,
  type UpdateFlowDeps,
  type UpdaterLike,
} from "./update-flow.js";

/** Actualizador falso: graba losListeners y las llamadas que importan. */
function createFakeUpdater(options: { fallaDescarga?: boolean } = {}) {
  const listeners = new Map<string, (argumento: never) => unknown>();
  const llamadas = { download: 0, install: 0, check: 0 };
  const fake = {
    autoDownload: true,
    autoInstallOnAppQuit: true,
    on(evento: string, listener: (argumento: never) => unknown) {
      listeners.set(evento, listener);
      return fake;
    },
    async checkForUpdates() {
      llamadas.check++;
      return null;
    },
    async downloadUpdate() {
      llamadas.download++;
      if (options.fallaDescarga === true) throw new Error("sin red");
      return null;
    },
    quitAndInstall() {
      llamadas.install++;
    },
  };
  return {
    fake,
    listeners,
    llamadas,
    async emitir(evento: "update-available" | "update-downloaded", version: string) {
      const listener = listeners.get(evento);
      if (listener === undefined) throw new Error(`sin listener para ${evento}`);
      await listener({ version } as never);
    },
  };
}

/** Dependencias falsas: cada dialogo responde lo que el test decide. */
function createDeps(
  fake: UpdaterLike,
  respuestas: { descarga?: boolean; instalacion?: boolean } = {},
) {
  const llamadas = { askDownload: 0, askInstall: 0, notifyDownloadError: 0 };
  const deps: UpdateFlowDeps = {
    updater: fake,
    shouldAnnounce: createVersionAnnouncer().shouldAnnounce,
    currentVersion: () => "0.0.1",
    askDownload: async (_texto: DialogText) => {
      llamadas.askDownload++;
      return respuestas.descarga ?? true;
    },
    askInstall: async (_texto: DialogText) => {
      llamadas.askInstall++;
      return respuestas.instalacion ?? true;
    },
    notifyDownloadError: async () => {
      llamadas.notifyDownloadError++;
    },
  };
  return { deps, llamadas };
}

describe("candado contra el comportamiento automatico", () => {
  it("deja desactivadas la descarga y la instalacion automaticas", () => {
    const { fake } = createFakeUpdater();
    forbidAutomaticUpdaterBehavior(fake);
    expect(fake.autoDownload).toBe(false);
    expect(fake.autoInstallOnAppQuit).toBe(false);
  });

  it("aplicado dos veces sigue dejandolo igual de cerrado", () => {
    const { fake } = createFakeUpdater();
    forbidAutomaticUpdaterBehavior(fake);
    forbidAutomaticUpdaterBehavior(fake);
    expect(fake.autoDownload).toBe(false);
    expect(fake.autoInstallOnAppQuit).toBe(false);
  });
});

describe("flujo de actualizacion con consentimiento", () => {
  it("aplica el candado al arrancar el canal", () => {
    const { fake } = createFakeUpdater();
    const { deps } = createDeps(fake);
    setupUpdater(deps);
    expect(fake.autoDownload).toBe(false);
    expect(fake.autoInstallOnAppQuit).toBe(false);
    expect(fake.checkForUpdates).toBeDefined();
  });

  it("comprueba el canal una vez al arrancar", () => {
    const { fake, llamadas } = createFakeUpdater();
    const { deps } = createDeps(fake);
    setupUpdater(deps);
    expect(llamadas.check).toBe(1);
  });

  it("no descarga ni instala cuando la respuesta del dialogo es negativa", async () => {
    const { fake, llamadas } = createFakeUpdater();
    const { deps } = createDeps(fake, { descarga: false });
    await handleUpdateAvailable(deps, { version: "0.0.2" });
    expect(llamadas.download).toBe(0);
    expect(llamadas.install).toBe(0);
  });

  it("no instala nunca cuando la respuesta del dialogo de reinicio es negativa", async () => {
    const { fake, llamadas } = createFakeUpdater();
    const { deps } = createDeps(fake, { instalacion: false });
    await handleUpdateDownloaded(deps, { version: "0.0.2" });
    expect(llamadas.install).toBe(0);
  });

  it("instala solo cuando la respuesta del dialogo de reinicio es afirmativa", async () => {
    const { fake, llamadas } = createFakeUpdater();
    const { deps } = createDeps(fake, { instalacion: true });
    await handleUpdateDownloaded(deps, { version: "0.0.2" });
    expect(llamadas.install).toBe(1);
  });

  it("descarga cuando se acepta, y no toca la instalacion por su cuenta", async () => {
    const { fake, llamadas } = createFakeUpdater();
    const { deps } = createDeps(fake, { descarga: true });
    await handleUpdateAvailable(deps, { version: "0.0.2" });
    expect(llamadas.download).toBe(1);
    expect(llamadas.install).toBe(0);
  });

  it("si la descarga falla avisa una sola vez y no reintenta", async () => {
    const { fake, llamadas: llamadasUpdater } = createFakeUpdater({ fallaDescarga: true });
    const { deps, llamadas: llamadasDialogos } = createDeps(fake, { descarga: true });
    await handleUpdateAvailable(deps, { version: "0.0.2" });
    expect(llamadasDialogos.notifyDownloadError).toBe(1);
    expect(llamadasUpdater.install).toBe(0);
  });

  it("no pregunta dos veces por la misma version en la misma sesion", async () => {
    const { fake } = createFakeUpdater();
    const { deps, llamadas } = createDeps(fake);
    await handleUpdateAvailable(deps, { version: "0.0.2" });
    await handleUpdateAvailable(deps, { version: "0.0.2" });
    expect(llamadas.askDownload).toBe(1);
  });

  it("los eventos registrados llegan al mismo manejador con consentimiento", async () => {
    const { fake, llamadas, emitir } = createFakeUpdater();
    const { deps } = createDeps(fake, { instalacion: false });
    setupUpdater(deps);
    await emitir("update-downloaded", "0.0.2");
    expect(llamadas.install).toBe(0);
  });
});
