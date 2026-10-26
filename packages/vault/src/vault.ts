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
  type EncryptedRecord,
  type KdfParams,
} from "./crypto.js";
import {
  DATA_STORES,
  openVaultDatabase,
  readMeta,
  requestToPromise,
  transactionDone,
  writeMeta,
  type DataStore,
} from "./db.js";
import { decodeBase64, type JsonValue } from "./serialize.js";
import type { Profile, RadarItem, VaultDocument } from "@letra-grande/schema";

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
  list(): Promise<T[]>;
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

/** Error base del vault. Los mensajes nunca incluyen datos ni claves. */
export class VaultError extends Error {}

/** La contraseña no descifra el verificador: no se ha tocado ningún dato. */
export class WrongPasswordError extends VaultError {
  constructor() {
    super("La contraseña no es correcta.");
  }
}

/** La sesión está cerrada: hace falta la contraseña otra vez. */
export class VaultLockedError extends VaultError {
  constructor() {
    super("El vault está bloqueado: introduce la contraseña otra vez.");
  }
}

/** GCM ha detectado manipulación o corrupción en un registro. */
export class VaultCorruptError extends VaultError {
  constructor() {
    super("Un registro no se ha podido descifrar: los datos están dañados.");
  }
}

interface StoredRecord extends EncryptedRecord {
  version: number;
}

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

  constructor(
    key: CryptoKey,
    db: IDBDatabase,
    dbName: string,
    factory: IDBFactory,
    params: KdfParams,
    options: Required<Pick<OpenVaultOptions, "inactivityMs">> & OpenVaultOptions,
  ) {
    this.key = key;
    this.db = db;
    this.dbName = dbName;
    this.factory = factory;
    this.params = params;
    this.inactivityMs = options.inactivityMs;
    this.timer = options.timer ?? defaultTimer();
    this.onLock = options.onLock;
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

  private session(): { key: CryptoKey; db: IDBDatabase } {
    const key = this.key;
    const db = this.db;
    if (key === null || db === null) {
      throw new VaultLockedError();
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
    const { key, db } = this.session();
    const tx = db.transaction(store, "readonly");
    const record = await requestToPromise(tx.objectStore(store).get(id) as IDBRequest<StoredRecord | undefined>);
    if (record === undefined) {
      return undefined;
    }
    try {
      return await decryptRecord<T>(key, record);
    } catch {
      throw new VaultCorruptError();
    }
  }

  private async put<T extends JsonValue>(store: DataStore, id: string, value: T): Promise<void> {
    const { key, db } = this.session();
    const record: StoredRecord = await encryptRecord(key, value);
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(record, id);
    await transactionDone(tx);
    this.programarBloqueo();
  }

  private async delete(store: DataStore, id: string): Promise<void> {
    const { db } = this.session();
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).delete(id);
    await transactionDone(tx);
    this.programarBloqueo();
  }

  private async list<T extends JsonValue>(store: DataStore): Promise<T[]> {
    const { key, db } = this.session();
    const tx = db.transaction(store, "readonly");
    const records = await requestToPromise(
      tx.objectStore(store).getAll() as IDBRequest<StoredRecord[]>,
    );
    try {
      const valores = await Promise.all(records.map((record) => decryptRecord<T>(key, record)));
      this.programarBloqueo();
      return valores;
    } catch {
      throw new VaultCorruptError();
    }
  }
}

/** Verificador: texto conocido que solo descifra la contraseña correcta. */
const VERIFIER_PLAINTEXT: JsonValue = { verificador: "letra-grande-vault" };

export async function openVault(options: OpenVaultOptions): Promise<Vault> {
  const dbName = options.dbName ?? "letra-grande-vault";
  const factory = options.indexedDB ?? globalThis.indexedDB;
  const iterations = options.iterations ?? DEFAULT_KDF_ITERATIONS;
  const db = await openVaultDatabase(factory, dbName);
  try {
    const meta = await readMeta(db);
    let key: CryptoKey;
    let params: KdfParams;
    if (meta === undefined) {
      params = crearKdfParams(iterations);
      key = await deriveVaultKey(options.password, {
        iterations: params.iterations,
        salt: saltDeParams(params),
      });
      const verifier = await encryptRecord(key, VERIFIER_PLAINTEXT);
      await writeMeta(db, { kdf: params, verifier });
    } else {
      params = meta.kdf;
      key = await deriveVaultKey(options.password, {
        iterations: params.iterations,
        salt: saltDeParams(params),
      });
      try {
        await decryptRecord(key, meta.verifier);
      } catch {
        throw new WrongPasswordError();
      }
    }
    if (params.algorithm !== KDF_ALGORITHM) {
      throw new VaultError("Los parámetros de derivación guardados no son compatibles.");
    }
    return new Vault(key, db, dbName, factory, params, {
      ...options,
      inactivityMs: options.inactivityMs ?? 300_000,
    });
  } catch (error) {
    db.close();
    throw error;
  }
}

function saltDeParams(params: KdfParams): Uint8Array<ArrayBuffer> {
  const salt = decodeBase64(params.salt);
  if (salt.length !== 16) {
    throw new VaultError("La sal guardada no tiene la longitud esperada.");
  }
  return salt;
}

export { DEFAULT_KDF_ITERATIONS };
export { DATA_STORES };
export type { DataStore };
