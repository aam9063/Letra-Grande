import { beforeEach, describe, expect, it } from "vitest";
import {
  CLAVE_TAMANO,
  FUENTES,
  TAMANO_DEFAULT,
  aplicarTamanoLetra,
  guardarTamanoLetra,
  restablecerTamanoLetra,
  verTamanoLetra,
} from "./tamano-letra";

// Preferencia de tamaño de letra (UI-06, S1): una bandera local en
// localStorage, sin datos personales. jsdom da localStorage por origen.
describe("preferencia de tamaño de letra", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.style.fontSize = "";
  });

  it("sin preferencia guardada, el valor por defecto es Normal", () => {
    expect(verTamanoLetra()).toBe("normal");
    expect(TAMANO_DEFAULT).toBe("normal");
  });

  it("guardar escribe la bandera y leer la devuelve", () => {
    guardarTamanoLetra("grande");

    expect(localStorage.getItem(CLAVE_TAMANO)).toBe("grande");
    expect(verTamanoLetra()).toBe("grande");
  });

  it("un valor ajeno al catálogo se ignora y vuelve a Normal", () => {
    localStorage.setItem(CLAVE_TAMANO, "gigante");

    expect(verTamanoLetra()).toBe("normal");
  });

  it("aplicar fija el font-size de html según la opción", () => {
    aplicarTamanoLetra("grande");
    expect(document.documentElement.style.fontSize).toBe(FUENTES.grande);

    aplicarTamanoLetra("muy-grande");
    expect(document.documentElement.style.fontSize).toBe("125%");

    aplicarTamanoLetra("normal");
    expect(document.documentElement.style.fontSize).toBe("100%");
  });

  it("restablecer deja Normal y borra la bandera guardada", () => {
    guardarTamanoLetra("muy-grande");

    restablecerTamanoLetra();

    expect(localStorage.getItem(CLAVE_TAMANO)).toBeNull();
    expect(document.documentElement.style.fontSize).toBe("100%");
  });

  it("con el almacenamiento bloqueado, leer no rompe y devuelve Normal", () => {
    const original = Object.getOwnPropertyDescriptor(window, "localStorage");
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("almacenamiento bloqueado");
      },
    });
    try {
      expect(verTamanoLetra()).toBe("normal");
    } finally {
      if (original) {
        Object.defineProperty(window, "localStorage", original);
      }
    }
  });
});
