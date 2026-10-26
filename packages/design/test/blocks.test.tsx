import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BlockRenderer } from "../src/blocks/BlockRenderer";
import type { BlockData } from "../src/blocks/types";

const cita = [{ sourceId: "boe-ley-ejemplo", quote: "el plazo es de 30 dias" }];

const fuentes = {
  "boe-ley-ejemplo": { titulo: "Ley de ejemplo (BOE)", url: "https://www.boes.ejemplo/ley" },
};

const bloques: BlockData[] = [
  { kind: "step", n: 1, claim: "Rellena el formulario de reclamación.", citations: cita },
  { kind: "step", n: 2, claim: "Envíalo por la sede electrónica.", citations: cita },
  { kind: "document", claim: "Necesitas una factura reciente.", citations: cita },
  { kind: "cost", claim: "La reclamación es gratuita.", citations: cita },
  {
    kind: "deadline",
    deadlineId: "plazo-respuesta-ejemplo",
    claim: "Tienes 30 días para responder.",
    citations: cita,
  },
  { kind: "warning", claim: "No interrumpas el plazo reclamando por otra vía.", citations: cita },
  { kind: "fact", claim: "La hoja de reclamaciones es un derecho.", citations: cita },
];

describe("bloques de respuesta, uno por kind", () => {
  it.each(bloques)("renderiza el claim y la cita visible de un bloque $kind", (bloque) => {
    render(<BlockRenderer blocks={[bloque]} />);
    expect(screen.getByText(bloque.claim)).toBeTruthy();
    // La cita nombra la fuente con texto, no solo con un icono.
    expect(screen.getByText(/Fuente:/)).toBeTruthy();
    expect(screen.getByText("boe-ley-ejemplo")).toBeTruthy();
  });

  it("muestra el número del paso de forma visible, en un solo elemento", () => {
    render(<BlockRenderer blocks={[{ kind: "step", n: 2, claim: "Segundo paso.", citations: cita }]} />);
    expect(screen.getByText("Paso 2")).toBeTruthy();
  });

  it("muestra la cita textual cuando la hay", () => {
    render(
      <BlockRenderer
        blocks={[{ kind: "fact", claim: "Un dato.", citations: [{ sourceId: "fuente-x", quote: "texto literal" }] }]}
      />,
    );
    expect(screen.getByText(/texto literal/)).toBeTruthy();
  });

  it("muestra el deadlineId asociado cuando existe", () => {
    render(
      <BlockRenderer
        blocks={[{ kind: "deadline", deadlineId: "plazo-ejemplo", claim: "Un plazo.", citations: cita }]}
      />,
    );
    expect(screen.getByText(/plazo-ejemplo/)).toBeTruthy();
  });

  it("renderiza una respuesta completa con varios bloques", () => {
    render(<BlockRenderer blocks={bloques} />);
    expect(screen.getAllByText(/Fuente:/)).toHaveLength(bloques.length);
  });

  it("con fuentes conocidas convierte la cita en enlace con título humano", () => {
    render(
      <BlockRenderer
        blocks={[{ kind: "fact", claim: "Un dato.", citations: [{ sourceId: "boe-ley-ejemplo", quote: "texto" }] }]}
        fuentes={fuentes}
      />,
    );
    const enlace = screen.getByRole("link", { name: "Ley de ejemplo (BOE)" });
    expect(enlace.getAttribute("href")).toBe("https://www.boes.ejemplo/ley");
    expect(screen.getByText(/Fuente:/)).toBeTruthy();
  });

  it("sin fuentes conocidas mantiene el texto visible de la fuente", () => {
    render(<BlockRenderer blocks={[{ kind: "fact", claim: "Un dato.", citations: cita }]} />);
    expect(screen.getByText("boe-ley-ejemplo")).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("con fuentes conocidas mantiene el texto visible si el sourceId no está en el catálogo", () => {
    render(
      <BlockRenderer
        blocks={[{ kind: "fact", claim: "Un dato.", citations: cita }]}
        fuentes={{ "otra-fuente": { titulo: "Otra fuente", url: "https://otra.ejemplo" } }}
      />,
    );
    expect(screen.getByText("boe-ley-ejemplo")).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("nunca interpreta el texto como HTML", () => {
    const { container } = render(
      <BlockRenderer
        blocks={[{ kind: "fact", claim: "Texto con <script>alert(1)</script> dentro.", citations: cita }]}
      />,
    );
    expect(container.querySelector("script")).toBeNull();
    expect(screen.getByText(/<script>alert\(1\)<\/script>/)).toBeTruthy();
  });
});
