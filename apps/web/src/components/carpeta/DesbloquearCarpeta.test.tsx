import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { WrongPasswordError } from "@letra-grande/vault";

const mocks = vi.hoisted(() => ({
  estado: { valor: "cerrada" },
  desbloquear: vi.fn(),
  bloquear: vi.fn(),
  alCrear: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("./sesion", () => ({
  sesionCarpeta: {
    consultar: () => mocks.estado.valor,
    obtenerVault: () => null,
    crear: vi.fn(),
    desbloquear: mocks.desbloquear,
    bloquear: mocks.bloquear,
    suscribirse: () => () => undefined,
  },
  useSesionCarpeta: () => mocks.estado.valor,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

import { DesbloquearCarpeta } from "./DesbloquearCarpeta";

// Pantalla de desbloqueo (UI-07, S2). Contraseñas ficticias.
const CLAVE = "frase-larga-de-prueba";

function botonDesbloquear(): HTMLButtonElement {
  return screen.getByRole("button", { name: "Desbloquear" }) as HTMLButtonElement;
}

describe("DesbloquearCarpeta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.estado.valor = "cerrada";
  });

  it("pide la contraseña con el botón deshabilitado hasta escribirla", () => {
    render(<DesbloquearCarpeta />);

    expect(screen.getByRole("heading", { name: "Desbloquea tu carpeta" })).not.toBeNull();
    expect(botonDesbloquear().hasAttribute("disabled")).toBe(true);

    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: CLAVE } });

    expect(botonDesbloquear().hasAttribute("disabled")).toBe(false);
  });

  it("con contraseña incorrecta muestra el error honesto y no abre", async () => {
    mocks.desbloquear.mockRejectedValue(new WrongPasswordError());
    render(<DesbloquearCarpeta />);
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: CLAVE } });

    fireEvent.click(botonDesbloquear());

    await waitFor(() => {
      expect(screen.getByText("La contraseña no es correcta.")).not.toBeNull();
    });
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("al desbloquear entra en la ruta solicitada", async () => {
    mocks.desbloquear.mockResolvedValue(undefined);
    render(<DesbloquearCarpeta destino="/hoy" />);
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: CLAVE } });

    fireEvent.click(botonDesbloquear());

    await waitFor(() => {
      expect(mocks.desbloquear).toHaveBeenCalledWith(CLAVE);
      expect(mocks.replace).toHaveBeenCalledWith("/hoy");
    });
  });

  it("sin carpeta creada avisa y no intenta abrir ningún vault", async () => {
    mocks.estado.valor = "no-creada";
    render(<DesbloquearCarpeta />);
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: CLAVE } });

    fireEvent.click(botonDesbloquear());

    await waitFor(() => {
      expect(screen.getByText(/Todavía no hay ninguna carpeta/)).not.toBeNull();
    });
    expect(mocks.desbloquear).not.toHaveBeenCalled();
  });

  it("el enlace lleva a crear una carpeta", () => {
    render(<DesbloquearCarpeta alCrear={mocks.alCrear} />);

    fireEvent.click(screen.getByRole("button", { name: "No tengo carpeta todavía: crear una" }));

    expect(mocks.alCrear).toHaveBeenCalledTimes(1);
  });
});
