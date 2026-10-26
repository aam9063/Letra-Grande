/**
 * Copia de seguridad: exportación a un único artefacto cifrado e importación
 * atómica con validación previa.
 *
 * Formato del contenedor (binario, todo en claro excepto el último bloque):
 *   4 bytes   magic "LGVX": identifica el tipo de archivo
 *   4 bytes   versión del formato de exportación (uint32, big endian)
 *   2 bytes   longitud del identificador del algoritmo de derivación
 *   n bytes   identificador del algoritmo (por ejemplo PBKDF2-HMAC-SHA256)
 *   4 bytes   iteraciones PBKDF2 (uint32, big endian)
 *   16 bytes  sal de derivación de la clave de copia
 *   12 bytes  IV del cifrado AES-256-GCM
 *   resto     carga útil cifrada (JSON con las cinco colecciones)
 *
 * En claro solo viajan datos técnicos del cifrado (magic, versión, algoritmo,
 * iteraciones y sal): ni nombres de colecciones, ni identificadores, ni
 * recuentos, ni ningún dato personal. Toda la carga útil va cifrada con
 * AES-256-GCM y la cabecera completa se autentica como additionalData, de
 * forma que cualquier manipulación del contenedor invalida el descifrado.
 */
import {
  KDF_ALGORITHM,
  VERIFIER_ID,
  VERIFIER_PLAINTEXT,
  crearKdfParams,
  deriveVaultKey,
  encryptRecord,
  randomBytes,
  type KdfParams,
  type VaultBytes,
} from "./crypto.js";
import {
  DATA_STORES,
  META_STORE,
  openVaultDatabase,
  readMeta,
  requestToPromise,
  transactionDone,
  type DataStore,
  type VaultMeta,
} from "./db.js";
import {
  VaultCorruptExportError,
  VaultNotEmptyError,
  VaultUnsupportedExportError,
  VaultError,
  VaultUnsupportedKdfError,
  WrongPasswordError,
} from "./errors.js";
import { lockAllSessions } from "./sessions.js";
import { decodeBase64, decodeJson, encodeJson, type JsonValue } from "./serialize.js";

/** Secuencia que identifica un archivo de copia de Letra Grande. */
export const EXPORT_MAGIC = "LGVX";

/** Versión del formato de exportación. Cualquier otra se rechaza al importar. */
export const EXPORT_FORMAT_VERSION = 1;

/** Versión de la estructura de la carga útil descifrada. */
export const EXPORT_PAYLOAD_VERSION = 1;

/**
 * Límite superior de iteraciones PBKDF2 que se acepta en una copia: por
 * encima de aquí, un archivo manipulado podría pedir miles de millones de
 * iteraciones y congelar la pestaña antes de fallar.
 */
export const EXPORT_MAX_ITERATIONS = 10_000_000;

const LONGITUD_MAGIC = 4;
const LONGITUD_CABECERA_FIJA = LONGITUD_MAGIC + 4 + 2 + 4;
const LONGITUD_SALT = 16;
const LONGITUD_IV = 12;

/** Carga útil descifrada del artefacto: las cinco colecciones con sus ids. */
export interface ExportPayload {
  version: number;
  colecciones: Record<DataStore, Record<string, JsonValue>>;
}

export interface ImportVaultOptions {
  dbName?: string;
  /** Factoría IndexedDB inyectable (por defecto, la global). */
  indexedDB?: IDBFactory;
  /** Iteraciones PBKDF2 para los metadatos nuevos. Por defecto 600 000. */
  iterations?: number;
  /**
   * Reemplazo explícito de un almacén con contenido. Por defecto la
   * importación se niega si el almacén ya tiene algún registro: sobrescribir
   * datos personales nunca debe ser silencioso.
   */
  replace?: boolean;
}

/** Construye el bloque de cabecera en claro que se autentica con GCM. */
function cabecera(version: number, params: { algorithm: string; iterations: number; salt: Uint8Array }): VaultBytes {
  const algoritmo = new TextEncoder().encode(params.algorithm);
  if (algoritmo.length > 0xffff) {
    throw new VaultCorruptExportError();
  }
  const total = LONGITUD_CABECERA_FIJA + algoritmo.length + params.salt.length;
  const buffer = new ArrayBuffer(total);
  const vista = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  vista.setUint8(0, 0x4c); // L
  vista.setUint8(1, 0x47); // G
  vista.setUint8(2, 0x56); // V
  vista.setUint8(3, 0x58); // X
  vista.setUint32(4, version);
  vista.setUint16(8, algoritmo.length);
  bytes.set(algoritmo, 10);
  vista.setUint32(10 + algoritmo.length, params.iterations);
  const inicioSalt = 14 + algoritmo.length;
  bytes.set(params.salt, inicioSalt);
  return bytes;
}

/** Codifica bytes como Uint8Array respaldado por ArrayBuffer propio. */
function bytesPropios(datos: Uint8Array): Uint8Array<ArrayBuffer> {
  const copia = new Uint8Array(new ArrayBuffer(datos.length));
  copia.set(datos);
  return copia;
}

