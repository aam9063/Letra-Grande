import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Callout, type CalloutTone } from "../src/Callout";

const casos: Array<{ tone: CalloutTone; role: string; etiqueta: string }> = [
  { tone: "info", role: "note", etiqueta: "Información" },
  { tone: "aviso", role: "note", etiqueta: "Aviso" },
  { tone: "peligro", role: "alert", etiqueta: "Peligro" },
  { tone: "exito", role: "status", etiqueta: "Hecho" },
];

describe("Callout", () => {
  it.each(casos)("tono $tone tiene role $role y etiqueta de texto visible", ({ tone, role, etiqueta }) => {
    render(<Callout tone={tone} title="Título de ejemplo">Cuerpo de ejemplo.</Callout>);
    expect(screen.getByRole(role)).toBeTruthy();
    // El tono nunca se comunica solo con color: hay etiqueta de texto visible.
    expect(screen.getByText(etiqueta)).toBeTruthy();
  });

  it("muestra el título y el cuerpo", () => {
    render(
      <Callout tone="info" title="Título de ejemplo">
        Cuerpo de ejemplo.
      </Callout>,
    );
    expect(screen.getByText("Título de ejemplo")).toBeTruthy();
    expect(screen.getByText("Cuerpo de ejemplo.")).toBeTruthy();
  });
});
