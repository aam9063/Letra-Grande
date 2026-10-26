import { openVault } from "@letra-grande/vault";

/** Opciones inyectables para los tests: mismo contrato que openVault. */
export interface OpcionesPurga {
  dbName?: string;
  indexedDB?: IDBFactory;
  iterations?: number;
}

/**
 * Borrado total (UI-06, S2): abre el vault con la contraseña y purga.
 *
 * La contraseña incorrecta sale como WrongPasswordError de openVault y no se
 * toca ningún dato. La purga correcta vacía las cinco colecciones, deja solo
 * el registro técnico de época en meta y cierra la sesión. Nada sale del
 * dispositivo.
 */
export async function purgarTodo(password: string, opciones?: OpcionesPurga): Promise<void> {
  const vault = await openVault({
    password,
    dbName: opciones?.dbName,
    indexedDB: opciones?.indexedDB,
    iterations: opciones?.iterations,
  });
  await vault.purge();
}