/** Une la cabecera, el IV y el texto cifrado en un único artefacto. */
function unirArtefacto(cab: Uint8Array, iv: Uint8Array, datos: Uint8Array): Uint8Array<ArrayBuffer> {
  const total = cab.length + iv.length + datos.length;
  const artefacto = new Uint8Array(new ArrayBuffer(total));
  artefacto.set(cab, 0);
  artefacto.set(iv, cab.length);
  artefacto.set(datos, cab.length + iv.length);
  return artefacto;
}

/**
 * Cifra la carga útil con una clave derivada de la contraseña y una sal nueva,
 * y devuelve el artefacto completo listo para guardar o descargar.
 */
export async function createExportArtifact(
  payload: ExportPayload,
  password: string,
  iterations: number,
): Promise<Uint8Array<ArrayBuffer>> {
  const salt = randomBytes(LONGITUD_SALT);
  const key = await deriveVaultKey(password, { iterations, salt });
  const iv = randomBytes(LONGITUD_IV);
  const cab = cabecera(EXPORT_FORMAT_VERSION, { algorithm: KDF_ALGORITHM, iterations, salt });
  const datos = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: cab },
    key,
    encodeJson(payload as unknown as JsonValue),
  );
  return unirArtefacto(cab, iv, new Uint8Array(datos));
}

/** Parseo estricto del contenedor: cualquier desviación es un archivo corrupto. */
interface ContenedorParseado {
  version: number;
  params: { algorithm: string; iterations: number; salt: Uint8Array<ArrayBuffer> };
  iv: Uint8Array<ArrayBuffer>;
  datos: Uint8Array<ArrayBuffer>;
  cabecera: Uint8Array<ArrayBuffer>;
}

function parseContainer(artefacto: Uint8Array): ContenedorParseado {
  const magic = new TextDecoder().decode(artefacto.slice(0, Math.min(LONGITUD_MAGIC, artefacto.length)));
  if (artefacto.length < LONGITUD_CABECERA_FIJA || magic !== EXPORT_MAGIC) {
    throw new VaultCorruptExportError();
  }
  const vista = new DataView(artefacto.buffer, artefacto.byteOffset, artefacto.byteLength);
  const version = vista.getUint32(4);
  if (version !== EXPORT_FORMAT_VERSION) {
    throw new VaultUnsupportedExportError();
  }
  const longitudAlgoritmo = vista.getUint16(8);
  const inicioAlgoritmo = 10;
  const inicioIteraciones = inicioAlgoritmo + longitudAlgoritmo;
  const inicioSalt = inicioIteraciones + 4;
  const inicioIv = inicioSalt + LONGITUD_SALT;
  const inicioDatos = inicioIv + LONGITUD_IV;
  if (inicioDatos > artefacto.length) {
    throw new VaultCorruptExportError();
  }
  const algorithm = new TextDecoder().decode(artefacto.slice(inicioAlgoritmo, inicioIteraciones));
  const iterations = vista.getUint32(inicioIteraciones);
  if (algorithm !== KDF_ALGORITHM) {
    throw new VaultUnsupportedExportError();
  }
  if (!Number.isInteger(iterations) || iterations <= 0 || iterations > EXPORT_MAX_ITERATIONS) {
    throw new VaultUnsupportedKdfError();
  }
  return {
    version,
    params: {
      algorithm,
      iterations,
      salt: bytesPropios(artefacto.slice(inicioSalt, inicioSalt + LONGITUD_SALT)),
    },
    iv: bytesPropios(artefacto.slice(inicioIv, inicioDatos)),
    datos: bytesPropios(artefacto.slice(inicioDatos)),
    cabecera: bytesPropios(artefacto.slice(0, inicioIv)),
  };
}

/** Validación estructural de la carga útil descifrada: cinco colecciones. */
function validarPayload(payload: JsonValue): ExportPayload {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new VaultCorruptExportError();
  }
  const { version, colecciones } = payload as { version?: JsonValue; colecciones?: JsonValue };
  if (version !== EXPORT_PAYLOAD_VERSION) {
    throw new VaultUnsupportedExportError();
  }
  if (typeof colecciones !== "object" || colecciones === null || Array.isArray(colecciones)) {
    throw new VaultCorruptExportError();
  }
  const resultado = {} as Record<DataStore, Record<string, JsonValue>>;
  for (const store of DATA_STORES) {
    const coleccion = (colecciones as Record<string, JsonValue>)[store];
    if (typeof coleccion !== "object" || coleccion === null || Array.isArray(coleccion)) {
      throw new VaultCorruptExportError();
    }
    resultado[store] = coleccion as Record<string, JsonValue>;
  }
  // Nada fuera de las cinco colecciones conocidas: la copia no puede
  // introducir colecciones desconocidas.
  const claves = Object.keys(colecciones as Record<string, JsonValue>).sort();
  if (claves.length !== DATA_STORES.length || claves.some((clave) => !(DATA_STORES as readonly string[]).includes(clave))) {
    throw new VaultCorruptExportError();
  }
  return { version: version as number, colecciones: resultado };
}

