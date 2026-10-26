import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePathname } from "next/navigation";
import RootLayout from "../../app/layout";

vi.mock("next/navigation", () => ({ usePathname: vi.fn(() => "/") }));

describe("RootLayout", () => {
  it("muestra el aviso de independencia en el layout, visible desde cualquier ruta", () => {
    render(
      <RootLayout>
        <p>contenido de prueba</p>
      </RootLayout>,
    );

    const aviso = screen.getByText(/proyecto independiente, sin vinculación con ninguna empresa/);

    expect(aviso).not.toBeNull();
    expect(screen.getByRole("navigation", { name: "Secciones" })).not.toBeNull();
  });
});
