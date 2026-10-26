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
const RUTAS: Array<{ modulo: string; Page: () => ReactElement }> = [
  { modulo: "Hoy", Page: HoyPage },
  { modulo: "Asistente", Page: AsistentePage },
  { modulo: "Carpeta", Page: CarpetaPage },
  { modulo: "Reclamar y bajas", Page: ReclamarPage },
  { modulo: "Vida", Page: VidaPage },
  { modulo: "Ayudas", Page: AyudasPage },
  { modulo: "Datos", Page: DatosPage },
  { modulo: "Familia", Page: FamiliaPage },
];

describe("rutas de módulo", () => {
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
