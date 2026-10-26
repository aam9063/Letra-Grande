// Tests de render del bloque de respuesta del asistente (AI-02) con jsdom.
// Comprueba el catálogo cerrado: cada kind tiene su componente, las citas se
// enlazan con el título de la fuente, el texto con marcado se pinta como texto
// y outOfScope tiene un estado vacío explicado y honesto.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { Block, AssistantAnswer } from "@letra-grande/schema";
import type { Fuentes } from "@letra-grande/design";
import { AssistantAnswerView } from "./AssistantAnswerView";

const FUENTES: Fuentes = {
  "factura-luz": { titulo: "Factura de luz explicada", url: "https://example.com/factura-luz" },
};

const CITA = [{ sourceId: "factura-luz", quote: "El plazo es de 30 días." }];

function renderAnswer(blocks: Block[]) {
  const answer: AssistantAnswer = {
    question: "¿Pregunta de prueba?",
    outOfScope: false,
    blocks,
  };
  return render(<AssistantAnswerView answer={answer} fuentes={FUENTES} />);
}

function bloqueBasico(kind: Block["kind"], claim: string): Block {
  if (kind === "step") return { kind, n: 1, claim, citations: CITA };
  return { kind, claim, citations: CITA } as Block;
}

afterEach(() => {
  cleanup();
});

describe("AssistantAnswerView", () => {
  it("pinta un bloque step con su número visible", () => {
    renderAnswer([bloqueBasico("step", "Reclama por escrito.")]);
    expect(screen.getByText("Paso 1")).toBeTruthy();
    expect(screen.getByText("Reclama por escrito.")).toBeTruthy();
  });

  it("pinta un bloque document", () => {
    renderAnswer([bloqueBasico("document", "Revisa la factura detallada.")]);
    expect(screen.getByText("Documento")).toBeTruthy();
    expect(screen.getByText("Revisa la factura detallada.")).toBeTruthy();
  });

  it("pinta un bloque cost", () => {
    renderAnswer([bloqueBasico("cost", "La reclamación es gratuita.")]);
    expect(screen.getByText("Coste")).toBeTruthy();
    expect(screen.getByText("La reclamación es gratuita.")).toBeTruthy();
  });

  it("pinta un bloque deadline", () => {
    renderAnswer([bloqueBasico("deadline", "El plazo es de 30 días.")]);
    expect(screen.getByText("Plazo")).toBeTruthy();
    expect(screen.getByText("El plazo es de 30 días.")).toBeTruthy();
  });

  it("pinta un bloque warning", () => {
    renderAnswer([bloqueBasico("warning", "No dejes pasar el plazo.")]);
    expect(screen.getByText("Aviso")).toBeTruthy();
    expect(screen.getByText("No dejes pasar el plazo.")).toBeTruthy();
  });

  it("pinta un bloque fact", () => {
    renderAnswer([bloqueBasico("fact", "El plazo de reclamación es de 30 días.")]);
    expect(screen.getByText("Dato")).toBeTruthy();
    expect(screen.getByText("El plazo de reclamación es de 30 días.")).toBeTruthy();
  });

  it("enlaza la cita con el título de la fuente del catálogo", () => {
    renderAnswer([bloqueBasico("fact", "El plazo es de 30 días.")]);
    const enlace = screen.getByRole("link", { name: "Factura de luz explicada" });
    expect(enlace.getAttribute("href")).toBe("https://example.com/factura-luz");
    expect(screen.getByText(/Fuente:/)).toBeTruthy();
  });

  it("pinta un claim con HTML como texto plano, sin interpretar el marcado", () => {
    const { container } = renderAnswer([
      {
        kind: "fact",
        claim: "La ficha indica <b>negrita</b> y <script>alert(1)</script>.",
        citations: CITA,
      },
    ]);
    expect(container.querySelector("b")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
    expect(container.textContent).toContain("<b>negrita</b>");
    expect(container.textContent).toContain("<script>alert(1)</script>");
  });

  it("pinta outOfScope con un estado vacío explicado y honesto", () => {
    const answer: AssistantAnswer = {
      question: "¿Pregunta de prueba?",
      outOfScope: true,
      blocks: [],
    };
    render(<AssistantAnswerView answer={answer} fuentes={FUENTES} />);
    expect(screen.getByText(/No tengo una fuente para responder/)).toBeTruthy();
    expect(screen.getByText(/oficina municipal de consumo/)).toBeTruthy();
    expect(screen.queryAllByText(/Fuente:/)).toHaveLength(0);
  });
});
