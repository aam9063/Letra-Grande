import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { destinosPrincipales, modulosSidebar } from "./destinos";

vi.mock("next/navigation", () => ({ usePathname: vi.fn(() => "/hoy") }));

// Sidebar de escritorio según Escritorio.dc.html: nav principal con la página
// marcada, grupo «Más módulos» con pendientes honestos, estado de la carpeta
// y salida a Ajustes.
describe("Sidebar", () => {
  it("expone la nav principal con los cuatro destinos y marca /hoy", () => {
    render(<Sidebar />);

    const nav = screen.getByRole("navigation", { name: "Principal" });
    const enlaces = Array.from(nav.querySelectorAll("a"));
    expect(enlaces.map((a) => a.getAttribute("href"))).toEqual(
      destinosPrincipales.map((d) => d.href),
    );
    expect(
      enlaces.find((a) => a.getAttribute("href") === "/hoy")?.getAttribute("aria-current"),
    ).toBe("page");
  });

  it("muestra los seis módulos del diseño; los pendientes no son enlaces", () => {
    render(<Sidebar />);

    const nav = screen.getByRole("navigation", { name: "Módulos" });
    const textos = Array.from(nav.querySelectorAll("a, span")).map((e) => e.textContent);
    for (const modulo of modulosSidebar) {
      expect(textos.some((t) => t?.includes(modulo.nombre))).toBe(true);
    }
    // Pendientes: texto, nunca enlaces que no llevan a ninguna parte.
    expect(nav.querySelectorAll('a[href=""]')).toHaveLength(0);
    expect(screen.getAllByText("Próximamente")).toHaveLength(2);
  });

  it("anuncia la carpeta cifrada y enlaza Ajustes", () => {
    render(<Sidebar />);

    expect(screen.getByText(/Todo se guarda solo en este dispositivo/)).not.toBeNull();
    expect(screen.getByRole("link", { name: "Ajustes" }).getAttribute("href")).toBe("/ajustes");
  });
});
