import { describe, expect, it } from "vitest";
import {
  DEFAULT_KDF_ITERATIONS,
  decryptRecord,
  deriveVaultKey,
  encryptRecord,
  randomBytes,
} from "../src/crypto.js";
import { decodeBase64 } from "../src/serialize.js";

describe("derivación de clave", () => {
  it("usa 600 000 iteraciones por defecto", () => {
    expect(DEFAULT_KDF_ITERATIONS).toBe(600_000);
  });

  it("produce una clave AES-GCM no extraíble", async () => {
    const salt = randomBytes(16);
    const key = await deriveVaultKey("contraseña-ficticia", { iterations: 1_000, salt });
    expect(key.extractable).toBe(false);
    expect(key.algorithm).toMatchObject({ name: "AES-GCM", length: 256 });
    // La clave no se puede serializar: no debe filtrarse por JSON.
    expect(JSON.stringify(key)).toBe("{}");
  });

  it("la misma contraseña y sal producen una clave que descifra lo que cifró", async () => {
    const salt = randomBytes(16);
    const keyA = await deriveVaultKey("contraseña-ficticia", { iterations: 1_000, salt });
    const keyB = await deriveVaultKey("contraseña-ficticia", { iterations: 1_000, salt });
    const record = await encryptRecord(keyA, { titulo: "factura de prueba" });
    const value = await decryptRecord(keyB, record);
    expect(value).toEqual({ titulo: "factura de prueba" });
  });

  it("otra sal produce una clave distinta que no descifra", async () => {
    const keyA = await deriveVaultKey("contraseña-ficticia", {
      iterations: 1_000,
      salt: randomBytes(16),
    });
    const keyB = await deriveVaultKey("contraseña-ficticia", {
      iterations: 1_000,
      salt: randomBytes(16),
    });
    const record = await encryptRecord(keyA, "dato ficticio");
    await expect(decryptRecord(keyB, record)).rejects.toThrow();
  });
});

describe("cifrado por registro", () => {
  it("genera un IV aleatorio de 12 bytes distinto en cada cifrado", async () => {
    const key = await deriveVaultKey("contraseña-ficticia", {
      iterations: 1_000,
      salt: randomBytes(16),
    });
    const a = await encryptRecord(key, "mismo texto");
    const b = await encryptRecord(key, "mismo texto");
    expect(a.iv).toHaveLength(12);
    expect(b.iv).toHaveLength(12);
    expect(Array.from(a.iv)).not.toEqual(Array.from(b.iv));
    expect(a.version).toBe(1);
  });

  it("un registro manipulado no se descifra: lanza en vez de devolver basura", async () => {
    const key = await deriveVaultKey("contraseña-ficticia", {
      iterations: 1_000,
      salt: randomBytes(16),
    });
    const record = await encryptRecord(key, "dato ficticio");
    // Simula una manipulación en el almacén: cambia el último byte del texto cifrado.
    const manipulado = new Uint8Array(record.data);
    const ultimo = manipulado.length - 1;
    manipulado[ultimo] = (manipulado[ultimo] ?? 0) ^ 0xff;
    await expect(
      decryptRecord(key, { version: record.version, iv: record.iv, data: manipulado }),
    ).rejects.toThrow();
  });

  it("decodifica el JSON en un módulo aislado", async () => {
    const salt = decodeBase64("AAAAAAAAAAAAAAAAAAAAAA==");
    const key = await deriveVaultKey("contraseña-ficticia", { iterations: 1_000, salt });
    const valor = { lista: [1, 2, 3], texto: "ficticio" };
    const record = await encryptRecord(key, valor);
    expect(await decryptRecord(key, record)).toEqual(valor);
  });
});
