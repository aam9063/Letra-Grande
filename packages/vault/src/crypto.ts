/**
 * Primitivas WebCrypto del vault: derivación PBKDF2 y cifrado por registro
 * con AES-256-GCM e IV aleatorio de 12 bytes.
 *
 * La clave derivada es no extraíble: solo vive en memoria y no se puede
 * exportar ni serializar. Ninguna función de este módulo la devuelve en
 * texto ni la guarda.
 */
import { decodeJson, encodeBase64, encodeJson, type JsonValue } from "./serialize.js";

/** Valor de referencia OWASP para PBKDF2-HMAC-SHA256. */
export const DEFAULT_KDF_ITERATIONS = 600_000;

/** Identificador del algoritmo de derivación guardado junto a la sal. */
export const KDF_ALGORITHM = "PBKDF2-HMAC-SHA256" as const;

/**
 * Versión del formato de registro cifrado.
 *
 * v1: AES-256-GCM sobre JSON, sin additionalData: el id del registro no quedaba
 * autenticado y dos registros intercambiados se descifraban bien.
 * v2: igual que v1 pero con el id del registro como additionalData, de forma
 * que un registro movido a otro id no se descifra. La v1 ya no se descifra.
 */
export const RECORD_VERSION = 2;

/** Bytes con respaldo propio de ArrayBuffer, válidos como BufferSource. */
export type VaultBytes = Uint8Array<ArrayBuffer>;

const LONGITUD_SALT = 16;
const LONGITUD_IV = 12;
const LONGITUD_CLAVE = 256;

/** Parámetros de derivación persistidos junto a los datos cifrados. */
export interface KdfParams {
  algorithm: typeof KDF_ALGORITHM;
  iterations: number;
  /** Sal aleatoria de 16 bytes en base64. */
  salt: string;
}

export function randomBytes(length: number): VaultBytes {
  const bytes = new Uint8Array(new ArrayBuffer(length));
  crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * Deriva una clave AES-GCM de 256 bits no extraíble a partir de la
 * contraseña. La sal y las iteraciones vienen de los parámetros guardados,
 * de forma que una versión futura pueda migrarlos.
 */
export async function deriveVaultKey(
  password: string,
  params: { iterations: number; salt: VaultBytes },
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: params.salt, iterations: params.iterations, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: LONGITUD_CLAVE },
    false, // no extraíble: sin exportKey, sin serialización
    ["encrypt", "decrypt"],
  );
}

/** Registro cifrado tal y como se guarda en IndexedDB. */
export interface EncryptedRecord {
  version: number;
  iv: VaultBytes;
  data: VaultBytes;
}

function bytesDe(texto: string): VaultBytes {
  return new TextEncoder().encode(texto);
}

/** Verificador: texto conocido que solo descifra la contraseña correcta. */
export const VERIFIER_PLAINTEXT: JsonValue = { verificador: "letra-grande-vault" };

/** Identificador del verificador, autenticado como additionalData. */
export const VERIFIER_ID = "verificador";

/**
 * Cifra un valor JSON con un IV aleatorio nuevo de 12 bytes. El id del
 * registro se autentica como additionalData: no forma parte del texto
 * cifrado, pero GCM lo verifica al descifrar.
 */
export async function encryptRecord(
  key: CryptoKey,
  recordId: string,
  value: JsonValue,
): Promise<EncryptedRecord> {
  const iv = randomBytes(LONGITUD_IV);
  const data = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: bytesDe(recordId) },
    key,
    encodeJson(value),
  );
  return { version: RECORD_VERSION, iv, data: new Uint8Array(data) };
}

/**
 * Descifra un registro. GCM autentica el texto cifrado y el additionalData:
 * si el registro se ha manipulado, se ha movido a otro id o la clave no es la
 * correcta, lanza en lugar de devolver basura.
 */
export async function decryptRecord<T extends JsonValue = JsonValue>(
  key: CryptoKey,
  record: EncryptedRecord,
  recordId: string,
): Promise<T> {
  const data = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: record.iv, additionalData: bytesDe(recordId) },
    key,
    record.data,
  );
  return decodeJson(new Uint8Array(data)) as T;
}

/** Prepara los parámetros de derivación para una apertura inicial. */
export function crearKdfParams(iterations: number): KdfParams {
  return {
    algorithm: KDF_ALGORITHM,
    iterations,
    salt: encodeBase64(randomBytes(LONGITUD_SALT)),
  };
}
