import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePathname } from "next/navigation";
import { BottomNav } from "./BottomNav";
import { destinos } from "./destinos";

vi.mock("next/navigation", () => ({ usePathname: vi.fn(() => "/") }));

const rutaActual = vi.mocked(usePathname);

beforeEach(() => {
  rutaActual.mockReturnValue("/");
});

describe("BottomNav", () => {
  it("expone los ocho destinos dentro de un landmark de navegación", () => {
    render(<BottomNav />);

    const nav = screen.getByRole("navigation", { name: "Secciones" });
    const enlaces = within(nav).getAllByRole("link");

    expect(enlaces).toHaveLength(8);
    expect(
      enlaces.map((enlace) => ({ href: enlace.getAttribute("href"), nombre: enlace.textContent })),
    ).toEqual(destinos.map((d) => ({ href: d.href, nombre: d.nombre })));
  });

  it("marca la página actual con aria-current y las demás no", () => {
    rutaActual.mockReturnValue("/carpeta");
    render(<BottomNav />);

    const nav = screen.getByRole("navigation", { name: "Secciones" });

    expect(within(nav).getByRole("link", { name: "Carpeta" }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(within(nav).getByRole("link", { name: "Hoy" }).getAttribute("aria-current")).toBeNull();
    expect(
      within(nav).getByRole("link", { name: "Familia" }).getAttribute("aria-current"),
    ).toBeNull();
  });

  it("cada destino cumple el objetivo táctil de 44 px", () => {
    render(<BottomNav />);

    const nav = screen.getByRole("navigation", { name: "Secciones" });

    for (const enlace of within(nav).getAllByRole("link")) {
      expect(enlace.style.minWidth).toBe("var(--lg-objetivo)");
      expect(enlace.style.minHeight).toBe("var(--lg-objetivo)");
    }
  });

  it("el token del objetivo táctil vale 44 px en la hoja de estilos de la app", () => {
    const css = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "..", "..", "app", "globals.css"),
      "utf8",
    );

    expect(css).toContain("--lg-objetivo: 44px");
  });
});
