import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_KDF_ITERATIONS, type VaultTimer } from "../src/vault.js";
import {
  VaultCorruptError,
  VaultCorruptMetaError,
  VaultLockedError,
  VaultRecordVersionError,
  VaultUnsupportedKdfError,
  WrongPasswordError,
  openVault,
} from "../src/vault.js";

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

interface Contexto {
  factoria: IDBFactory;
  reloj: RelojManual;
}

function crearContexto(): Contexto {
  return { factoria: new IDBFactory(), reloj: new RelojManual() };
}

async function abrir(contexto: Contexto, password = "contraseña-ficticia") {
  return openVault({
    password,
    dbName: "vault-test",
    indexedDB: contexto.factoria,
    iterations: 1_000,
    inactivityMs: 60_000,
    timer: contexto.reloj,
  });
}

/** Registro cifrado leído en crudo del almacén. */
interface RegistroBruto {
  version: number;
  iv: Uint8Array;
  data: Uint8Array;
}

/** Metadatos leídos en crudo del almacén. */
interface MetaBruta {
  kdf: { algorithm: string; iterations: number; salt: string };
  verifier?: RegistroBruto;
}

/** Lee o escribe en un almacén en crudo, con la sesión del vault cerrada. */
function conAlmacen<T>(
  factoria: IDBFactory,
  dbName: string,
  store: string,
  operacion: (almacen: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const peticion = factoria.open(dbName);
    peticion.onsuccess = () => {
      const db = peticion.result;
      const tx = db.transaction(store, "readwrite");
      const consulta = operacion(tx.objectStore(store));
      consulta.onsuccess = () => resolve(consulta.result);
      consulta.onerror = () => reject(consulta.error);
      tx.oncomplete = () => db.close();
    };
    peticion.onerror = () => reject(peticion.error);
  });
}

async function leerRegistroBruto(
  factoria: IDBFactory,
  id: string,
): Promise<RegistroBruto> {
  return conAlmacen<RegistroBruto>(factoria, "vault-test", "settings", (almacen) =>
    almacen.get(id) as IDBRequest<RegistroBruto>,
  );
}

async function escribirRegistroBruto(
  factoria: IDBFactory,
  id: string,
  registro: RegistroBruto,
): Promise<void> {
  await conAlmacen(factoria, "vault-test", "settings", (almacen) => almacen.put(registro, id));
}

async function leerMetaBruta(factoria: IDBFactory): Promise<MetaBruta> {
  return conAlmacen<MetaBruta>(factoria, "vault-test", "meta", (almacen) =>
    almacen.get("vault") as IDBRequest<MetaBruta>,
  );
}

async function escribirMetaBruta(factoria: IDBFactory, meta: MetaBruta): Promise<void> {
  await conAlmacen(factoria, "vault-test", "meta", (almacen) => almacen.put(meta, "vault"));
}

