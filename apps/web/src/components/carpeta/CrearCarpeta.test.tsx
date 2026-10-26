import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { WrongPasswordError } from "@letra-grande/vault";

const mocks = vi.hoisted(() => ({
  crear: vi.fn(),
  desbloquear: vi.fn(),
  bloquear: vi.fn(),
  alDesbloquear: vi.fn(),
}));

vi.mock("./sesion", () => ({
  sesionCarpeta: {
    consultar: () => "no-creada",
    obtenerVault: () => null,
    crear: mocks.crear,
    desbloquear: mocks.desbloquear,
    bloquear: mocks.bloquear,
    suscribirse: () => () => undefined,
  },
  useSesionCarpeta: () => "no-creada",
}));

import { CrearCarpeta } from "./CrearCarpeta";

// Pantalla «Crea tu carpeta privada» (UI-07, S1). Contraseñas ficticias.
const CLAVE = "frase-larga-de-prueba";

function rellenar(clave: string = CLAVE, repetir: string = clave): void {
  fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: clave } });
  fireEvent.change(screen.getByLabelText("Repite la contraseña"), {
    target: { value: repetir },
  });
}

function botonCrear(): HTMLButtonElement {
  return screen.getByRole("button", { name: "Crear carpeta" }) as HTMLButtonElement;
}

describe("CrearCarpeta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra el texto, las garantías y el aviso Importante del diseño", () => {
    render(<CrearCarpeta alDesbloquear={mocks.alDesbloquear} />);

    expect(screen.getByRole("heading", { name: "Crea tu carpeta privada" })).not.toBeNull();
    expect(
      screen.getByText("Aquí guardarás tus facturas, contratos y cartas. Solo tú podrás abrirla."),
    ).not.toBeNull();
    expect(screen.getByText("Se guarda cifrada, solo en este dispositivo")).not.toBeNull();
    expect(screen.getByText("Tus documentos no se suben a ningún servidor")).not.toBeNull();
    expect(screen.getByText("Funciona también sin conexión")).not.toBeNull();
    expect(screen.getByText("Importante")).not.toBeNull();
    expect(
      screen.getByText("Si olvidas la contraseña, no podemos recuperar tu carpeta. Apúntala en un lugar seguro."),
    ).not.toBeNull();
    expect(screen.getByText("Buena. Una frase larga es más segura que una palabra rara.")).not.toBeNull();
  });

  it("el enlace «Ya tengo una carpeta: desbloquear» lleva a desbloquear", () => {
    render(<CrearCarpeta alDesbloquear={mocks.alDesbloquear} />);

    fireEvent.click(screen.getByRole("button", { name: "Ya tengo una carpeta: desbloquear" }));

    expect(mocks.alDesbloquear).toHaveBeenCalledTimes(1);
  });

  it("la casilla de recuperación es obligatoria para activar el botón", () => {
    render(<CrearCarpeta />);
    rellenar();

    expect(botonCrear().hasAttribute("disabled")).toBe(true);

    fireEvent.click(screen.getByLabelText("Entiendo que no se puede recuperar"));

    expect(botonCrear().hasAttribute("disabled")).toBe(false);
  });

  it("con contraseñas distintas avisa y no crea nada", () => {
    render(<CrearCarpeta />);
    rellenar(CLAVE, "otra-clave-distinta");
    fireEvent.click(screen.getByLabelText("Entiendo que no se puede recuperar"));

    fireEvent.click(botonCrear());

    expect(screen.getByText(/no coinciden/)).not.toBeNull();
    expect(mocks.crear).not.toHaveBeenCalled();
  });

  it("crea la carpeta con openVault al enviar contraseñas iguales", async () => {
    mocks.crear.mockResolvedValue(undefined);
    render(<CrearCarpeta />);
    rellenar();
    fireEvent.click(screen.getByLabelText("Entiendo que no se puede recuperar"));

    fireEvent.click(botonCrear());

    await waitFor(() => {
      expect(mocks.crear).toHaveBeenCalledWith(CLAVE);
    });
  });

  it("si crear falla con contraseña incorrecta muestra el mensaje del error", async () => {
    mocks.crear.mockRejectedValue(new WrongPasswordError());
    render(<CrearCarpeta />);
    rellenar();
    fireEvent.click(screen.getByLabelText("Entiendo que no se puede recuperar"));

    fireEvent.click(botonCrear());

    await waitFor(() => {
      expect(screen.getByText("La contraseña no es correcta.")).not.toBeNull();
    });
  });

  it("el botón Mostrar enseña la contraseña mientras esté activo", () => {
    render(<CrearCarpeta />);

    const campo = screen.getByLabelText("Contraseña") as HTMLInputElement;
    expect(campo.type).toBe("password");

    fireEvent.click(screen.getByRole("button", { name: "Mostrar" }));
    expect(campo.type).toBe("text");

    fireEvent.click(screen.getByRole("button", { name: "Ocultar" }));
    expect(campo.type).toBe("password");
  });
});
