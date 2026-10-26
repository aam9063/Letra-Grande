import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import { WrongPasswordError, openVault } from "@letra-grande/vault";
import { purgarTodo } from "./borrado";

// Borrado total (UI-06, S2): openVault más Vault.purge(). fake-indexeddb ya
// está en el monorepo (paquete vault): se reutiliza para correr IndexedDB en
// node con iteraciones bajas y deterministas. Contraseñas y datos ficticios.
const CLAVE = "clave-ficticia";
const OTRA = "otra-clave-ficticia";

function factoria(): IDBFactory {
  return new IDBFactory();
}

async function sembrar(factoria: IDBFactory): Promise<void> {
  const vault = await openVault({
    password: CLAVE,
    dbName: "vault-test",
    indexedDB: factoria,
    iterations: 1_000,
  });
  await vault.profiles.put("perfil", { id: "perfil", label: "Perfil ficticio", knownTerms: [], plainLanguage: false });
}

describe("purgarTodo", () => {
  it("con contraseña incorrecta rechaza con WrongPasswordError y no borra nada", async () => {
    const factoriaLocal = factoria();
    await sembrar(factoriaLocal);

    await expect(
      purgarTodo(OTRA, { dbName: "vault-test", indexedDB: factoriaLocal, iterations: 1_000 }),
    ).rejects.toBeInstanceOf(WrongPasswordError);

    // Nada se ha tocado: la contraseña buena sigue leyendo los datos.
    const vault = await openVault({
      password: CLAVE,
      dbName: "vault-test",
      indexedDB: factoriaLocal,
      iterations: 1_000,
    });
    const { values, errors } = await vault.profiles.list();
    expect(values).toHaveLength(1);
    expect(errors).toHaveLength(0);
  });

  it("con contraseña correcta purga: las colecciones quedan vacías", async () => {
    const factoriaLocal = factoria();
    await sembrar(factoriaLocal);

    await purgarTodo(CLAVE, { dbName: "vault-test", indexedDB: factoriaLocal, iterations: 1_000 });

    const vault = await openVault({
      password: CLAVE,
      dbName: "vault-test",
      indexedDB: factoriaLocal,
      iterations: 1_000,
    });
    for (const coleccion of [vault.profiles, vault.documents, vault.blobs, vault.radar, vault.settings]) {
      const { values, errors } = await coleccion.list();
      expect(values).toEqual([]);
      expect(errors).toEqual([]);
    }
  });

  it("tras la purga, openVault crea un almacén vacío y utilizable", async () => {
    const factoriaLocal = factoria();
    await sembrar(factoriaLocal);
    await purgarTodo(CLAVE, { dbName: "vault-test", indexedDB: factoriaLocal, iterations: 1_000 });

    const vault = await openVault({
      password: CLAVE,
      dbName: "vault-test",
      indexedDB: factoriaLocal,
      iterations: 1_000,
    });
    await vault.profiles.put("nuevo", { id: "nuevo", label: "Perfil nuevo ficticio", knownTerms: [], plainLanguage: false });
    const leido = await vault.profiles.get("nuevo");
    expect(leido).toEqual({ id: "nuevo", label: "Perfil nuevo ficticio", knownTerms: [], plainLanguage: false });
  });
});