describe("apertura y colecciones", () => {
  it("guarda y recupera exactamente una ficha y un blob", async () => {
    const contexto = crearContexto();
    const vault = await abrir(contexto);
    const perfil = {
      id: "p-1",
      label: "Perfil de prueba",
      knownTerms: [],
      plainLanguage: false,
    };
    const blob = { name: "factura-prueba.txt", mime: "text/plain", bytesBase64: "SG9sYQ==" };
    await vault.profiles.put(perfil.id, perfil);
    await vault.blobs.put("b-1", blob);
    expect(await vault.profiles.get("p-1")).toEqual(perfil);
    expect(await vault.blobs.get("b-1")).toEqual(blob);
    expect(await vault.profiles.list()).toEqual([perfil]);
    await vault.profiles.delete("p-1");
    expect(await vault.profiles.get("p-1")).toBeUndefined();
    expect(await vault.profiles.list()).toEqual([]);
  });

  it("guarda y recupera documentos y radar tipados", async () => {
    const contexto = crearContexto();
    const vault = await abrir(contexto);
    const documento = {
      id: "d-1",
      profileId: "p-1",
      kind: "factura" as const,
      title: "Factura de prueba",
      addedAt: "2025-01-01T10:00:00.000Z",
      fields: { importe: 42 },
      tags: ["prueba"],
    };
    const radar = {
      id: "r-1",
      profileId: "p-1",
      title: "Aviso de prueba",
      dueDate: "2025-02-01",
      origin: "manual" as const,
      severity: "info" as const,
      status: "pendiente" as const,
      createdAt: "2025-01-01T10:00:00.000Z",
    };
    await vault.documents.put(documento.id, documento);
    await vault.radar.put(radar.id, radar);
    expect(await vault.documents.get("d-1")).toEqual(documento);
    expect(await vault.radar.get("r-1")).toEqual(radar);
  });

  it("lo escrito no se ve en claro en el almacén", async () => {
    const contexto = crearContexto();
    const vault = await abrir(contexto);
    await vault.settings.put("tema", { modo: "claro" });
    const bruto = await new Promise<unknown>((resolve, reject) => {
      const peticion = contexto.factoria.open("vault-test");
      peticion.onsuccess = () => {
        const db = peticion.result;
        const tx = db.transaction("settings", "readonly");
        const consulta = tx.objectStore("settings").getAll();
        consulta.onsuccess = () => resolve(consulta.result);
        consulta.onerror = () => reject(consulta.error);
        tx.oncomplete = () => db.close();
      };
      peticion.onerror = () => reject(peticion.error);
    });
    const texto = JSON.stringify(bruto);
    expect(texto).not.toContain("claro");
  });
});

describe("parámetros de derivación", () => {
  it("persiste los parámetros con el valor por defecto de 600 000 iteraciones", async () => {
    const contexto = crearContexto();
    const vault = await openVault({
      password: "contraseña-ficticia",
      dbName: "vault-test",
      indexedDB: contexto.factoria,
      timer: contexto.reloj,
    });
    const params = vault.kdfParams;
    expect(params.algorithm).toBe("PBKDF2-HMAC-SHA256");
    expect(params.iterations).toBe(DEFAULT_KDF_ITERATIONS);
    expect(params.iterations).toBe(600_000);
    // La sal se guarda en base64 y ocupa 16 bytes.
    expect(atob(params.salt).length).toBe(16);
  });

  it("permite un número de iteraciones inyectable para los tests", async () => {
    const contexto = crearContexto();
    const vault = await abrir(contexto);
    expect(vault.kdfParams.iterations).toBe(1_000);
  });
});

describe("contraseña errónea", () => {
  it("falla con WrongPasswordError sin tocar los datos guardados", async () => {
    const contexto = crearContexto();
    const primera = await abrir(contexto);
    const perfil = { id: "p-1", label: "Perfil de prueba", knownTerms: [], plainLanguage: false };
    await primera.profiles.put(perfil.id, perfil);
    const paramsAntes = { ...primera.kdfParams };
    await primera.lock();
    await expect(abrir(contexto, "otra-contraseña")).rejects.toThrow(WrongPasswordError);
    const segunda = await abrir(contexto);
    expect(await segunda.profiles.get("p-1")).toEqual(perfil);
    expect(segunda.kdfParams).toEqual(paramsAntes);
  });
});