/** Cuenta los registros en crudo de las cinco colecciones de datos. */
async function contarRegistros(db: IDBDatabase): Promise<number> {
  const tx = db.transaction([...DATA_STORES], "readonly");
  const cuentas = DATA_STORES.map((store) => requestToPromise(tx.objectStore(store).count()));
  const totales = await Promise.all(cuentas);
  return totales.reduce((suma, total) => suma + total, 0);
}

/**
 * Importa una copia cifrada al almacén indicado.
 *
 * Semántica sobre un almacén existente: si ya hay algún registro en las cinco
 * colecciones, la importación se rechaza con VaultNotEmptyError salvo que se
 * pase `replace: true`. Con replace (o con un almacén sin registros) la copia
 * reinicia los metadatos con la contraseña de la importación y re cifra cada
 * registro, de forma que el almacén queda coherente al terminar.
 *
 * Atomicidad: primero se valida y descifra todo el artefacto y se cifran en
 * memoria los registros nuevos; solo después se escribe, dentro de una única
 * transacción de IndexedDB que borra las colecciones, escribe los metadatos y
 * inserta los registros. Si cualquier paso falla, la transacción se aborta y
 * el almacén anterior queda intacto.
 */
export async function importVault(
  artefacto: Uint8Array,
  password: string,
  options: ImportVaultOptions = {},
): Promise<void> {
  const dbName = options.dbName ?? "letra-grande-vault";
  const factory = options.indexedDB ?? globalThis.indexedDB;
  const iterations = options.iterations ?? 600_000;

  // Fase 1: validar el artefacto completo antes de abrir siquiera el almacén.
  const contenedor = parseContainer(artefacto);
  const key = await deriveVaultKey(password, {
    iterations: contenedor.params.iterations,
    salt: contenedor.params.salt,
  });
  let payload: ExportPayload;
  try {
    const plano = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: contenedor.iv, additionalData: contenedor.cabecera },
      key,
      contenedor.datos,
    );
    payload = validarPayload(decodeJson(new Uint8Array(plano)));
  } catch (error) {
    if (error instanceof VaultError) {
      throw error;
    }
    // GCM no distingue contraseña incorrecta de texto cifrado manipulado.
    throw new WrongPasswordError();
  }

  const db = await openVaultDatabase(factory, dbName);
  try {
    // Fase 2: comprobar el estado del almacén sin escribir nada.
    const conContenido = (await contarRegistros(db)) > 0;
    if (conContenido && options.replace !== true) {
      throw new VaultNotEmptyError();
    }

    // Fase 3: cifrar en memoria todo lo que se va a escribir.
    const params: KdfParams = crearKdfParams(iterations);
    const keyNueva = await deriveVaultKey(password, {
      iterations: params.iterations,
      salt: decodeBase64(params.salt),
    });
    const registros = new Map<DataStore, Array<[string, Awaited<ReturnType<typeof encryptRecord>>]>>();
    for (const store of DATA_STORES) {
      const pares: Array<[string, Awaited<ReturnType<typeof encryptRecord>>]> = [];
      for (const [id, valor] of Object.entries(payload.colecciones[store])) {
        pares.push([id, await encryptRecord(keyNueva, id, valor)]);
      }
      registros.set(store, pares);
    }
    const verifier = await encryptRecord(keyNueva, VERIFIER_ID, VERIFIER_PLAINTEXT);
    const metaAnterior = await readMeta(db);
    const epochPrevia =
      metaAnterior === undefined || typeof metaAnterior.epoch !== "number" ? 0 : metaAnterior.epoch;
    const metaNueva: VaultMeta = { kdf: params, verifier, epoch: epochPrevia + 1 };

    // Fase 4: una única transacción atómica: borrar, escribir meta y cargar.
    const tx = db.transaction([META_STORE, ...DATA_STORES], "readwrite");
    for (const store of DATA_STORES) {
      tx.objectStore(store).clear();
    }
    tx.objectStore(META_STORE).put(metaNueva, "vault");
    for (const [store, pares] of registros) {
      const almacen = tx.objectStore(store);
      for (const [id, record] of pares) {
        almacen.put(record, id);
      }
    }
    try {
      await transactionDone(tx);
    } catch {
      // Un aborto (por ejemplo por cuota de almacenamiento) no debe llegar
      // como Error genérico: la interfaz necesita tiparlo.
      throw new VaultError("No se ha podido escribir la copia en el almacén: la escritura se ha abortado.");
    }
    // La época ha cambiado: todas las demás sesiones vivas de esta base
    // quedan bloqueadas al instante dentro de este proceso.
    lockAllSessions(dbName);
  } finally {
    db.close();
  }
}
