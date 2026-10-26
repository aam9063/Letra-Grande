import { describe, expect, it } from "vitest";
import {
  destinos,
  destinosExtra,
  destinosPrincipales,
  modulosSidebar,
} from "./destinos";

// Contrato del shell responsive (UI-04): cuatro destinos principales en la
// barra móvil, el resto en la hoja «Más» y en el grupo «Más módulos» de la
// sidebar de escritorio (Escritorio.dc.html).
describe("estructura de destinos", () => {
  it("los destinos principales son Hoy, Asistente, Carpeta y Reclamar y bajas", () => {
    expect(destinosPrincipales.map((d) => d.nombre)).toEqual([
      "Hoy",
      "Asistente",
      "Carpeta",
      "Reclamar y bajas",
    ]);
  });

  it("los destinos de la hoja Más son los cuatro módulos restantes", () => {
    expect(destinosExtra.map((d) => d.nombre)).toEqual([
      "Cambios de vida",
      "Ayudas",
      "Datos abiertos",
      "Familia",
    ]);
  });

  it("la lista completa es principales seguido de extra, sin rutas repetidas", () => {
    expect(destinos).toEqual([...destinosPrincipales, ...destinosExtra]);
    const rutas = destinos.map((d) => d.href);
    expect(new Set(rutas).size).toBe(rutas.length);
    expect(rutas.every((r) => r.startsWith("/"))).toBe(true);
  });

  it("el grupo Más módulos de la sidebar tiene las seis entradas del diseño", () => {
    expect(modulosSidebar.map((m) => m.nombre)).toEqual([
      "Factura de luz",
      "Cambios de vida",
      "Ayudas",
      "Suscripciones",
      "Datos abiertos",
      "Familia",
    ]);
  });

  it("cada módulo de la sidebar apunta a su ruta o está marcado como próximo", () => {
    for (const modulo of modulosSidebar) {
      if (modulo.href) {
        expect(modulo.pendiente).toBeUndefined();
        expect(modulo.href).toMatch(/^\//);
      } else {
        expect(modulo.pendiente).toBe(true);
      }
    }
    expect(modulosSidebar.find((m) => m.nombre === "Factura de luz")?.pendiente).toBe(true);
    expect(modulosSidebar.find((m) => m.nombre === "Suscripciones")?.pendiente).toBe(true);
    expect(modulosSidebar.find((m) => m.nombre === "Ayudas")?.href).toBe("/ayudas");
  });
});
