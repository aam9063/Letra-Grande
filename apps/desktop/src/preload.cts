// Preload del escritorio: la unica superficie que ve el renderer. Corre en un
// sandbox (no tiene Node completo) y expone por contextBridge un objeto plano
// con tres valores. Nada de ipcRenderer en crudo, nada de require, nada de
// sistema de archivos.
import { contextBridge } from "electron";

/** Lee process.versions.electron con tolerancia al sandbox incompleto. */
function electronVersion(): string {
  try {
    const version = process.versions["electron"];
    return typeof version === "string" ? version : "";
  } catch {
    return "";
  }
}

/** Lee process.platform con tolerancia al sandbox incompleto. */
function platformName(): string {
  try {
    return typeof process.platform === "string" ? process.platform : "";
  } catch {
    return "";
  }
}

contextBridge.exposeInMainWorld("letraGrande", {
  version: electronVersion(),
  platform: platformName(),
  isDesktop: true,
} satisfies LetraGrandeApi);

/** Contrato de la superficie expuesta al renderer. */
interface LetraGrandeApi {
  readonly version: string;
  readonly platform: string;
  readonly isDesktop: true;
}
