/**
 * Marcador local del onboarding de primer arranque (UI-05): una bandera en
 * localStorage, sin ningún dato personal. Se consulta desde el cliente.
 */
export const CLAVE_ONBOARDING = "lg-onboarding-hecho";

export function verOnboardingPendiente(): boolean {
  return localStorage.getItem(CLAVE_ONBOARDING) !== "1";
}

export function marcarOnboardingHecho(): void {
  localStorage.setItem(CLAVE_ONBOARDING, "1");
}
