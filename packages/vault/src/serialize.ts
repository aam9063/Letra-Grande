/**
 * Codificación aislada en un único módulo: JSON a bytes y bytes a base64.
 * Nada más del paquete serializa a mano.
 */

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [clave: string]: JsonValue };

export function encodeJson(value: JsonValue): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(JSON.stringify(value));
}

export function decodeJson(bytes: Uint8Array): JsonValue {
  const texto = new TextDecoder().decode(bytes);
  try {
    return JSON.parse(texto) as JsonValue;
  } catch {
    throw new Error("El registro no contiene JSON válido.");
  }
}

export function encodeBase64(bytes: Uint8Array): string {
  let binaria = "";
  for (const byte of bytes) {
    binaria += String.fromCharCode(byte);
  }
  return btoa(binaria);
}

export function decodeBase64(texto: string): Uint8Array<ArrayBuffer> {
  const binaria = atob(texto);
  const bytes = new Uint8Array(binaria.length);
  for (let i = 0; i < binaria.length; i += 1) {
    bytes[i] = binaria.charCodeAt(i);
  }
  return bytes;
}
