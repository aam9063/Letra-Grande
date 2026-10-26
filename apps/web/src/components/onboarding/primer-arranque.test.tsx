import { beforeEach, describe, expect, it } from "vitest";
import { CLAVE_ONBOARDING, marcarOnboardingHecho, verOnboardingPendiente } from "./primer-arranque";

// Marcador local de primer arranque (UI-05): sin datos personales, solo una
// bandera. jsdom da localStorage por origen de prueba.
describe("primer arranque", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("sin marcador, el onboarding está pendiente", () => {
    expect(verOnboardingPendiente()).toBe(true);
  });

  it("marcarlo hecho escribe la bandera y deja de estar pendiente", () => {
    marcarOnboardingHecho();

    expect(localStorage.getItem(CLAVE_ONBOARDING)).toBe("1");
    expect(verOnboardingPendiente()).toBe(false);
  });

  it("resiste valores distintos de la bandera: solo el 1 cuenta como hecho", () => {
    localStorage.setItem(CLAVE_ONBOARDING, "sí");

    expect(verOnboardingPendiente()).toBe(true);
  });
});
