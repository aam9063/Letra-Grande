/**
 * Vault local: colecciones cifradas sobre IndexedDB, sesión con contraseña,
 * cierre de sesión y bloqueo automático por inactividad.
 *
 * La `CryptoKey` no extraíble vive solo en la instancia, en memoria: no se
 * guarda, no se serializa y no sale del dispositivo.
 */
import {
  crearKdfParams,
  DEFAULT_KDF_ITERATIONS,
  decryptRecord,
  deriveVaultKey,
  encryptRecord,
  KDF_ALGORITHM,
  RECORD_VERSION,
  VERIFIER_ID,
  VERIFIER_PLAINTEXT,
  type EncryptedRecord,
  type KdfParams,
} from "./crypto.js";
import {
  DATA_STORES,
  META_STORE,
  openVaultDatabase,
  readMeta,
  requestToPromise,
  transactionDone,
  writeMeta,
  type DataStore,
  type VaultMeta,
} from "./db.js";
import {
  createExportArtifact,
  EXPORT_PAYLOAD_VERSION,
  type ExportPayload,
} from "./backup.js";
import {
  VaultCorruptError,
  VaultCorruptMetaError,
  VaultError,
  VaultLockedError,
  VaultRecordVersionError,
  VaultStaleSessionError,
  VaultUnsupportedKdfError,
  WrongPasswordError,
} from "./errors.js";
import { lockOtherSessions, registerSession, unregisterSession } from "./sessions.js";
import { decodeBase64, type JsonValue } from "./serialize.js";
import type { Profile, RadarItem, VaultDocument } from "@letra-grande/schema";

// Los errores tipados viven en errors.ts y se reexportan aquí para mantener
// la API pública del paquete en un solo punto de entrada.
export {
  VaultCorruptError,
  VaultCorruptExportError,
  VaultCorruptMetaError,
  VaultError,
  VaultLockedError,
  VaultNotEmptyError,
  VaultRecordVersionError,
  VaultStaleSessionError,
  VaultUnsupportedExportError,
  VaultUnsupportedKdfError,
  WrongPasswordError,
} from "./errors.js";

/** Programa el bloqueo por inactividad. Inyectable para pruebas deterministas. */
export interface VaultTimer {
  schedule(ms: number, callback: () => void): unknown;
  cancel(handle: unknown): void;
}

function defaultTimer(): VaultTimer {
  return {
    schedule: (ms, callback) => setTimeout(callback, ms),
    cancel: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
  };
}

export interface OpenVaultOptions {
  password: string;
  /** Nombre de la base IndexedDB. Útil para aislar tests. */
  dbName?: string;
  /** Factoría IndexedDB inyectable (por defecto, la global). */
  indexedDB?: IDBFactory;
  /** Iteraciones PBKDF2. Por defecto 600 000; en tests se usa un valor bajo. */
  iterations?: number;
  /** Milisegundos de inactividad antes del bloqueo automático. */
  inactivityMs?: number;
  timer?: VaultTimer;
  /** Aviso cuando el bloqueo automático cierra la sesión. */
  onLock?: () => void;
}

/** Colección tipada sobre un almacén cifrado. */
export interface TypedCollection<T extends JsonValue> {
  get(id: string): Promise<T | undefined>;
  put(id: string, value: T): Promise<void>;
  delete(id: string): Promise<void>;
  list(): Promise<ListResult<T>>;
}

/** Error de un registro concreto durante el listado. */
export interface ListEntryError {
  id: string;
  error: VaultError;
}

/**
 * Resultado de un listado con degradación por registro: los valores buenos
 * vuelven siempre, y cada registro dañado aparece en `errors` con su id y su
 * error tipado, en lugar de bloquear el listado completo.
 */
export interface ListResult<T extends JsonValue> {
  values: T[];
  errors: ListEntryError[];
}

export type BlobRecord = {
  name: string;
  mime: string;
  /** Contenido binario en base64: el cifrado real lo hace el vault. */
  bytesBase64: string;
};

export type SettingValue = JsonValue;

export type DocumentRecord = VaultDocument;
export type RadarRecord = RadarItem;
export type ProfileRecord = Profile;

type StoredRecord = EncryptedRecord;

