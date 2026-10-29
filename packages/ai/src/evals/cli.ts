// CLI del conjunto de evaluaciones del asistente (AI-04): `pnpm evals`.
//
// Recorre los 40 casos, obtiene la respuesta del proveedor que toque y calcula
// las seis métricas de la sección 13.2 de docs/ARRANQUE.md. El proveedor se
// elige con AI_PROVIDER (mock por defecto): con mock, las respuestas son las
// de cada caso (mockAnswer), así que la ejecución valida el camino completo
// (recuperación, guardarraíles y métricas), no la calidad del modelo. Contra
// el proveedor real (nan) se necesita NAN_API_KEY, y correrlo así sigue
// bloqueado por H-03 y H-08: no se finge que se mide lo que no se mide.
//
// Uso:
//   pnpm evals                 ejecuta el conjunto con el proveedor de AI_PROVIDER
//   pnpm evals --json out.json  guarda además el resultado en JSON
//   pnpm evals --selfcheck     ejecuta el conjunto contra el proveedor que
//                              inventa: el ejecutor debe detectar el fallo
//
// Sale con código distinto de cero si alguna métrica queda por debajo de su
// umbral (o, en selfcheck, si el proveedor que inventa no es detectado).
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { createMockProvider } from "../mock.js";
import { createNanProvider } from "../nan.js";
import { findContentRoot } from "../retrieval/loader.js";
import { createContentRetriever } from "../retrieval/retriever.js";
import { createInventingProvider } from "./inventing-provider.js";
import { fichasExistentes, loadCases, loadThresholds, rutaDatos } from "./load.js";
import { formatReport } from "./report.js";
import { runEvals } from "./runner.js";
import type { EvalCase, EvalMetrics } from "./types.js";
import type { LlmProvider as Proveedor } from "../provider.js";

interface Opciones {
  json: string | undefined;
  selfcheck: boolean;
}

function leerArgs(argv: readonly string[]): Opciones {
  const opciones: Opciones = { json: undefined, selfcheck: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--json") {
      const valor = argv[i + 1];
      if (valor === undefined) throw new Error("--json necesita una ruta de salida");
      opciones.json = valor;
      i += 1;
    } else if (arg === "--selfcheck") {
      opciones.selfcheck = true;
    } else if (arg === "--") {
      // Separador de pnpm/tsx: no es un argumento del ejecutor.
    } else {
      throw new Error(`Argumento no reconocido: ${String(arg)}. Usa --json <ruta> o --selfcheck.`);
    }
  }
  return opciones;
}

// Con mock, la tabla del proveedor se construye a partir de los propios casos:
// cada pregunta devuelve su mockAnswer. El adaptador mock responde a la
// pregunta del último mensaje, y el camino real de evaluación lleva la
// pregunta y las fuentes en mensajes separados: este envoltorio reutiliza el
// adaptador y le pasa solo la pregunta (el primer mensaje), manteniendo su
// normalización y su error honesto si la pregunta no está en la tabla.
function crearProveedorMock(casos: readonly EvalCase[]): Proveedor {
  const tabla: Record<string, string> = {};
  for (const c of casos) tabla[c.question] = c.mockAnswer;
  const base = createMockProvider({ table: tabla, name: "mock-evals" });
  return {
    name: base.name,
    complete: async (input) => {
      const pregunta = input.messages[0]?.content ?? "";
      return base.complete({ ...input, messages: [{ role: "user", content: pregunta }] });
    },
  };
}

function crearProveedor(env: NodeJS.ProcessEnv, casos: readonly EvalCase[]): Proveedor {
  const nombre = env.AI_PROVIDER?.trim() || "mock";
  if (nombre === "mock") {
    return crearProveedorMock(casos);
  }
  if (nombre === "nan") {
    return createNanProvider({ env });
  }
  throw new Error(`AI_PROVIDER tiene un valor no reconocido. Usa "nan" o "mock".`);
}

