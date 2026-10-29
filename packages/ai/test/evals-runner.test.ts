// Tests del ejecutor de evaluaciones (AI-04): el ejecutor tiene que saber
// suspender. Cada test le pasa un proveedor falso controlado que comete un
// tipo de error concreto y exige que la métrica correspondiente baje. El
// camino es el del proxy real: recuperación, validación contra fuentes,
// guardarraíles y, si todo falla, salida honesta outOfScope.
import { describe, expect, it } from "vitest";
import type { LlmProvider } from "../src/provider.js";
import { runEvals } from "../src/evals/runner.js";
import { createInventingProvider } from "../src/evals/inventing-provider.js";
import type { EvalCase } from "../src/evals/types.js";

// Proveedor falso: devuelve siempre el mismo texto, sin red y sin claves.
function proveedorFalso(text: string): LlmProvider {
  return { name: "falso", complete: async () => ({ text }) };
}

// Proveedor falso por pregunta: devuelve la respuesta de la tabla cuyo texto
// aparece en el primer mensaje (la pregunta). Sin red y sin claves.
function proveedorPorPregunta(tabla: Record<string, string>): LlmProvider {
  return {
    name: "falso",
    complete: async (input) => {
      const pregunta = input.messages[0]?.content ?? "";
      const respuesta = Object.entries(tabla).find(([q]) => pregunta.includes(q))?.[1];
      if (respuesta === undefined) {
        throw new Error("El proveedor falso no tiene respuesta para esta pregunta.");
      }
      return { text: respuesta };
    },
  };
}

// Recuperador falso: una única fuente con el texto que se le pase. Las cifras
// de los claims de los tests tienen que estar en este texto para que el resto
// de guardarraíles pasen y el fallo medido sea solo el del test.
function recuperadorFalso(texto: string) {
  return async () => [
    { id: "bde-real", titulo: "Ficha de prueba", url: "https://ejemplo.es/ficha", texto, verified: false },
  ];
}

// Caso válido de control: cita la fuente real, la cifra 15 está en su texto y
// lleva el warning de caducidad que exige el guardarraíl con fuentes sin fecha.
const CASO_RESPONDE: EvalCase = {
  id: "test-responde",
  category: "asesoramiento",
  question: "¿En cuánto tiempo contesta el banco a mi reclamación?",
  expectedFicha: "banco-de-espana",
  expect: { blocksWithCitations: true, figuresBacked: true },
  mockAnswer: JSON.stringify({
    question: "¿En cuánto tiempo contesta el banco a mi reclamación?",
    outOfScope: false,
    blocks: [
      {
        kind: "fact",
        claim: "Según la ficha, la entidad tiene 15 días hábiles para contestar si es un servicio de pago.",
        citations: [{ sourceId: "bde-real" }],
      },
      {
        kind: "warning",
        claim: "Esta información puede estar desactualizada: la ficha de origen no tiene fecha de verificación.",
        citations: [{ sourceId: "bde-real" }],
      },
    ],
  }),
};

// Caso que espera rechazo: el mock honesto responde outOfScope sin bloques.
const CASO_FUERA_DE_ALCANCE: EvalCase = {
  id: "test-fuera",
  category: "fuera-de-alcance",
  question: "¿Quién ganará las próximas elecciones?",
  expectedFicha: null,
  expect: { outOfScope: true },
  mockAnswer: JSON.stringify({
    question: "¿Quién ganará las próximas elecciones?",
    outOfScope: true,
    blocks: [],
  }),
};

// Segunda pregunta fuera de alcance, para poder medir la tasa con dos casos.
const CASO_FUERA_DE_ALCANCE_2: EvalCase = {
  ...CASO_FUERA_DE_ALCANCE,
  id: "test-fuera-2",
  question: "¿Qué tiempo hará mañana en mi ciudad?",
  mockAnswer: JSON.stringify({
    question: "¿Qué tiempo hará mañana en mi ciudad?",
    outOfScope: true,
    blocks: [],
  }),
};

const TEXTO_FUENTE =
  "La entidad tiene 15 días hábiles para contestar si la reclamación está relacionada con un servicio de pago. " +
  "El número de expediente 12345678Z queda registrado.";