describe("bloqueo", () => {
  it("lock cierra la sesión y exige la contraseña otra vez", async () => {
    const contexto = crearContexto();
    const vault = await abrir(contexto);
    await vault.settings.put("tema", { modo: "claro" });
    vault.lock();
    expect(vault.locked).toBe(true);
    await expect(vault.settings.get("tema")).rejects.toThrow(VaultLockedError);
    const reabierta = await abrir(contexto);
    expect(await reabierta.settings.get("tema")).toEqual({ modo: "claro" });
  });

  it("bloquea por inactividad de forma determinista con reloj inyectado", async () => {
    const contexto = crearContexto();
    const bloqueado = vi.fn();
    const vault = await openVault({
      password: "contraseña-ficticia",
      dbName: "vault-test",
      indexedDB: contexto.factoria,
      iterations: 1_000,
      inactivityMs: 60_000,
      timer: contexto.reloj,
      onLock: bloqueado,
    });
    expect(contexto.reloj.pendiente?.ms).toBe(60_000);
    contexto.reloj.disparar();
    expect(vault.locked).toBe(true);
    expect(bloqueado).toHaveBeenCalledTimes(1);
    await expect(vault.settings.list()).rejects.toThrow(VaultLockedError);
  });

  it("touch y las operaciones reprograman el bloqueo", async () => {
    const contexto = crearContexto();
    const vault = await abrir(contexto);
    const primera = contexto.reloj.pendiente;
    vault.touch();
    expect(contexto.reloj.pendiente).not.toBe(primera);
    await vault.settings.put("tema", { modo: "claro" });
    expect(contexto.reloj.pendiente?.ms).toBe(60_000);
  });

  it("una lectura reprograma el bloqueo y mantiene la sesión abierta", async () => {
    const contexto = crearContexto();
    const vault = await abrir(contexto);
    await vault.settings.put("tema", { modo: "claro" });
    const antes = contexto.reloj.pendiente;
    expect(await vault.settings.get("tema")).toEqual({ modo: "claro" });
    expect(contexto.reloj.pendiente).not.toBe(antes);
    expect(vault.locked).toBe(false);
  });

  it("intercambiar dos registros del almacén no atribuye datos al id equivocado", async () => {
    const contexto = crearContexto();
    const vault = await abrir(contexto);
    await vault.settings.put("a-1", { dato: "A" });
    await vault.settings.put("b-1", { dato: "B" });
    vault.lock();
    const registroA = await leerRegistroBruto(contexto.factoria, "a-1");
    const registroB = await leerRegistroBruto(contexto.factoria, "b-1");
    await escribirRegistroBruto(contexto.factoria, "a-1", registroB);
    await escribirRegistroBruto(contexto.factoria, "b-1", registroA);
    const reabierta = await abrir(contexto);
    await expect(reabierta.settings.get("a-1")).rejects.toThrow(VaultCorruptError);
    await expect(reabierta.settings.get("b-1")).rejects.toThrow(VaultCorruptError);
  });

  it("rechaza una versión de registro no compatible", async () => {
    const contexto = crearContexto();
    const vault = await abrir(contexto);
    await vault.settings.put("a-1", { dato: "A" });
    vault.lock();
    const registro = await leerRegistroBruto(contexto.factoria, "a-1");
    registro.version = 99;
    await escribirRegistroBruto(contexto.factoria, "a-1", registro);
    const reabierta = await abrir(contexto);
    await expect(reabierta.settings.get("a-1")).rejects.toThrow(VaultRecordVersionError);
  });

  it("rechaza parámetros de derivación no compatibles antes de derivar", async () => {
    const contexto = crearContexto();
    const vault = await abrir(contexto);
    await vault.settings.put("tema", { modo: "claro" });
    vault.lock();
    const meta = await leerMetaBruta(contexto.factoria);
    meta.kdf = { ...meta.kdf, algorithm: "PBKDF2-HMAC-SHA512" };
    await escribirMetaBruta(contexto.factoria, meta);
    await expect(abrir(contexto)).rejects.toThrow(VaultUnsupportedKdfError);
  });

  it("rechaza metadatos corruptos sin confundirlos con contraseña errónea", async () => {
    const contexto = crearContexto();
    const vault = await abrir(contexto);
    await vault.settings.put("tema", { modo: "claro" });
    vault.lock();
    const meta = await leerMetaBruta(contexto.factoria);
    const { verifier: _verifier, kdf } = meta;
    await escribirMetaBruta(contexto.factoria, { kdf });
    await expect(abrir(contexto)).rejects.toThrow(VaultCorruptMetaError);
  });
});
