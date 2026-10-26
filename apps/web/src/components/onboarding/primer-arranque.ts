/**
 * Marcador local del onboarding de primer arranque (UI-05): una bandera en
 * localStorage, sin ningún dato personal. Se consulta desde el cliente.
 */
export const CLAVE_ONBOARDING = "lg-onboarding-hecho";

export function verOnboardingPendiente(): boolean {
  try {
    return localStorage.getItem(CLAVE_ONBOARDING) !== "1";
  } catch {
    // Navegador con almacenamiento bloqueado: tratamos el onboarding como
    // pendiente para que la persona lo vea, sin romper la app.
    return true;
  }
}

export function marcarOnboardingHecho(): void {
  try {
    localStorage.setItem(CLAVE_ONBOARDING, "1");
  } catch {
    // Sin almacenamiento no hay nada que recordar: la app funciona igual.
  }
}
