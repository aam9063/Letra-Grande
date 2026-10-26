/**
 * Tests de copia de seguridad: exportación a un único archivo cifrado,
 * importación atómica con validación previa y purga total.
 *
 * Todos los datos de este fichero son ficticios: nombres inventados, importes
 * de ejemplo y sin ningún dato personal real.
 */
import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import { DATA_STORES } from "../src/db.js";
import { DEFAULT_KDF_ITERATIONS } from "../src/crypto.js";
import {
  EXPORT_FORMAT_VERSION,
  EXPORT_MAX_ITERATIONS,
  VaultCorruptExportError,
  VaultError,
  VaultLockedError,
  VaultNotEmptyError,
  VaultStaleSessionError,
  VaultUnsupportedExportError,
  VaultUnsupportedKdfError,
  WrongPasswordError,
  importVault,
  openVault,
  type BlobRecord,
  type DocumentRecord,
  type ProfileRecord,
  type RadarRecord,
  type SettingValue,
  type Vault,
} from "../src/index.js";

const CONTRASENA = "contraseña-ficticia";

class RelojNulo {
  schedule(): unknown {
    return undefined;
  }
  cancel(): void {}
}

interface Contexto {
  factoria: IDBFactory;
}

function crearContexto(): Contexto {
  return { factoria: new IDBFactory() };
}

function abrir(contexto: Contexto, dbName = "vault-test", password = CONTRASENA): Promise<Vault> {
  return openVault({
    password,
    dbName,
    indexedDB: contexto.factoria,
    iterations: 1_000,
    inactivityMs: 60_000,
    timer: new RelojNulo(),
  });
}

/** Contenido ficticio que cubre las cinco colecciones. */
function contenidoFicticio(): {
  perfil: ProfileRecord;
  documento: DocumentRecord;
  blob: BlobRecord;
  radar: RadarRecord;
  ajustes: Array<[string, SettingValue]>;
} {
  return {
    perfil: {
      id: "p-1",
      label: "Perfil de Mengano Prueba",
      knownTerms: [],
      plainLanguage: false,
    },
    documento: {
      id: "d-1",
      profileId: "p-1",
      kind: "factura",
      title: "Factura ficticia de la luz",
      addedAt: "2025-01-01T10:00:00.000Z",
      fields: { importe: 42 },
      tags: ["prueba"],
    },
    blob: {
      name: "factura-ficticia.txt",
      mime: "text/plain",
      bytesBase64: "SG9sYSwgZXN0byBlcyBmdWN0aWNpby4=",
    },
    radar: {
      id: "r-1",
      profileId: "p-1",
      title: "Aviso ficticio de revisión",
      dueDate: "2025-02-01",
      origin: "manual",
      severity: "info",
      status: "pendiente",
      createdAt: "2025-01-01T10:00:00.000Z",
    },
    ajustes: [
      ["tema", { modo: "claro" }],
      ["idioma", "es"],
    ],
  };
}

async function poblar(
  vault: Vault,
  contenido: ReturnType<typeof contenidoFicticio>,
): Promise<void> {
  await vault.profiles.put(contenido.perfil.id, contenido.perfil);
  await vault.documents.put(contenido.documento.id, contenido.documento);
  await vault.blobs.put("b-1", contenido.blob);
  await vault.radar.put(contenido.radar.id, contenido.radar);
  for (const [id, valor] of contenido.ajustes) {
    await vault.settings.put(id, valor);
  }
}

/** Lee el número de registros en crudo de cada almacén, incluida la meta. */
async function recuentosBrutos(contexto: Contexto, dbName = "vault-test"): Promise<Record<string, number>> {
  return new Promise((resolve, reject) => {
    const peticion = contexto.factoria.open(dbName);
    peticion.onsuccess = () => {
      const db = peticion.result;
      const resultado: Record<string, number> = {};
      const almacenes = [...DATA_STORES, "meta"];
      const tx = db.transaction(almacenes, "readonly");
      for (const store of almacenes) {
        const consulta = tx.objectStore(store).count();
        consulta.onsuccess = () => {
          resultado[store] = consulta.result;
        };
        consulta.onerror = () => reject(consulta.error);
      }
      tx.oncomplete = () => {
        db.close();
        resolve(resultado);
      };
      tx.onerror = () => reject(tx.error);
    };
    peticion.onerror = () => reject(peticion.error);
  });
}

