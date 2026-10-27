// Memoria de la ultima version anunciada. Logica pura, probada con vitest:
// la misma version no se anuncia dos veces, para no caer en un bucle de
// avisos si hay varias comprobaciones en la misma sesion.

/** Decide si una version merece el dialogo de aviso. */
export interface VersionAnnouncer {
  shouldAnnounce(version: string): boolean;
}

/** Crea la memoria de versiones anunciadas de una sesion. */
export function createVersionAnnouncer(): VersionAnnouncer {
  const anunciadas = new Set<string>();
  return {
    shouldAnnounce(version: string): boolean {
      const normalizada = version.trim();
      if (normalizada === "") return false;
      if (anunciadas.has(normalizada)) return false;
      anunciadas.add(normalizada);
      return true;
    },
  };
}