export class Vault {
  private key: CryptoKey | null;
  private readonly db: IDBDatabase | null;
  private readonly dbName: string;
  private readonly factory: IDBFactory;
  private readonly params: KdfParams;
  private readonly inactivityMs: number;
  private readonly timer: VaultTimer;
  private readonly onLock?: () => void;
  private lockHandle: unknown;
  /** Época del almacén con la que se abrió esta sesión. */
  private readonly epoch: number;

  constructor(
    key: CryptoKey,
    db: IDBDatabase,
    dbName: string,
    factory: IDBFactory,
    params: KdfParams,
    epoch: number,
    options: Required<Pick<OpenVaultOptions, "inactivityMs">> & OpenVaultOptions,
  ) {
    this.key = key;
    this.db = db;
    this.dbName = dbName;
    this.factory = factory;
    this.params = params;
    this.epoch = epoch;
    this.inactivityMs = options.inactivityMs;
    this.timer = options.timer ?? defaultTimer();
    this.onLock = options.onLock;
    registerSession(dbName, this);
    this.programarBloqueo();
  }

  get locked(): boolean {
    return this.key === null;
  }

  get kdfParams(): KdfParams {
    return { ...this.params };
  }

  readonly profiles = this.coleccion<ProfileRecord>("profiles");
  readonly documents = this.coleccion<DocumentRecord>("documents");
  readonly blobs = this.coleccion<BlobRecord>("blobs");
  readonly radar = this.coleccion<RadarRecord>("radar");
  readonly settings = this.coleccion<SettingValue>("settings");

  /** Registra actividad del usuario y reprograma el bloqueo. */
  touch(): void {
    this.programarBloqueo();
  }

  /** Cierra la sesión: la clave se descarta y hace falta la contraseña otra vez. */
  lock(): void {
    this.timer.cancel(this.lockHandle);
    this.key = null;
    unregisterSession(this.dbName, this);
    this.db?.close();
  }

  private programarBloqueo(): void {
    if (this.locked) {
      return;
    }
    this.timer.cancel(this.lockHandle);
    this.lockHandle = this.timer.schedule(this.inactivityMs, () => {
      this.lock();
      this.onLock?.();
    });
  }

  /**
   * Sesión válida: con clave y con la época del almacén sin cambiar. Cada
   * operación comprueba la época guardada en meta, porque una importación o
   * una purga desde otra sesión (u otra pestaña) dejan esta clave inútil.
   */
  private async session(): Promise<{ key: CryptoKey; db: IDBDatabase }> {
    const key = this.key;
    const db = this.db;
    if (key === null || db === null) {
      throw new VaultLockedError();
    }
    const meta = await readMeta(db);
    const epochAlmacenada =
      meta === undefined ? undefined : typeof meta.epoch === "number" ? meta.epoch : 0;
    if (epochAlmacenada !== this.epoch) {
      throw new VaultStaleSessionError();
    }
    return { key, db };
  }

  private coleccion<T extends JsonValue>(store: DataStore): TypedCollection<T> {
    return {
      get: (id) => this.get(store, id),
      put: (id, value) => this.put(store, id, value),
      delete: (id) => this.delete(store, id),
      list: () => this.list(store),
    };
  }

  private async get<T extends JsonValue>(store: DataStore, id: string): Promise<T | undefined> {
    const { key, db } = await this.session();
    // Leer también es actividad: reprograma el bloqueo antes de descifrar.
    this.programarBloqueo();
    const tx = db.transaction(store, "readonly");
    const record = await requestToPromise(tx.objectStore(store).get(id) as IDBRequest<StoredRecord | undefined>);
    if (record === undefined) {
      return undefined;
    }
    assertRecordVersion(record);
    try {
      return await decryptRecord<T>(key, record, id);
    } catch {
      throw new VaultCorruptError();
    }
  }

  private async put<T extends JsonValue>(store: DataStore, id: string, value: T): Promise<void> {
    const { key, db } = await this.session();
    const record: StoredRecord = await encryptRecord(key, id, value);
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(record, id);
    await transactionDone(tx);
    this.programarBloqueo();
  }

