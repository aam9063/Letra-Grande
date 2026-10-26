/**
 * Punto de entrada de `@letra-grande/vault`.
 * Todo queda en el dispositivo: IndexedDB cifrada con AES-256-GCM y clave
 * derivada con PBKDF2 que vive solo en memoria.
 */
export {
  DEFAULT_KDF_ITERATIONS,
  KDF_ALGORITHM,
  RECORD_VERSION,
  crearKdfParams,
  decryptRecord,
  deriveVaultKey,
  encryptRecord,
  randomBytes,
  type EncryptedRecord,
  type KdfParams,
} from "./crypto.js";
export {
  DATA_STORES,
  META_STORE,
  VAULT_DB_NAME,
  VAULT_DB_VERSION,
  openVaultDatabase,
  type DataStore,
  type VaultMeta,
} from "./db.js";
export {
  Vault,
  VaultCorruptError,
  VaultCorruptMetaError,
  VaultError,
  VaultLockedError,
  VaultRecordVersionError,
  VaultUnsupportedKdfError,
  WrongPasswordError,
  openVault,
  type BlobRecord,
  type DocumentRecord,
  type OpenVaultOptions,
  type ProfileRecord,
  type RadarRecord,
  type SettingValue,
  type TypedCollection,
  type VaultTimer,
} from "./vault.js";
export { decodeBase64, decodeJson, encodeBase64, encodeJson, type JsonValue } from "./serialize.js";
