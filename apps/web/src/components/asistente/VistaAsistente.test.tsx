// VistaAsistente (AI-03): la pantalla del asistente. Los tests comprueban el
// contrato completo desde la interfaz: la pregunta sale enmascarada del
// navegador (invariante de privacidad del proyecto), la respuesta se pinta con
// los bloques del catálogo cerrado y su cita, outOfScope tiene un estado vacío
// honesto y cada error del endpoint se traduce a un texto que dice qué pasó y
// qué puede hacer la persona. Todos los datos son ficticios.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AssistantAnswer } from "@letra-grande/schema";
import { VistaAsistente } from "./VistaAsistente";

type FetchMock = ReturnType<typeof vi.fn>;

let fetchMock: FetchMock;

const FUENTES = {
  "cnmc-electrico": {
    titulo: "Comercialización y suministro eléctrico | CNMC",
    url: "https://www.cnmc.es/facil-para-ti/que-hace-la-cnmc-para-consumidores/comercializacion-y-suministro-electrico",
  },
};

const BLOQUE = {
  kind: "fact",
  claim: "La empresa tiene que contestar en un máximo de quince días hábiles.",
  citations: [{ sourceId: "cnmc-electrico", quote: "quince días hábiles" }],
};

function respuestaOk(answer: Partial<AssistantAnswer> = {}): {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
} {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      answer: {
        question: "¿Pregunta?",
        outOfScope: false,
        blocks: [BLOQUE],
        ...answer,
      },
      fuentes: FUENTES,
    }),
  };
}

function respuestaError(status: number, code: string): {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
} {
  return {
    ok: false,
    status,
    json: async () => ({ error: { code, message: "Mensaje técnico del servidor." } }),
  };
}

function escribirPregunta(texto: string): void {
  fireEvent.change(screen.getByLabelText("Tu pregunta"), { target: { value: texto } });
}

async function enviar(texto: string): Promise<void> {
  escribirPregunta(texto);
  fireEvent.click(screen.getByRole("button", { name: "Enviar pregunta" }));
}

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("VistaAsistente", () => {
  it("envía la pregunta enmascarada y pinta los bloques con su cita", async () => {
    fetchMock.mockResolvedValue(respuestaOk());
    render(<VistaAsistente />);

    await enviar("Mi DNI es 12345678Z, ¿en cuántos días me deben contestar?");

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/assistant");
    expect(init.method).toBe("POST");
    const cuerpo = JSON.parse(String(init.body)) as { question: string };
    // El DNI no sale del dispositivo: viaja el marcador del mask().
    expect(cuerpo.question).toContain("{{documento_1}}");
    expect(cuerpo.question).not.toContain("12345678Z");

    // La respuesta se pinta con los bloques del catálogo y su cita enlazada.
    await screen.findByText("La empresa tiene que contestar en un máximo de quince días hábiles.");
    const cita = screen.getByRole("link", { name: "Comercialización y suministro eléctrico | CNMC" });
    expect(cita.getAttribute("href")).toBe(FUENTES["cnmc-electrico"].url);
    expect(screen.getByText(/Fuente:/)).toBeTruthy();
  });

  it("muestra en la lista la pregunta escrita y la respuesta del asistente", async () => {
    fetchMock.mockResolvedValue(respuestaOk());
    render(<VistaAsistente />);

    await enviar("¿Cómo reclamo una factura?");

    await screen.findByText("¿Cómo reclamo una factura?");
    await screen.findByText("La empresa tiene que contestar en un máximo de quince días hábiles.");
  });

  it("outOfScope muestra el estado vacío honesto, sin bloques inventados", async () => {
    fetchMock.mockResolvedValue(respuestaOk({ outOfScope: true, blocks: [] }));
    render(<VistaAsistente />);

    await enviar("¿Quién ganará mi reclamación?");

    await screen.findByText(/No tengo una fuente para responder/);
    expect(screen.getByText(/oficina municipal de consumo/)).toBeTruthy();
    expect(screen.queryAllByText(/Fuente:/)).toHaveLength(0);
  });

  it.each([
    ["invalid_body", 400, "No se ha podido enviar la pregunta. Escríbela de nuevo y vuelve a intentarlo."],
    ["payload_too_large", 413, "La pregunta es demasiado larga. Acórtala y vuelve a intentarlo."],
    [
      "unmasked_data",
      422,
      "La pregunta contiene datos personales que no se han podido enmascarar. Quita el DNI, el teléfono o el correo y vuelve a intentarlo.",
    ],
    [
      "rate_limited",
      429,
      "Has alcanzado el límite de consultas de este momento. Espera unos minutos y vuelve a intentarlo.",
    ],
    [
      "service_unavailable",
      503,
      "El asistente no está disponible ahora mismo. Prueba de nuevo más tarde.",
    ],
  ])("traduce el error %s diciendo qué pasó y qué hacer", async (code, status, texto) => {
    fetchMock.mockResolvedValue(respuestaError(status, code as string));
    render(<VistaAsistente />);

    await enviar("¿Pregunta de prueba?");

    await screen.findByText(texto as string);
    // El mensaje técnico del servidor no se enseña tal cual.
    expect(screen.queryByText("Mensaje técnico del servidor.")).toBeNull();
  });

  it("si la red falla, explica qué pasó y qué puede hacer", async () => {
    fetchMock.mockRejectedValue(new TypeError("fallo de red"));
    render(<VistaAsistente />);

    await enviar("¿Pregunta de prueba?");

    await screen.findByText(
      "No se ha podido contactar con el asistente. Comprueba tu conexión y vuelve a intentarlo.",
    );
  });

  it("deshabilita el envío sin pregunta y mientras se espera la respuesta", async () => {
    let resolver: (valor: unknown) => void = () => undefined;
    fetchMock.mockReturnValue(
      new Promise((resolve) => {
        resolver = resolve;
      }),
    );
    render(<VistaAsistente />);

    const boton = screen.getByRole("button", { name: "Enviar pregunta" }) as HTMLButtonElement;
    expect(boton.hasAttribute("disabled")).toBe(true);

    escribirPregunta("¿Pregunta de prueba?");
    expect(boton.hasAttribute("disabled")).toBe(false);

    fireEvent.click(boton);
    await waitFor(() => {
      expect(boton.textContent).toBe("Enviando...");
      expect(boton.hasAttribute("disabled")).toBe(true);
    });

    resolver(respuestaOk());
    await screen.findByText("La empresa tiene que contestar en un máximo de quince días hábiles.");
    expect(boton.textContent).toBe("Enviar pregunta");
  });
});