  private async delete(store: DataStore, id: string): Promise<void> {
    const { db } = await this.session();
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).delete(id);
    await transactionDone(tx);
    this.programarBloqueo();
  }

  private async list<T extends JsonValue>(store: DataStore): Promise<ListResult<T>> {
    const { key, db } = await this.session();
    // Listar también es actividad: reprograma el bloqueo antes de descifrar.
    this.programarBloqueo();
    const tx = db.transaction(store, "readonly");
    const almacen = tx.objectStore(store);
    const [records, ids] = await Promise.all([
      requestToPromise(almacen.getAll() as IDBRequest<StoredRecord[]>),
      requestToPromise(almacen.getAllKeys() as IDBRequest<IDBValidKey[]>),
    ]);
    if (records.length !== ids.length) {
      throw new VaultCorruptError();
    }
    // Degradación por registro: un registro dañado no bloquea el listado.
    const valores: T[] = [];
    const errores: ListEntryError[] = [];
    for (let i = 0; i < records.length; i += 1) {
      const id = ids[i];
      const record = records[i];
      try {
        if (typeof id !== "string" || record === undefined) {
          throw new VaultCorruptError();
        }
        assertRecordVersion(record);
        valores.push(await decryptRecord<T>(key, record, id));
      } catch (error) {
        errores.push({
          id: typeof id === "string" ? id : String(id),
          error: error instanceof VaultError ? error : new VaultCorruptError(),
        });
      }
    }
    return { values: valores, errors: errores };
  }

  /**
   * Exporta todo el contenido a un único artefacto cifrado con una clave
   * derivada de la contraseña y una sal nueva. El archivo se construye en
   * memoria y no contiene ningún dato legible: la cabecera solo lleva datos
   * técnicos del cifrado y la carga útil va cifrada completa.
   *
   * Si algún registro está dañado, la exportación falla: nunca se copia un
   * vault a medias sin avisar.
   */
  async exportBackup(password: string): Promise<Uint8Array<ArrayBuffer>> {
    const { key, db } = await this.session();
    this.programarBloqueo();
    const tx = db.transaction([...DATA_STORES], "readonly");
    // Todas las lecturas se piden en el mismo turno para que la transacción
    // siga viva; el descifrado va después, fuera de la transacción.
    const lecturas = DATA_STORES.map((store) => {
      const almacen = tx.objectStore(store);
      return Promise.all([
        requestToPromise(almacen.getAll() as IDBRequest<StoredRecord[]>),
        requestToPromise(almacen.getAllKeys() as IDBRequest<IDBValidKey[]>),
      ]);
    });
    const resultados = await Promise.all(lecturas);
    const colecciones = {} as Record<DataStore, Record<string, JsonValue>>;
    for (let s = 0; s < DATA_STORES.length; s += 1) {
      const store = DATA_STORES[s];
      const par = resultados[s];
      if (store === undefined || par === undefined) {
        throw new VaultCorruptError();
      }
      const [records, ids] = par;
      const objetos: Record<string, JsonValue> = {};
      for (let i = 0; i < records.length; i += 1) {
        const id = ids[i];
        const record = records[i];
        if (typeof id !== "string" || record === undefined) {
          throw new VaultCorruptError();
        }
        assertRecordVersion(record);
        try {
          objetos[id] = await decryptRecord<JsonValue>(key, record, id);
        } catch {
          throw new VaultCorruptError();
        }
      }
      colecciones[store] = objetos;
    }
    const payload: ExportPayload = { version: EXPORT_PAYLOAD_VERSION, colecciones };
    return createExportArtifact(payload, password, this.params.iterations);
  }

  /**
   * Borra todo: vacía las cinco colecciones dentro de una única transacción
   * atómica, incrementa la época de los metadatos y cierra la sesión.
   *
   * Los metadatos técnicos (parámetros de derivación y verificador) se
   * conservan con la época aumentada: así ninguna sesión viva, ni aquí ni en
   * otra pestaña, puede resucitar datos después de la purga, porque su época
   * ya no coincide. Todos los datos personales desaparecen.
   */
  async purge(): Promise<void> {
    const { db } = await this.session();
    const meta = await readMeta(db);
    if (meta === undefined || meta.verifier === undefined) {
      throw new VaultCorruptMetaError();
    }
    const epochPrevia = typeof meta.epoch === "number" ? meta.epoch : 0;
    const metaNueva: VaultMeta = {
      kdf: meta.kdf,
      verifier: meta.verifier,
      epoch: epochPrevia + 1,
    };
    const tx = db.transaction([META_STORE, ...DATA_STORES], "readwrite");
    for (const store of DATA_STORES) {
      tx.objectStore(store).clear();
    }
    tx.objectStore(META_STORE).put(metaNueva, "vault");
    await transactionDone(tx);
    lockOtherSessions(this.dbName, this);
    this.lock();
  }
}

