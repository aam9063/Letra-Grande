import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  estado: { valor: "no-creada" },
  oyentes: new Set<(estado: string) => void>(),
  crear: vi.fn(),
  desbloquear: vi.fn(),
  bloquear: vi.fn(),
}));

vi.mock("./sesion", async () => {
  const { useEffect, useState } = await import("react");

  const sesionFalsa = {
    consultar: () => mocks.estado.valor,
    obtenerVault: () => null,
    crear: mocks.crear,
    desbloquear: mocks.desbloquear,
    bloquear: mocks.bloquear,
    suscribirse: (fn: (estado: string) => void) => {
      mocks.oyentes.add(fn);
      return () => {
        mocks.oyentes.delete(fn);
      };
    },
  };

  return {
    sesionCarpeta: sesionFalsa,
    // Igual que el hook real: estado inicial, lectura al montar y
    // suscripción a los cambios de la sesión.
    useSesionCarpeta: () => {
      const [estado, setEstado] = useState(mocks.estado.valor);
      useEffect(() => {
        setEstado(mocks.estado.valor);
        return sesionFalsa.suscribirse(setEstado);
      }, []);
      return estado;
    },
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

import { VistaCarpeta } from "./VistaCarpeta";

// Vista de la página Carpeta (UI-07): crea, desbloquea o muestra la sesión
// abierta según el estado de la sesión compartida.
describe("VistaCarpeta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.oyentes.clear();
    mocks.estado.valor = "no-creada";
  });

  it("sin carpeta creada muestra la pantalla de creación", () => {
    render(<VistaCarpeta />);

    expect(screen.getByRole("heading", { name: "Crea tu carpeta privada" })).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Carpeta" })).not.toBeNull();
  });

  it("con la carpeta cerrada muestra la pantalla de desbloqueo", () => {
    mocks.estado.valor = "cerrada";
    render(<VistaCarpeta />);

    expect(screen.getByRole("heading", { name: "Desbloquea tu carpeta" })).not.toBeNull();
  });

  it("con la sesión abierta muestra el estado y el botón Bloquear cierra la sesión", () => {
    mocks.estado.valor = "abierta";
    render(<VistaCarpeta />);

    expect(screen.getByRole("heading", { name: "Tu carpeta está abierta" })).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Bloquear" }));

    expect(mocks.bloquear).toHaveBeenCalledTimes(1);
  });

  it("reacciona a los cambios de estado de la sesión compartida", () => {
    mocks.estado.valor = "no-creada";
    render(<VistaCarpeta />);

    mocks.estado.valor = "abierta";
    act(() => {
      for (const oyente of mocks.oyentes) {
        oyente("abierta");
      }
    });

    expect(screen.getByRole("heading", { name: "Tu carpeta está abierta" })).not.toBeNull();
  });
});