/** Metadatos leídos en crudo del almacén. */
interface MetaBruta {
  kdf: { algorithm: string; iterations: number; salt: string };
  verifier?: unknown;
  epoch?: number;
}

async function leerMetaBruta(contexto: Contexto, dbName = "vault-test"): Promise<MetaBruta> {
  return new Promise((resolve, reject) => {
    const peticion = contexto.factoria.open(dbName);
    peticion.onsuccess = () => {
      const db = peticion.result;
      const tx = db.transaction("meta", "readonly");
      const consulta = tx.objectStore("meta").get("vault") as IDBRequest<MetaBruta>;
      consulta.onsuccess = () => {
        db.close();
        resolve(consulta.result);
      };
      consulta.onerror = () => reject(consulta.error);
    };
    peticion.onerror = () => reject(peticion.error);
  });
}

async function escribirMetaBruta(contexto: Contexto, meta: MetaBruta): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const peticion = contexto.factoria.open("vault-test");
    peticion.onsuccess = () => {
      const db = peticion.result;
      const tx = db.transaction("meta", "readwrite");
      const consulta = tx.objectStore("meta").put(meta, "vault");
      consulta.onsuccess = () => undefined;
      consulta.onerror = () => reject(consulta.error);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    };
    peticion.onerror = () => reject(peticion.error);
  });
}

/** Comprueba que el vault contiene exactamente el contenido esperado. */
async function esperarContenido(vault: Vault, contenido: ReturnType<typeof contenidoFicticio>): Promise<void> {
  const perfiles = await vault.profiles.list();
  expect(perfiles.errors).toEqual([]);
  expect(perfiles.values).toEqual([contenido.perfil]);
  const documentos = await vault.documents.list();
  expect(documentos.errors).toEqual([]);
  expect(documentos.values).toEqual([contenido.documento]);
  const blobs = await vault.blobs.list();
  expect(blobs.errors).toEqual([]);
  expect(blobs.values).toEqual([contenido.blob]);
  const radar = await vault.radar.list();
  expect(radar.errors).toEqual([]);
  expect(radar.values).toEqual([contenido.radar]);
  const ajustes = await vault.settings.list();
  expect(ajustes.errors).toEqual([]);
  for (const [id, valor] of contenido.ajustes) {
    expect(await vault.settings.get(id)).toEqual(valor);
  }
  expect(ajustes.values).toHaveLength(contenido.ajustes.length);
}

describe("exportación e importación: ida y vuelta completa", () => {
  it("exportar, purgar e importar devuelve exactamente el mismo contenido", async () => {
    const contexto = crearContexto();
    const vault = await abrir(contexto);
    const contenido = contenidoFicticio();
    await poblar(vault, contenido);
    const artefacto = await vault.exportBackup(CONTRASENA);
    expect(artefacto).toBeInstanceOf(Uint8Array);

    await vault.purge();
    vault.lock();

    await importVault(artefacto, CONTRASENA, {
      dbName: "vault-test",
      indexedDB: contexto.factoria,
      iterations: 1_000,
    });
    const restaurada = await abrir(contexto);
    await esperarContenido(restaurada, contenido);
  });

  it("el archivo exportado no contiene ningún dato legible", async () => {
    const contexto = crearContexto();
    const vault = await abrir(contexto);
    await poblar(vault, contenidoFicticio());
    const artefacto = await vault.exportBackup(CONTRASENA);

    const latin1 = Array.from(artefacto, (byte) => String.fromCharCode(byte)).join("");
    const utf8 = new TextDecoder().decode(artefacto);
    const terminosProhibidos = [
      "Mengano",
      "factura-ficticia",
      "Factura ficticia",
      "profiles",
      "documents",
      "radar",
      "settings",
      "p-1",
      "importe",
    ];
    for (const termino of terminosProhibidos) {
      expect(latin1).not.toContain(termino);
      expect(utf8).not.toContain(termino);
    }
  });
});

