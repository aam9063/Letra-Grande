import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { WrongPasswordError } from "@letra-grande/vault";
import { CLAVE_TAMANO } from "./tamano-letra";

const purgarTodo = vi.fn();
vi.mock("./borrado", () => ({ purgarTodo: (clave: string) => purgarTodo(clave) }));

import { BorradoTotal } from "./BorradoTotal";

// Confirmación del borrado total (UI-06, S2): nunca se ejecuta sin
// confirmación con contraseña. Contraseñas y datos ficticios.
const CLAVE = "clave-ficticia";

function abrirConfirmacion(): void {
  fireEvent.click(screen.getByRole("button", { name: "Borrar todos mis datos" }));
}

describe("BorradoTotal", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.style.fontSize = "";
    purgarTodo.mockReset();
  });

  it("al principio solo muestra el botón, sin confirmación abierta", () => {
    render(<BorradoTotal />);

    expect(screen.getByRole("button", { name: "Borrar todos mis datos" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Borrar todo definitivamente" })).toBeNull();
  });

  it("la confirmación pide la contraseña con el aviso Importante y el botón deshabilitado", () => {
    render(<BorradoTotal />);
    abrirConfirmacion();

    expect(screen.getByText("Importante")).toBeDefined();
    expect(screen.getByLabelText("Contraseña de la carpeta")).toBeDefined();
    const boton = screen.getByRole("button", { name: "Borrar todo definitivamente" });
    expect(boton.hasAttribute("disabled")).toBe(true);
  });

  it("el botón se habilita al escribir la contraseña y llama a purgarTodo", async () => {
    purgarTodo.mockResolvedValue(undefined);
    render(<BorradoTotal />);
    abrirConfirmacion();

    const campo = screen.getByLabelText("Contraseña de la carpeta");
    fireEvent.change(campo, { target: { value: CLAVE } });

    const boton = screen.getByRole("button", { name: "Borrar todo definitivamente" });
    expect(boton.hasAttribute("disabled")).toBe(false);
    fireEvent.click(boton);

    await waitFor(() => {
      expect(purgarTodo).toHaveBeenCalledWith(CLAVE);
    });
  });

  it("tras borrar muestra éxito y los ajustes de tamaño vuelven a Normal", async () => {
    purgarTodo.mockResolvedValue(undefined);
    localStorage.setItem(CLAVE_TAMANO, "grande");
    document.documentElement.style.fontSize = "112.5%";
    render(<BorradoTotal />);
    abrirConfirmacion();
    fireEvent.change(screen.getByLabelText("Contraseña de la carpeta"), {
      target: { value: CLAVE },
    });
    fireEvent.click(screen.getByRole("button", { name: "Borrar todo definitivamente" }));

    await waitFor(() => {
      expect(screen.getByText("Datos borrados")).toBeDefined();
    });
    expect(localStorage.getItem(CLAVE_TAMANO)).toBeNull();
    expect(document.documentElement.style.fontSize).toBe("100%");
  });

  it("con contraseña incorrecta muestra el mensaje del error y nada se borra", async () => {
    purgarTodo.mockRejectedValue(new WrongPasswordError());
    render(<BorradoTotal />);
    abrirConfirmacion();
    fireEvent.change(screen.getByLabelText("Contraseña de la carpeta"), {
      target: { value: CLAVE },
    });
    fireEvent.click(screen.getByRole("button", { name: "Borrar todo definitivamente" }));

    await waitFor(() => {
      expect(screen.getByText("La contraseña no es correcta.")).toBeDefined();
    });
    expect(screen.queryByText("Datos borrados")).toBeNull();
  });
});
