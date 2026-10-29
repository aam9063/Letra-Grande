// Informe legible de las evaluaciones (AI-04): tabla de métricas con valor
// medido y umbral, y detalle por categoría con los casos que fallan y por qué.
// Texto plano en español, sin datos de las respuestas: solo ids, categorías y
// motivos de fallo, para que el informe se pueda pegar en un job de CI.
import { CATEGORY_LABELS, type EvalMetrics, type Thresholds } from "./types.js";
import type { EvalsRun } from "./types.js";

const ETIQUETAS_METRICAS: Readonly<Record<keyof EvalMetrics, string>> = {
  citationsValidPercent: "1. Bloques con cita válida",
  figuresBackedPercent: "2. Cifras respaldadas por la fuente",
  outOfScopeRejectionPercent: "3. Rechazo correcto fuera de alcance",
  noPersonalDataPercent: "4. Sin datos personales en las salidas",
  jsonValidFirstPercent: "5. JSON válido a la primera",
  spanishQualityPercent: "6. Calidad del español (tono)",
};

export interface ReportOptions {
  /** Nombre del proveedor usado, para el encabezado. */
  providerName: string;
}

function lineaMetrica(
  clave: keyof EvalMetrics,
  medido: number,
  umbral: number,
): string {
  const etiqueta = ETIQUETAS_METRICAS[clave].padEnd(40, " ");
  const valor = String(medido).padStart(6, " ");
  const limite = String(umbral).padStart(6, " ");
  const estado = medido >= umbral ? "ok" : "FALLA";
  return `${etiqueta} ${valor}  (umbral ${limite})  ${estado}`;
}

function lineaCategoria(categoria: string, run: EvalsRun): string[] {
  const casos = run.results.filter((r) => r.case.category === categoria);
  if (casos.length === 0) return [];
  const fallos = casos.filter((r) => !r.passed);
  const etiqueta = CATEGORY_LABELS[categoria as keyof typeof CATEGORY_LABELS] ?? categoria;
  const lineas = [
    `${etiqueta}: ${casos.length - fallos.length}/${casos.length} casos en verde`,
  ];
  for (const f of fallos) {
    lineas.push(`  ${f.case.id}:`);
    for (const motivo of f.failures) {
      lineas.push(`    ${motivo}`);
    }
  }
  return lineas;
}

/** Construye el informe completo en texto. */
export function formatReport(run: EvalsRun, umbrales: Thresholds, opciones: ReportOptions): string {
  const lineas: string[] = [];
  lineas.push("Evaluaciones del asistente (AI-04)");
  lineas.push(`Proveedor: ${opciones.providerName} | Casos: ${run.results.length}`);
  lineas.push("");
  lineas.push("Métrica                                      Medido  Umbral");
  const claves = Object.keys(ETIQUETAS_METRICAS) as (keyof EvalMetrics)[];
  const fallosMetrica: string[] = [];
  for (const clave of claves) {
    const medido = run.metrics[clave];
    const umbral = umbrales[clave].min;
    lineas.push(lineaMetrica(clave, medido, umbral));
    if (medido < umbral) fallosMetrica.push(clave);
  }
  lineas.push("");
  lineas.push("Detalle por categoría:");
  const categorias = [...new Set(run.results.map((r) => r.case.category))];
  for (const categoria of categorias) {
    lineas.push(...lineaCategoria(categoria, run));
  }
  lineas.push("");
  if (fallosMetrica.length > 0) {
    lineas.push(`Métricas por debajo del umbral: ${fallosMetrica.join(", ")}`);
  } else {
    lineas.push("Todas las métricas cumplen sus umbrales.");
  }
  return lineas.join("\n");
}