/** Comprueba que el registro usa la versión del formato que esta versión entiende. */
function assertRecordVersion(record: EncryptedRecord): void {
  if (record.version !== RECORD_VERSION) {
    throw new VaultRecordVersionError();
  }
}

/**
 * Valida los parámetros de derivación guardados ANTES de derivar: un vault de
 * una versión futura debe dar "parámetros no compatibles", nunca "contraseña
 * errónea".
 */
function validarKdfParams(params: KdfParams): void {
  if (params.algorithm !== KDF_ALGORITHM) {
    throw new VaultUnsupportedKdfError();
  }
  if (!Number.isInteger(params.iterations) || params.iterations <= 0) {
    throw new VaultUnsupportedKdfError();
  }
}

/**
 * Bloqueo de apertura por base de datos: serializa las aperturas dentro del
 * proceso para que dos `openVault` simultáneos sobre un almacén vacío no
 * escriban metadatos distintos (salarios distintos dejan registros ilegibles).
 * En cuanto la primera apertura termina, la segunda lee la meta ya escrita y
 * deriva la misma clave.
 */
const locksApertura = new Map<string, Promise<unknown>>();

function withOpenLock<T>(dbName: string, work: () => Promise<T>): Promise<T> {
  const previo = locksApertura.get(dbName) ?? Promise.resolve();
  const resultado = previo.then(work, work);
  const liberacion = resultado.then(
    () => undefined,
    () => undefined,
  );
  locksApertura.set(dbName, liberacion);
  void liberacion.then(() => {
    if (locksApertura.get(dbName) === liberacion) {
      locksApertura.delete(dbName);
    }
  });
  return resultado;
}

export async function openVault(options: OpenVaultOptions): Promise<Vault> {
  const dbName = options.dbName ?? "letra-grande-vault";
  const factory = options.indexedDB ?? globalThis.indexedDB;
  const iterations = options.iterations ?? DEFAULT_KDF_ITERATIONS;
  const db = await openVaultDatabase(factory, dbName);
  try {
    return await withOpenLock(dbName, async () => {
      const meta = await readMeta(db);
      let key: CryptoKey;
      let params: KdfParams;
      let epoch: number;
      if (meta === undefined) {
        params = crearKdfParams(iterations);
        epoch = 0;
        key = await deriveVaultKey(options.password, {
          iterations: params.iterations,
          salt: saltDeParams(params),
        });
        const verifier = await encryptRecord(key, VERIFIER_ID, VERIFIER_PLAINTEXT);
        await writeMeta(db, { kdf: params, verifier, epoch });
      } else {
        if (meta.verifier === undefined) {
          throw new VaultCorruptMetaError();
        }
        params = meta.kdf;
        validarKdfParams(params);
        epoch = typeof meta.epoch === "number" ? meta.epoch : 0;
        const salt = saltDeParams(params);
        assertRecordVersion(meta.verifier);
        key = await deriveVaultKey(options.password, {
          iterations: params.iterations,
          salt,
        });
        try {
          await decryptRecord(key, meta.verifier, VERIFIER_ID);
        } catch {
          throw new WrongPasswordError();
        }
      }
      return new Vault(key, db, dbName, factory, params, epoch, {
        ...options,
        inactivityMs: options.inactivityMs ?? 300_000,
      });
    });
  } catch (error) {
    db.close();
    throw error;
  }
}

function saltDeParams(params: KdfParams): Uint8Array<ArrayBuffer> {
  const salt = decodeBase64(params.salt);
  if (salt.length !== 16) {
    throw new VaultCorruptMetaError();
  }
  return salt;
}

export { DEFAULT_KDF_ITERATIONS };
export { DATA_STORES };
export type { DataStore };
