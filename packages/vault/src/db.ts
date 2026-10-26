/**
 * Acceso a IndexedDB: apertura de la base del vault y conversión de
 * peticiones a promesas. Los valores de los registros llegan ya cifrados
 * desde el módulo crypto.
 */
import type { EncryptedRecord, KdfParams } from "./crypto.js";

export const VAULT_DB_NAME = "letra-grande-vault";
export const VAULT_DB_VERSION = 1;

/** Nombre del almacén de metadatos (parámetros de derivación y verificador). */
export const META_STORE = "meta";

/** Colecciones de datos del usuario. Todas se cifran por registro. */
export const DATA_STORES = ["profiles", "documents", "blobs", "radar", "settings"] as const;
export type DataStore = (typeof DATA_STORES)[number];

/** Registro de metadatos del vault. */
export interface VaultMeta {
  kdf: KdfParams;
  /** Texto conocido cifrado: descifrarlo valida la contraseña. */
  verifier: EncryptedRecord;
  /**
   * Época del almacén: se incrementa en cada importación y en cada purga.
   * Una sesión guarda la época con la que abrió y se niega a operar si la
   * almacenada ya no coincide, porque su clave ya no descifra los datos.
   * Las meta anteriores a este campo se tratan como época 0.
   */
  epoch?: number;
}

export function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Error de IndexedDB."));
  });
}

export function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error("Transacción abortada."));
    transaction.onerror = () => reject(transaction.error ?? new Error("Error de transacción."));
  });
}

export function openVaultDatabase(
  factory: IDBFactory,
  dbName: string,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(dbName, VAULT_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE);
      }
      for (const store of DATA_STORES) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store);
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("No se ha podido abrir el almacén."));
    request.onblocked = () => reject(new Error("El almacén está bloqueado por otra pestaña."));
  });
}

export async function readMeta(db: IDBDatabase): Promise<VaultMeta | undefined> {
  const tx = db.transaction(META_STORE, "readonly");
  return requestToPromise(tx.objectStore(META_STORE).get("vault") as IDBRequest<VaultMeta | undefined>);
}

export async function writeMeta(db: IDBDatabase, meta: VaultMeta): Promise<void> {
  const tx = db.transaction(META_STORE, "readwrite");
  tx.objectStore(META_STORE).put(meta, "vault");
  await transactionDone(tx);
}
