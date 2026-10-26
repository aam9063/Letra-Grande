import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { CLAVE_TAMANO } from "./tamano-letra";
import { PreferenciaTamano } from "./PreferenciaTamano";

// Chips de tamaño de letra (UI-06, S1): un grupo de radios nativos que guarda
// y aplica la preferencia al elegir una opción.
function marcado(nombre: string): boolean {
  const radio = screen.getByRole("radio", { name: nombre });
  return radio instanceof HTMLInputElement && radio.checked;
}

describe("PreferenciaTamano", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.style.fontSize = "";
  });

  it("muestra las tres opciones del catálogo", () => {
    render(<PreferenciaTamano />);

    const grupo = screen.getByRole("group", { name: "Tamaño de letra" });
    const nombres: Record<string, string> = {
      Normal: "Normal (100 %)",
      Grande: "Grande (112,5 %)",
      "Muy grande": "Muy grande (125 %)",
    };
    for (const nombre of Object.keys(nombres)) {
      expect(within(grupo).getByRole("radio", { name: nombres[nombre] })).toBeDefined();
    }
  });

  it("sin preferencia guardada, Normal está marcada", () => {
    render(<PreferenciaTamano />);

    expect(marcado("Normal (100 %)")).toBe(true);
  });

  it("marca la opción guardada aunque no sea la primera", () => {
    localStorage.setItem(CLAVE_TAMANO, "muy-grande");

    render(<PreferenciaTamano />);

    expect(marcado("Muy grande (125 %)")).toBe(true);
    expect(marcado("Normal (100 %)")).toBe(false);
  });

  it("al elegir Grande guarda la bandera y aplica 112,5 % al html", () => {
    render(<PreferenciaTamano />);

    fireEvent.click(screen.getByRole("radio", { name: "Grande (112,5 %)" }));

    expect(localStorage.getItem(CLAVE_TAMANO)).toBe("grande");
    expect(document.documentElement.style.fontSize).toBe("112.5%");
    expect(marcado("Grande (112,5 %)")).toBe(true);
  });
});
