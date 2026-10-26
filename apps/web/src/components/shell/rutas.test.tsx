import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { paginaPendiente } from "./pendiente";
import HoyPage from "../../app/(app)/hoy/page";
import AsistentePage from "../../app/(app)/asistente/page";
import CarpetaPage from "../../app/(app)/carpeta/page";
import ReclamarPage from "../../app/(app)/reclamar/page";
import VidaPage from "../../app/(app)/vida/page";
import AyudasPage from "../../app/(app)/ayudas/page";
import DatosPage from "../../app/(app)/datos/page";
import FamiliaPage from "../../app/(app)/familia/page";

// Un módulo por ruta: el contrato de la Ola 2. Cada página se importa aquí
// directamente y se comprueba su encabezado y su estado pendiente honesto.
// Carpeta tiene contrato propio (UI-07: crear/desbloquear en lugar de
// pendiente) y se verifica aparte.
const RUTAS: Array<{ modulo: string; Page: () => ReactElement }> = [
  { modulo: "Hoy", Page: HoyPage },
  { modulo: "Asistente", Page: AsistentePage },
  { modulo: "Reclamar y bajas", Page: ReclamarPage },
  { modulo: "Vida", Page: VidaPage },
  { modulo: "Ayudas", Page: AyudasPage },
  { modulo: "Datos", Page: DatosPage },
  { modulo: "Familia", Page: FamiliaPage },
];

describe("rutas de módulo", () => {
  it("Carpeta: sin carpeta creada muestra la pantalla de creación (UI-07)", () => {
    render(<CarpetaPage />);

    const h1 = screen.getAllByRole("heading", { level: 1 });
    expect(h1).toHaveLength(1);
    expect(h1[0]?.textContent).toContain("Carpeta");

    // Pantalla de creación de UI-07 visible dentro de la página.
    expect(screen.getByText("Crea tu carpeta privada")).not.toBeNull();

    // Contrato nuevo de UI-07: ya no es una página pendiente.
    expect(screen.queryByText(paginaPendiente)).toBeNull();
  });

  for (const { modulo, Page } of RUTAS) {
    it(`${modulo}: un solo h1 con el nombre del módulo y estado pendiente honesto`, () => {
      render(<Page />);

      const h1 = screen.getAllByRole("heading", { level: 1 });
      expect(h1).toHaveLength(1);
      expect(h1[0]?.textContent).toContain(modulo);

      expect(screen.getByText(paginaPendiente)).not.toBeNull();
    });
  }
});
