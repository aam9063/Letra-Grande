// Politica de permisos: todo se deniega salvo lo que una lista explicita
// conceda. Hoy esa lista esta vacia; si alguna funcion concreta necesitara un
// permiso, se anade aqui y se justifica en el review gate. Funcion pura,
// probada con vitest.

/** Conjunto vacio compartido: ningun permiso concedido por defecto. */
export const NO_PERMISSIONS_ALLOWED: ReadonlySet<string> = new Set<string>();

/** Decide si un permiso del navegador se concede a la pagina. */
export function isPermissionAllowed(
  permission: string,
  allowed: ReadonlySet<string>,
): boolean {
  return allowed.has(permission);
}
