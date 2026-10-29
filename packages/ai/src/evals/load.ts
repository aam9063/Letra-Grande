// Cargador de los datos de las evaluaciones (AI-04): los casos y los umbrales
// viven en packages/ai/evals/, versionados y separados del código que los
// ejecuta. La carga valida la forma y rechaza datos rotos con un mensaje que
// nombra el caso: un conjunto de evaluaciones que no carga no mide.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { AssistantAnswer } from "@letra-grande/schema";
import { CATEGORIES, type CaseCategory, type EvalCase, type Thresholds } from "./types.js";

const SUBCARPETAS: readonly string[] = ["companies", "authorities", "procedures"];

/** Carpeta de datos de las evaluaciones: packages/ai/evals/. */
/** Claves validas de `expect`; una errata dejaria el caso en verde sin querer. */
const CLAVES_EXPECT = new Set([
  "outOfScope",
  "blocksWithCitations",
  "figuresBacked",
  "minSteps",
  "clarification",
  "stalenessWarning",
  "mustMention",
  "mustNotMention",
  "mustCiteSourceIds",
]);

function validarExpectativas(id: string, expect: unknown): EvalCase["expect"] {
  if (typeof expect !== "object" || expect === null) {
    throw new Error(`caso ${id}: expect tiene que ser un objeto`);
  }
  for (const clave of Object.keys(expect)) {
    if (!CLAVES_EXPECT.has(clave)) {
      throw new Error(`caso ${id}: expect tiene la clave desconocida "${clave}"`);
    }
  }
  return expect as EvalCase["expect"];
}

export function rutaDatos(): string {
  // Desde src/evals/ sube dos niveles hasta packages/ai/ y entra en evals/.
  return fileURLToPath(new URL("../../evals/", import.meta.url));
}

function esTexto(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/** Lee y valida el fichero de casos; lanza con el id del caso roto. */
export function loadCases(ruta: string): EvalCase[] {
  const datos = parse(readFileSync(ruta, "utf8")) as unknown;
  const casos = (datos as { cases?: unknown }).cases;
  if (!Array.isArray(casos)) {
    throw new Error("El fichero de casos debe ser un objeto con una lista 'cases'.");
  }
  const vistos = new Set<string>();
  return casos.map((bruto, i) => {
    const c = bruto as Record<string, unknown>;
    const donde = `caso ${i}`;
    if (!esTexto(c.id)) throw new Error(`${donde}: falta el id`);
    if (vistos.has(c.id)) throw new Error(`${donde}: id repetido "${c.id}"`);
    vistos.add(c.id);
    if (!CATEGORIES.includes(c.category as CaseCategory)) {
      throw new Error(`caso ${c.id}: categoría desconocida "${String(c.category)}"`);
    }
    if (!esTexto(c.question)) throw new Error(`caso ${c.id}: falta la pregunta`);
    if (c.expectedFicha !== null && !esTexto(c.expectedFicha)) {
      throw new Error(`caso ${c.id}: expectedFicha debe ser un id de ficha o null`);
    }
    if (typeof c.expect !== "object" || c.expect === null || Array.isArray(c.expect)) {
      throw new Error(`caso ${c.id}: falta el bloque expect`);
    }
    if (!esTexto(c.mockAnswer)) throw new Error(`caso ${c.id}: falta la respuesta mock`);
    const respuesta = AssistantAnswer.safeParse(JSON.parse(c.mockAnswer));
    if (!respuesta.success) {
      throw new Error(`caso ${c.id}: mockAnswer no encaja en el catálogo cerrado de bloques`);
    }
    return {
      id: c.id,
      category: c.category as CaseCategory,
      question: c.question,
      expectedFicha: c.expectedFicha as string | null,
      expect: validarExpectativas(c.id, c.expect),
      mockAnswer: c.mockAnswer,
    } satisfies EvalCase;
  });
}

/** Lee y valida los umbrales; lanza si falta una métrica o su anotación. */
export function loadThresholds(ruta: string): Thresholds {
  const bruto = JSON.parse(readFileSync(ruta, "utf8")) as unknown;
  const entrada = bruto as Record<string, { min?: unknown; source?: unknown }>;
  const claves: (keyof Thresholds)[] = [
    "citationsValidPercent",
    "figuresBackedPercent",
    "outOfScopeRejectionPercent",
    "noPersonalDataPercent",
    "jsonValidFirstPercent",
    "spanishQualityPercent",
  ];
  const resultado = {} as Thresholds;
  for (const clave of claves) {
    const umbral = entrada[clave];
    const min = umbral?.min;
    if (typeof min !== "number" || min < 0 || min > 100) {
      throw new Error(`Umbral "${clave}": falta o no es un número entre 0 y 100`);
    }
    if (!esTexto(umbral?.source)) {
      throw new Error(`Umbral "${clave}": falta la anotación de origen (source)`);
    }
    resultado[clave] = { min, source: umbral.source as string };
  }
  return resultado;
}

/** Ids de las fichas presentes en content/ (companies, authorities, procedures). */
export function fichasExistentes(contentRoot: string): Set<string> {
  const ids = new Set<string>();
  for (const carpeta of SUBCARPETAS) {
    const directorio = join(contentRoot, carpeta);
    let nombres: string[];
    try {
      nombres = readdirSync(directorio);
    } catch {
      continue;
    }
    for (const nombre of nombres) {
      if (!nombre.endsWith(".yaml")) continue;
      const ruta = join(directorio, nombre);
      if (!statSync(ruta).isFile()) continue;
      try {
        const ficha = parse(readFileSync(ruta, "utf8")) as { id?: unknown };
        if (esTexto(ficha.id)) ids.add(ficha.id);
      } catch {
        // YAML roto: el cargador del índice también lo salta; aquí no es fatal.
      }
    }
  }
  return ids;
}
