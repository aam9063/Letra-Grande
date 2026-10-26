/**
 * Registro de sesiones vivas por base de datos, dentro de este proceso.
 *
 * Cuando una importación con reemplazo o una purga reescriben los metadatos,
 * las demás sesiones abiertas de la misma base quedan con una clave que ya no
 * descifra nada. El registro permite bloquearlas al instante, sin esperar a
 * que intenten operar. Entre pestañas distintas la protección es la época
 * guardada en meta, que cada operación comprueba.
 */

/** Manejo mínimo que el registro necesita de una sesión. */
export interface VaultSessionHandle {
  lock(): void;
}

const sesionesVivas = new Map<string, Set<VaultSessionHandle>>();

/** Registra una sesión viva de la base indicada. */
export function registerSession(dbName: string, session: VaultSessionHandle): void {
  let conjunto = sesionesVivas.get(dbName);
  if (conjunto === undefined) {
    conjunto = new Set();
    sesionesVivas.set(dbName, conjunto);
  }
  conjunto.add(session);
}

/** Quita una sesión del registro (al bloquearla o cerrarla). */
export function unregisterSession(dbName: string, session: VaultSessionHandle): void {
  const conjunto = sesionesVivas.get(dbName);
  if (conjunto === undefined) {
    return;
  }
  conjunto.delete(session);
  if (conjunto.size === 0) {
    sesionesVivas.delete(dbName);
  }
}

/** Bloquea todas las sesiones vivas de la base excepto la indicada. */
export function lockOtherSessions(dbName: string, excepto: VaultSessionHandle): void {
  const conjunto = sesionesVivas.get(dbName);
  if (conjunto === undefined) {
    return;
  }
  // Copia antes de iterar: lock() modifica el conjunto al darse de baja.
  for (const sesion of [...conjunto]) {
    if (sesion !== excepto) {
      sesion.lock();
    }
  }
}

/** Bloquea todas las sesiones vivas de la base, sin excepción. */
export function lockAllSessions(dbName: string): void {
  lockOtherSessions(dbName, { lock: () => undefined });
}