describe("importación con validación previa", () => {
  it("un archivo corrupto falla sin tocar el almacén existente", async () => {
    const contexto = crearContexto();
    const vault = await abrir(contexto);
    const contenido = contenidoFicticio();
    await poblar(vault, contenido);
    const artefacto = await vault.exportBackup(CONTRASENA);

    const corrupto = artefacto.slice();
    const ultimo = corrupto.length - 1;
    corrupto[ultimo] = (corrupto[ultimo] ?? 0) ^ 0xff;

    await expect(
      importVault(corrupto, CONTRASENA, {
        dbName: "vault-test",
        indexedDB: contexto.factoria,
        iterations: 1_000,
      }),
    ).rejects.toThrow(VaultError);

    vault.lock();
    const intacta = await abrir(contexto);
    await esperarContenido(intacta, contenido);
  });

  it("una contraseña incorrecta falla con WrongPasswordError sin tocar el almacén", async () => {
    const contexto = crearContexto();
    const vault = await abrir(contexto);
    const contenido = contenidoFicticio();
    await poblar(vault, contenido);
    const artefacto = await vault.exportBackup(CONTRASENA);

    await expect(
      importVault(artefacto, "otra-contraseña", {
        dbName: "vault-test",
        indexedDB: contexto.factoria,
        iterations: 1_000,
      }),
    ).rejects.toThrow(WrongPasswordError);

    vault.lock();
    const intacta = await abrir(contexto);
    await esperarContenido(intacta, contenido);
  });

  it("una versión de formato no soportada falla antes de escribir nada", async () => {
    const contexto = crearContexto();
    const vault = await abrir(contexto);
    const contenido = contenidoFicticio();
    await poblar(vault, contenido);
    const artefacto = await vault.exportBackup(CONTRASENA);

    const futuro = artefacto.slice();
    new DataView(futuro.buffer, futuro.byteOffset, futuro.byteLength).setUint32(4, EXPORT_FORMAT_VERSION + 1);

    await expect(
      importVault(futuro, CONTRASENA, {
        dbName: "vault-test",
        indexedDB: contexto.factoria,
        iterations: 1_000,
      }),
    ).rejects.toThrow(VaultUnsupportedExportError);

    vault.lock();
    const intacta = await abrir(contexto);
    await esperarContenido(intacta, contenido);
  });

  it("un archivo que no es una copia falla con VaultCorruptExportError", async () => {
    const contexto = crearContexto();
    await abrir(contexto).then((vault) => vault.lock());
    const basura = new TextEncoder().encode("esto no es una copia del vault");
    await expect(
      importVault(basura, CONTRASENA, {
        dbName: "vault-test",
        indexedDB: contexto.factoria,
        iterations: 1_000,
      }),
    ).rejects.toThrow(VaultCorruptExportError);
  });

  it("un archivo truncado falla con VaultCorruptExportError", async () => {
    const contexto = crearContexto();
    const vault = await abrir(contexto);
    await poblar(vault, contenidoFicticio());
    const artefacto = await vault.exportBackup(CONTRASENA);
    vault.lock();

    const truncado = artefacto.slice(0, 20);
    await expect(
      importVault(truncado, CONTRASENA, {
        dbName: "vault-test",
        indexedDB: contexto.factoria,
        iterations: 1_000,
      }),
    ).rejects.toThrow(VaultCorruptExportError);
  });

  it("importar sobre un almacén con contenido se rechaza salvo confirmación explícita", async () => {
    const contexto = crearContexto();
    const origen = await abrir(contexto, "vault-origen");
    const contenidoOrigen = contenidoFicticio();
    await poblar(origen, contenidoOrigen);
    const artefacto = await origen.exportBackup(CONTRASENA);
    origen.lock();

    const destino = await abrir(contexto, "vault-test");
    await destino.settings.put("previo", { dato: "contenido previo" });

    await expect(
      importVault(artefacto, CONTRASENA, {
        dbName: "vault-test",
        indexedDB: contexto.factoria,
        iterations: 1_000,
      }),
    ).rejects.toThrow(VaultNotEmptyError);

    // Sin confirmación, el contenido previo sigue intacto.
    destino.lock();
    const intacta = await abrir(contexto, "vault-test");
    expect(await intacta.settings.get("previo")).toEqual({ dato: "contenido previo" });
    intacta.lock();

    await importVault(artefacto, CONTRASENA, {
      dbName: "vault-test",
      indexedDB: contexto.factoria,
      iterations: 1_000,
      replace: true,
    });
    const reemplazada = await abrir(contexto, "vault-test");
    await esperarContenido(reemplazada, contenidoOrigen);
    expect(await reemplazada.settings.get("previo")).toBeUndefined();
  });

  it("importar en un almacén sin registros no necesita confirmación", async () => {
    const contexto = crearContexto();
    const origen = await abrir(contexto, "vault-origen");
    const contenidoOrigen = contenidoFicticio();
    await poblar(origen, contenidoOrigen);
    const artefacto = await origen.exportBackup(CONTRASENA);
    origen.lock();

    // Solo abrir y cerrar crea la meta pero no deja registros: se permite importar.
    const destino = await abrir(contexto, "vault-test");
    destino.lock();

    await importVault(artefacto, CONTRASENA, {
      dbName: "vault-test",
      indexedDB: contexto.factoria,
      iterations: 1_000,
    });
    const restaurada = await abrir(contexto, "vault-test");
    await esperarContenido(restaurada, contenidoOrigen);
  });

  it("manipular un byte de la sal de la cabecera invalida la copia", async () => {
    const contexto = crearContexto();
    const vault = await abrir(contexto);
    await poblar(vault, contenidoFicticio());
    const artefacto = await vault.exportBackup(CONTRASENA);
    vault.lock();

    // La sal empieza tras magic, versión, longitud, algoritmo e iteraciones.
    const manipulada = artefacto.slice();
    manipulada[32] = (manipulada[32] ?? 0) ^ 0xff;
    await expect(
      importVault(manipulada, CONTRASENA, {
        dbName: "vault-test",
        indexedDB: contexto.factoria,
        iterations: 1_000,
      }),
    ).rejects.toThrow(WrongPasswordError);
  });

  it("manipular el número de iteraciones de la cabecera invalida la copia", async () => {
    const contexto = crearContexto();
    const vault = await abrir(contexto);
    await poblar(vault, contenidoFicticio());
    const artefacto = await vault.exportBackup(CONTRASENA);
    vault.lock();

    const manipulada = artefacto.slice();
    new DataView(manipulada.buffer, manipulada.byteOffset, manipulada.byteLength).setUint32(28, 1_001);
    await expect(
      importVault(manipulada, CONTRASENA, {
        dbName: "vault-test",
        indexedDB: contexto.factoria,
        iterations: 1_000,
      }),
    ).rejects.toThrow(WrongPasswordError);
  });

  it("una copia con iteraciones por encima del límite se rechaza antes de derivar", async () => {
    const contexto = crearContexto();
    const vault = await abrir(contexto);
    await poblar(vault, contenidoFicticio());
    const artefacto = await vault.exportBackup(CONTRASENA);
    vault.lock();

    const manipulada = artefacto.slice();
    new DataView(manipulada.buffer, manipulada.byteOffset, manipulada.byteLength).setUint32(
      28,
      EXPORT_MAX_ITERATIONS + 1,
    );
    await expect(
      importVault(manipulada, CONTRASENA, {
        dbName: "vault-test",
        indexedDB: contexto.factoria,
        iterations: 1_000,
      }),
    ).rejects.toThrow(VaultUnsupportedKdfError);
  });

  it("exportar con la sesión bloqueada falla con VaultLockedError", async () => {
    const contexto = crearContexto();
    const vault = await abrir(contexto);
    vault.lock();
    await expect(vault.exportBackup(CONTRASENA)).rejects.toThrow(VaultLockedError);
  });

  it("la copia lleva la versión de formato y las iteraciones del vault en la cabecera", async () => {
    const contexto = crearContexto();
    const vault = await abrir(contexto);
    await poblar(vault, contenidoFicticio());
    const artefacto = await vault.exportBackup(CONTRASENA);
    const vista = new DataView(artefacto.buffer, artefacto.byteOffset, artefacto.byteLength);
    expect(vista.getUint32(4)).toBe(EXPORT_FORMAT_VERSION);
    expect(vista.getUint32(4 + 4 + 2 + 18)).toBe(1_000);
    expect(DEFAULT_KDF_ITERATIONS).toBe(600_000);
  });
});

