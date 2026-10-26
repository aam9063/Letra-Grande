import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePathname } from "next/navigation";
import { BottomNav } from "./BottomNav";
import { destinosExtra, destinosPrincipales } from "./destinos";

vi.mock("next/navigation", () => ({ usePathname: vi.fn(() => "/") }));

const rutaActual = vi.mocked(usePathname);

// Barra móvil flotante (UI-04): cuatro destinos principales con icono, y un
// quinto botón «Más» (tres puntos) que abre la hoja con el resto de módulos.
describe("BottomNav", () => {
  it("expone los cuatro destinos principales y el botón Más", () => {
    render(<BottomNav />);

    const nav = screen.getByRole("navigation", { name: "Secciones" });
    const enlaces = Array.from(nav.querySelectorAll("a"));
    expect(enlaces.map((a) => a.getAttribute("href"))).toEqual(
      destinosPrincipales.map((d) => d.href),
    );
    expect(screen.getByRole("button", { name: "Más" })).not.toBeNull();
  });

  it("marca la página actual con aria-current y las demás no", () => {
    rutaActual.mockReturnValue("/carpeta");
    render(<BottomNav />);

    const nav = screen.getByRole("navigation", { name: "Secciones" });
    expect(
      nav.querySelector('a[href="/carpeta"]')?.getAttribute("aria-current"),
    ).toBe("page");
    expect(nav.querySelector('a[href="/hoy"]')?.getAttribute("aria-current")).toBeNull();
  });

  it("el botón Más abre una hoja modal con los módulos restantes y Ajustes", async () => {
    render(<BottomNav />);

    fireEvent.click(screen.getByRole("button", { name: "Más" }));

    const hoja = screen.getByRole("dialog", { name: "Más módulos" });
    const rutas = Array.from(hoja.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(rutas).toEqual([...destinosExtra.map((d) => d.href), "/ajustes"]);
  });

  it("marca en la hoja el módulo activo y la cierra con Escape devolviendo el foco", async () => {
    rutaActual.mockReturnValue("/ayudas");
    render(<BottomNav />);

    const boton = screen.getByRole("button", { name: "Más" });
    fireEvent.click(boton);

    const hoja = screen.getByRole("dialog", { name: "Más módulos" });
    expect(hoja.querySelector('a[href="/ayudas"]')?.getAttribute("aria-current")).toBe("page");

    fireEvent.keyDown(screen.getByRole("dialog", { name: "Más módulos" }), { key: "Escape" });
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(boton);
  });
});
