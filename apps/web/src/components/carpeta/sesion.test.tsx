import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import {
  VaultLockedError,
  WrongPasswordError,
  type Vault,
  type VaultTimer,
} from "@letra-grande/vault";
import { CLAVE_EXISTE, crearSesionCarpeta, type EstadoCarpeta } from "./sesion";

// Sesión compartida de la carpeta (UI-07, S4): recuerda el vault abierto y
// su estado, y persiste solo la bandera de que existe carpeta. Las
// contraseñas son ficticias y la IndexedDB es fake-indexeddb.
const CLAVE = "frase-larga-de-prueba";
const CLAVE_OTRA = "otra-frase-larga-de-prueba";
const ITERACIONES_TEST = 1000;

let numeroBase = 0;

function almacenMemoria(): Pick<Storage, "getItem" | "setItem" | "removeItem"> & {
  datos: Map<string, string>;
} {
  const datos = new Map<string, string>();
  return {
    datos,
    getItem: (clave: string) => datos.get(clave) ?? null,
    setItem: (clave: string, valor: string) => {
      datos.set(clave, valor);
    },
    removeItem: (clave: string) => {
      datos.delete(clave);
    },
  };
}

function sesionNueva(almacen = almacenMemoria()): {
  sesion: ReturnType<typeof crearSesionCarpeta>;
  almacen: ReturnType<typeof almacenMemoria>;
} {
  numeroBase += 1;
  const factory = new IDBFactory();
  return {
    sesion: crearSesionCarpeta({
      almacen,
      indexedDB: factory,
      dbName: `test-sesion-${numeroBase}`,
      iterations: ITERACIONES_TEST,
    }),
    almacen,
  };
}

class RelojManual implements VaultTimer {
  pendiente: { ms: number; callback: () => void } | undefined;

  schedule(ms: number, callback: () => void): unknown {
    this.pendiente = { ms, callback };
    return this;
  }

  cancel(): void {
    this.pendiente = undefined;
  }

  disparar(): void {
    const { callback } = this.pendiente ?? {};
    if (!callback) {
      throw new Error("no hay bloqueo programado");
    }
    this.pendiente = undefined;
    callback();
  }
}

describe("crear (T1)", () => {
  it("marca la sesión como abierta y expone el vault desbloqueado", async () => {
    const { sesion } = sesionNueva();
    expect(sesion.consultar()).toBe("no-creada");

    await sesion.crear(CLAVE);

    expect(sesion.consultar()).toBe("abierta");
    const vault = sesion.obtenerVault();
    expect(vault).not.toBeNull();
    expect(vault?.locked).toBe(false);
  });

  it("persiste solo la bandera de que existe carpeta, nunca claves ni datos", async () => {
    const { sesion, almacen } = sesionNueva();
    await sesion.crear(CLAVE);

    // Una sesión nueva del mismo dispositivo ve la carpeta cerrada: la clave
    // del vault no se guarda en ninguna parte.
    numeroBase += 1;
    const segunda = crearSesionCarpeta({
      almacen,
      indexedDB: new IDBFactory(),
      dbName: `test-flag-${numeroBase}`,
      iterations: ITERACIONES_TEST,
    });

    expect(segunda.consultar()).toBe("cerrada");
    expect(segunda.obtenerVault()).toBeNull();
    expect(almacen.getItem(CLAVE_EXISTE)).toBe("1");
    expect(Array.from(almacen.datos.keys())).toEqual([CLAVE_EXISTE]);
  });

  it("con una contraseña distinta a la del vault falla de forma honesta y no toca los datos", async () => {
    const { sesion } = sesionNueva();
    const vault = await sesion.crear(CLAVE);
    await vault.settings.put("prueba", { valor: 1 });
    sesion.bloquear();

    await expect(sesion.crear(CLAVE_OTRA)).rejects.toBeInstanceOf(WrongPasswordError);
    expect(sesion.consultar()).toBe("cerrada");

    // Con la contraseña buena, los datos siguen exactamente igual.
    const reabierta = await sesion.desbloquear(CLAVE);
    await expect(reabierta.settings.get("prueba")).resolves.toEqual({ valor: 1 });
  });
});

describe("desbloquear (T2)", () => {
  it("con contraseña errónea lanza el error honesto y deja la sesión cerrada", async () => {
    const { sesion } = sesionNueva();
    await sesion.crear(CLAVE);
    sesion.bloquear();

    await expect(sesion.desbloquear(CLAVE_OTRA)).rejects.toBeInstanceOf(WrongPasswordError);

    expect(sesion.consultar()).toBe("cerrada");
    expect(sesion.obtenerVault()).toBeNull();
  });

  it("con la contraseña correcta abre y los datos guardados siguen ahí", async () => {
    const { sesion } = sesionNueva();
    const vault = await sesion.crear(CLAVE);
    await vault.settings.put("prueba", { valor: 1 });
    sesion.bloquear();

    await sesion.desbloquear(CLAVE);

    expect(sesion.consultar()).toBe("abierta");
    const reabierta = sesion.obtenerVault();
    await expect(reabierta?.settings.get("prueba")).resolves.toEqual({ valor: 1 });
  });
});

describe("bloquear (T3)", () => {
  it("cierra la sesión: sin vault en la sesión y con la clave descartada", async () => {
    const { sesion } = sesionNueva();
    const vault: Vault = await sesion.crear(CLAVE);

    sesion.bloquear();

    expect(sesion.consultar()).toBe("cerrada");
    expect(sesion.obtenerVault()).toBeNull();
    expect(vault.locked).toBe(true);
    // La clave se ha descartado: el vault anterior ya no puede leer nada.
    await expect(vault.settings.get("prueba")).rejects.toBeInstanceOf(VaultLockedError);
  });
});

describe("suscripción y bloqueo automático (S4)", () => {
  it("avisa a los suscriptores de cada cambio de estado y permite darse de baja", async () => {
    const { sesion } = sesionNueva();
    const estados: EstadoCarpeta[] = [];
    const baja = sesion.suscribirse((estado) => estados.push(estado));

    await sesion.crear(CLAVE);
    sesion.bloquear();
    baja();
    await sesion.desbloquear(CLAVE);

    expect(estados).toEqual(["abierta", "cerrada"]);
  });

  it("el bloqueo automático por inactividad cierra la sesión compartida", async () => {
    numeroBase += 1;
    const reloj = new RelojManual();
    const sesion = crearSesionCarpeta({
      almacen: almacenMemoria(),
      indexedDB: new IDBFactory(),
      dbName: `test-auto-${numeroBase}`,
      iterations: ITERACIONES_TEST,
      inactivityMs: 10,
      timer: reloj,
    });

    await sesion.crear(CLAVE);
    expect(sesion.consultar()).toBe("abierta");

    reloj.disparar();

    expect(sesion.consultar()).toBe("cerrada");
    expect(sesion.obtenerVault()).toBeNull();
  });
});