describe("purga total", () => {
  it("purgar deja cero registros de datos y la época incrementada en meta", async () => {
    const contexto = crearContexto();
    const vault = await abrir(contexto);
    await poblar(vault, contenidoFicticio());

    await vault.purge();
    expect(vault.locked).toBe(true);

    const recuentos = await recuentosBrutos(contexto);
    for (const store of DATA_STORES) {
      expect(recuentos[store]).toBe(0);
    }
    expect(recuentos.meta).toBe(1);
    const meta = await leerMetaBruta(contexto);
    expect(meta.epoch).toBe(1);

    // Tras purgar, reabrir con la misma contraseña sigue funcionando: vacío.
    const reabierta = await abrir(contexto);
    for (const coleccion of [reabierta.profiles, reabierta.documents, reabierta.blobs, reabierta.radar]) {
      const resultado = await coleccion.list();
      expect(resultado.values).toEqual([]);
      expect(resultado.errors).toEqual([]);
    }
    const ajustes = await reabierta.settings.list();
    expect(ajustes.values).toEqual([]);
    expect(ajustes.errors).toEqual([]);
  });

  it("purgar un vault vacío también funciona", async () => {
    const contexto = crearContexto();
    const vault = await abrir(contexto);
    await vault.purge();
    expect(vault.locked).toBe(true);
    const recuentos = await recuentosBrutos(contexto);
    for (const store of DATA_STORES) {
      expect(recuentos[store]).toBe(0);
    }
  });

  it("un purge de una sesión bloquea la otra sesión viva de la misma base", async () => {
    const contexto = crearContexto();
    const primera = await abrir(contexto);
    const segunda = await abrir(contexto);
    await primera.settings.put("tema", { modo: "claro" });

    await primera.purge();

    expect(primera.locked).toBe(true);
    expect(segunda.locked).toBe(true);
    await expect(segunda.settings.put("resucitado", { dato: 1 })).rejects.toThrow(VaultLockedError);
  });
});