// Comprueba que las fichas que esperan los casos existen en content/.
function verificarFichas(casos: readonly EvalCase[], contentRoot: string): void {
  const existentes = fichasExistentes(contentRoot);
  const faltan = casos
    .map((c) => c.expectedFicha)
    .filter((id): id is string => id !== null && !existentes.has(id));
  if (faltan.length > 0) {
    throw new Error(
      `Los casos esperan fichas que no existen en content/: ${[...new Set(faltan)].join(", ")}`,
    );
  }
}

function cuentasPorCategoria(casos: readonly EvalCase[]): string {
  const cuenta = new Map<string, number>();
  for (const c of casos) cuenta.set(c.category, (cuenta.get(c.category) ?? 0) + 1);
  return [...cuenta.entries()].map(([cat, n]) => `${cat}: ${n}`).join(", ");
}

async function main(): Promise<number> {
  const opciones = leerArgs(process.argv.slice(2));
  const dir = rutaDatos();
  const casos = loadCases(join(dir, "cases.yaml"));
  const umbrales = loadThresholds(join(dir, "thresholds.json"));
  const contentRoot = findContentRoot();
  if (contentRoot === undefined) {
    throw new Error("No se encuentra la carpeta content/ del repositorio: sin fichas no hay evaluación posible.");
  }
  verificarFichas(casos, contentRoot);

  const provider: Proveedor = opciones.selfcheck
    ? createInventingProvider()
    : crearProveedor(process.env, casos);
  const retriever = createContentRetriever({ contentRoot });

  const run = await runEvals(casos, { provider, retrieveSources: (q) => retriever(q) });
  const informe = formatReport(run, umbrales, { providerName: provider.name });
  console.log(informe);
  console.log(`Casos por categoría: ${cuentasPorCategoria(casos)}`);
  if (opciones.json !== undefined) {
    const salida = {
      provider: provider.name,
      selfcheck: opciones.selfcheck,
      cases: run.results.length,
      metrics: run.metrics,
      results: run.results.map((r) => ({
        id: r.case.id,
        category: r.case.category,
        passed: r.passed,
        failures: r.failures,
        jsonValidFirst: r.jsonValidFirst,
        rejectedCorrectly: r.rejectedCorrectly,
        citationsOk: r.citationsOk,
        figuresOk: r.figuresOk,
        toneClean: r.toneClean,
        personalDataClean: r.personalDataClean,
        degradedToOutOfScope: r.degradedToOutOfScope,
      })),
    };
    writeFileSync(opciones.json, `${JSON.stringify(salida, null, 2)}\n`);
    console.log(`Resultado JSON escrito en ${opciones.json}`);
  }

  if (opciones.selfcheck) {
    // El control es al revés que la ejecución normal: el proveedor que inventa
    // tiene que bajar métricas. Si alguna métrica sensible se queda en su
    // umbral, las evaluaciones no miden y hay que parar.
    const sensibles: (keyof EvalMetrics)[] = [
      "citationsValidPercent",
      "figuresBackedPercent",
      "outOfScopeRejectionPercent",
      "noPersonalDataPercent",
      "spanishQualityPercent",
    ];
    const noDetectadas = sensibles.filter((k) => run.metrics[k] >= umbrales[k].min);
    if (noDetectadas.length > 0) {
      console.error(`El caso de control ha fallado: las evaluaciones no detectan al proveedor que inventa en: ${noDetectadas.join(", ")}`);
      return 1;
    }
    console.log("Caso de control correcto: el proveedor que inventa queda detectado por las métricas.");
    return 0;
  }

  const claves = Object.keys(umbrales) as (keyof EvalMetrics)[];
  const bajas = claves.filter((k) => run.metrics[k] < umbrales[k].min);
  if (bajas.length > 0) {
    console.error(`Evaluaciones por debajo del umbral: ${bajas.join(", ")}`);
    return 1;
  }
  return 0;
}

main()
  .then((codigo) => {
    process.exitCode = codigo;
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
