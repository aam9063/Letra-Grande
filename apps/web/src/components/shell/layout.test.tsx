import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePathname } from "next/navigation";
import AppLayout from "../../app/(app)/layout";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/hoy"),
  useRouter: vi.fn(() => ({ replace: vi.fn() })),
}));

describe("AppLayout", () => {
  it("muestra el aviso de independencia en el layout de la app, visible desde cualquier ruta", () => {
    render(
      <AppLayout>
        <p>contenido de prueba</p>
      </AppLayout>,
    );

    const aviso = screen.getByText(/proyecto independiente, sin vinculación con ninguna empresa/);

    expect(aviso).not.toBeNull();
    expect(screen.getByRole("navigation", { name: "Secciones" })).not.toBeNull();
  });
});