describe("sesiones obsoletas tras importar", () => {
  it("un import con replace bloquea al instante las sesiones vivas de la base", async () => {
    const contexto = crearContexto();
    const origen = await abrir(contexto, "vault-origen");
    const contenidoOrigen = contenidoFicticio();
    await poblar(origen, contenidoOrigen);
    const artefacto = await origen.exportBackup(CONTRASENA);
    origen.lock();

    const vieja = await abrir(contexto, "vault-test");
    await vieja.settings.put("previo", { dato: "viejo" });
    const otra = await abrir(contexto, "vault-test");

    await importVault(artefacto, CONTRASENA, {
      dbName: "vault-test",
      indexedDB: contexto.factoria,
      iterations: 1_000,
      replace: true,
    });

    // Las sesiones vivas de la base quedan bloqueadas: ya no pueden escribir
    // con la clave vieja encima de los datos recifrados.
    expect(vieja.locked).toBe(true);
    expect(otra.locked).toBe(true);
    await expect(vieja.settings.put("nuevo", { dato: "nuevo" })).rejects.toThrow(VaultLockedError);
    vieja.lock();
    otra.lock();

    const reabierta = await abrir(contexto, "vault-test");
    await esperarContenido(reabierta, contenidoOrigen);
    const meta = await leerMetaBruta(contexto);
    expect(meta.epoch).toBe(1);
  });

  it("una sesión con la época desfasada se niega a operar aunque siga abierta", async () => {
    const contexto = crearContexto();
    const vault = await abrir(contexto);
    await vault.settings.put("tema", { modo: "claro" });

    // Simula un import o una purga desde otra pestaña: la época de meta
    // avanza sin que esta sesión quede bloqueada en este proceso.
    const meta = await leerMetaBruta(contexto);
    await escribirMetaBruta(contexto, { ...meta, epoch: (meta.epoch ?? 0) + 1 });

    await expect(vault.settings.put("nuevo", { dato: 1 })).rejects.toThrow(VaultStaleSessionError);
    await expect(vault.settings.get("tema")).rejects.toThrow(VaultStaleSessionError);
    await expect(vault.settings.list()).rejects.toThrow(VaultStaleSessionError);
    expect(vault.locked).toBe(false);

    // Reabrir con la contraseña restaura una sesión válida.
    vault.lock();
    const reabierta = await abrir(contexto);
    expect(await reabierta.settings.get("tema")).toEqual({ modo: "claro" });
  });
});
