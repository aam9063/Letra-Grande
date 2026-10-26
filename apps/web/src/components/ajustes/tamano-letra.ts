/**
 * Preferencia de tamaño de letra (UI-06, S1): una bandera local en
 * localStorage, sin ningún dato personal. Tres opciones del catálogo cerrado
 * que escalan el font-size de html; el resto de la interfaz usa unidades
 * relativas, así el escalado es consistente en toda la app.
 */
export const CLAVE_TAMANO = "lg-tamano-letra";

export const TAMANOS = ["normal", "grande", "muy-grande"] as const;

export type TamanoLetra = (typeof TAMANOS)[number];

export const TAMANO_DEFAULT: TamanoLetra = "normal";

/** Font-size de html para cada opción, en porcentaje sobre el tamaño base. */
export const FUENTES: Record<TamanoLetra, string> = {
  normal: "100%",
  grande: "112.5%",
  "muy-grande": "125%",
};

/** Lee la preferencia guardada; un valor ajeno al catálogo cuenta como Normal. */
export function verTamanoLetra(): TamanoLetra {
  try {
    const valor = localStorage.getItem(CLAVE_TAMANO);
    return esTamano(valor) ? valor : TAMANO_DEFAULT;
  } catch {
    // Navegador con almacenamiento bloqueado: la app funciona en Normal.
    return TAMANO_DEFAULT;
  }
}

/** Guarda la bandera; sin almacenamiento no hay nada que recordar. */
export function guardarTamanoLetra(tamano: TamanoLetra): void {
  try {
    localStorage.setItem(CLAVE_TAMANO, tamano);
  } catch {
    // Sin almacenamiento la preferencia no persiste, pero la sesión funciona.
  }
}

/** Aplica el font-size de la opción al elemento html. */
export function aplicarTamanoLetra(tamano: TamanoLetra): void {
  document.documentElement.style.fontSize = FUENTES[tamano];
}

/** Aplica la preferencia guardada. La llama el layout antes del primer pintado. */
export function iniciarTamanoLetra(): void {
  aplicarTamanoLetra(verTamanoLetra());
}

/**
 * Vuelve a Normal y borra la bandera: la app queda como recién instalada
 * después del borrado total (UI-06, S2).
 */
export function restablecerTamanoLetra(): void {
  try {
    localStorage.removeItem(CLAVE_TAMANO);
  } catch {
    // Sin almacenamiento no hay bandera que borrar.
  }
  aplicarTamanoLetra(TAMANO_DEFAULT);
}

function esTamano(valor: string | null): valor is TamanoLetra {
  return valor !== null && (TAMANOS as readonly string[]).includes(valor);
}