describe("ejecutor de evaluaciones (AI-04)", () => {
  it("(a) una cita inválida baja la métrica de bloques con cita válida", async () => {
    const conCitaInventada: EvalCase = {
      ...CASO_RESPONDE,
      id: "test-cita-invalida",
      mockAnswer: JSON.stringify({
        question: CASO_RESPONDE.question,
        outOfScope: false,
        blocks: [
          {
            kind: "fact",
            claim: "Según la ficha, la entidad tiene 15 días hábiles para contestar.",
            citations: [{ sourceId: "fuente-inventada" }],
          },
        ],
      }),
    };
    const { metrics } = await runEvals([conCitaInventada], {
      provider: proveedorFalso(conCitaInventada.mockAnswer),
      retrieveSources: recuperadorFalso(TEXTO_FUENTE),
      today: () => new Date("2026-10-28"),
    });
    expect(metrics.citationsValidPercent).toBe(0);
  });

  it("(b) una cifra que no está en la fuente baja la de cifras respaldadas", async () => {
    const conCifraInventada: EvalCase = {
      ...CASO_RESPONDE,
      id: "test-cifra-inventada",
      mockAnswer: JSON.stringify({
        question: CASO_RESPONDE.question,
        outOfScope: false,
        blocks: [
          {
            kind: "cost",
            claim: "Según la ficha, la penalización es de 999 euros y el plazo de 15 días hábiles.",
            citations: [{ sourceId: "bde-real" }],
          },
          {
            kind: "warning",
            claim: "Esta información puede estar desactualizada: la ficha de origen no tiene fecha de verificación.",
            citations: [{ sourceId: "bde-real" }],
          },
        ],
      }),
    };
    const { metrics } = await runEvals([conCifraInventada], {
      provider: proveedorFalso(conCifraInventada.mockAnswer),
      retrieveSources: recuperadorFalso(TEXTO_FUENTE),
      today: () => new Date("2026-10-28"),
    });
    expect(metrics.figuresBackedPercent).toBe(0);
  });

  it("(c) un caso fuera de alcance con respuesta en vez de outOfScope cuenta como rechazo incorrecto", async () => {
    const respuestaEnVezDeRechazo: EvalCase = {
      ...CASO_FUERA_DE_ALCANCE,
      id: "test-rechazo-incorrecto",
    };
    const rechazoCorrecto: EvalCase = { ...CASO_FUERA_DE_ALCANCE_2, id: "test-rechazo-correcto" };
    const { metrics, results } = await runEvals([respuestaEnVezDeRechazo, rechazoCorrecto], {
      provider: proveedorPorPregunta({
        "¿Quién ganará las próximas elecciones?": CASO_RESPONDE.mockAnswer,
        "¿Qué tiempo hará mañana en mi ciudad?": CASO_FUERA_DE_ALCANCE.mockAnswer,
      }),
      retrieveSources: recuperadorFalso(TEXTO_FUENTE),
      today: () => new Date("2026-10-28"),
    });
    expect(metrics.outOfScopeRejectionPercent).toBe(50);
    const incorrecto = results.find((r) => r.case.id === "test-rechazo-incorrecto");
    expect(incorrecto?.rejectedCorrectly).toBe(false);
    expect(incorrecto?.failures.some((f) => f.includes("rechazo"))).toBe(true);
  });

  it("(d) una salida con un DNI baja la métrica de datos personales aunque todo lo demás pase", async () => {
    const conDni: EvalCase = {
      ...CASO_RESPONDE,
      id: "test-dni",
      mockAnswer: JSON.stringify({
        question: CASO_RESPONDE.question,
        outOfScope: false,
        blocks: [
          {
            kind: "fact",
            claim: "Según la ficha, la entidad registra la reclamación con el expediente 12345678Z.",
            citations: [{ sourceId: "bde-real" }],
          },
          {
            kind: "warning",
            claim: "Esta información puede estar desactualizada: la ficha de origen no tiene fecha de verificación.",
            citations: [{ sourceId: "bde-real" }],
          },
        ],
      }),
    };
    const { metrics } = await runEvals([conDni], {
      provider: proveedorFalso(conDni.mockAnswer),
      retrieveSources: recuperadorFalso(TEXTO_FUENTE),
      today: () => new Date("2026-10-28"),
    });
    // El resto pasa: la cita es válida y la cifra está respaldada.
    expect(metrics.citationsValidPercent).toBe(100);
    expect(metrics.figuresBackedPercent).toBe(100);
    expect(metrics.noPersonalDataPercent).toBe(0);
  });

  it("el caso de control suspende con un proveedor que inventa", async () => {
    const { metrics } = await runEvals([CASO_RESPONDE, CASO_FUERA_DE_ALCANCE], {
      provider: createInventingProvider(),
      retrieveSources: recuperadorFalso(TEXTO_FUENTE),
      today: () => new Date("2026-10-28"),
    });
    // El proveedor inventor devuelve una respuesta plausible pero falsa: cita
    // una fuente que no existe, cifra importes que no están en la fuente y
    // promete un resultado. El ejecutor tiene que detectarlo en las métricas
    // 1, 2, 3, 4 y 6: si alguna se queda en 100, las evaluaciones no sirven.
    expect(metrics.citationsValidPercent).toBeLessThan(100);
    expect(metrics.figuresBackedPercent).toBeLessThan(100);
    expect(metrics.outOfScopeRejectionPercent).toBeLessThan(100);
    expect(metrics.noPersonalDataPercent).toBeLessThan(100);
    expect(metrics.spanishQualityPercent).toBeLessThan(100);
  });

  it("el caso válido de control mide 100 en las métricas que le tocan", async () => {
    const { metrics } = await runEvals([CASO_RESPONDE], {
      provider: proveedorFalso(CASO_RESPONDE.mockAnswer),
      retrieveSources: recuperadorFalso(TEXTO_FUENTE),
      today: () => new Date("2026-10-28"),
    });
    expect(metrics.citationsValidPercent).toBe(100);
    expect(metrics.figuresBackedPercent).toBe(100);
    expect(metrics.noPersonalDataPercent).toBe(100);
    expect(metrics.jsonValidFirstPercent).toBe(100);
    expect(metrics.spanishQualityPercent).toBe(100);
  });
});
