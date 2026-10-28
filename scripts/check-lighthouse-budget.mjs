// Umbrales de Lighthouse del presupuesto de rendimiento (QA-05).
//
// Lighthouse se ejecuta en la CI contra el build de producción y escribe un JSON
// por ruta. Este módulo compara ese JSON con los umbrales de
// apps/web/perf/budget.json, sin dependencias: la CI solo necesita Lighthouse
// para recoger las medidas, y las reglas viven aquí, en un test.
//
// Criterio: una categoría o una métrica que no aparece en el informe falla. Un
// informe incompleto no es un aprobado, y una categoría que Lighthouse marca
// como no aplicable (`score: null`) no se midió.
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const NOMBRES = {
  performance: "rendimiento",
  accessibility: "accesibilidad",
  "best-practices": "buenas prácticas",
  seo: "SEO",
};

// cumulative-layout-shift no se mide en milisegundos y su valor util tiene tres
// decimales: decir "0 ms" con un CLS de 0.09 despista a quien lee el fallo.
const METRICAS_ADIMENSIONALES = new Set(["cumulative-layout-shift"]);

function formatearMetrica(metrica, valor) {
  return METRICAS_ADIMENSIONALES.has(metrica) ? valor.toFixed(3) : `${Math.round(valor)} ms`;
}

function porcentaje(valor) {
  return `${Math.round(valor * 100)}`;
}

// Nombre legible más el id crudo del informe: quien depura busca "performance"
// en el JSON de Lighthouse, no la traducción.
function nombreCategoria(categoria) {
  const legible = NOMBRES[categoria];
  return legible ? `${legible} (${categoria})` : categoria;
}

/**
 * Comprueba el informe de una ruta contra el presupuesto de Lighthouse.
 *
 * @param {object} datos
 * @param {string} datos.ruta Ruta medida, solo para el mensaje.
 * @param {object} datos.informe JSON de Lighthouse.
 * @param {object} datos.presupuesto Bloque `lighthouse` de budget.json.
 */
export function comprobarLighthouse({ ruta, informe, presupuesto }) {
  const violaciones = [];

  for (const [categoria, minimo] of Object.entries(presupuesto.categorias ?? {})) {
    const medida = informe?.categories?.[categoria];
    const score = medida?.score;
    if (typeof score !== "number") {
      violaciones.push({
        tipo: "categoria-sin-medir",
        detalle: `La categoría ${nombreCategoria(categoria)} no aparece en el informe de ${ruta}: no se midió, así que no se puede aprobar.`,
      });
      continue;
    }
    if (score < minimo) {
      violaciones.push({
        tipo: "categoria-baja",
        detalle: `${ruta}: la categoría ${nombreCategoria(categoria)} saca ${porcentaje(score)} y el mínimo es ${porcentaje(minimo)}.`,
      });
    }
  }

  for (const [metrica, maximo] of Object.entries(presupuesto.metricas ?? {})) {
    const valor = informe?.audits?.[metrica]?.numericValue;
    if (typeof valor !== "number" || Number.isNaN(valor)) {
      violaciones.push({
        tipo: "metrica-sin-medir",
        detalle: `La métrica ${metrica} no aparece en el informe de ${ruta}: no se midió, así que no se puede aprobar.`,
      });
      continue;
    }
    if (valor > maximo) {
      violaciones.push({
        tipo: "metrica-alta",
        detalle: `${ruta}: ${metrica} vale ${formatearMetrica(metrica, valor)} y el máximo es ${formatearMetrica(metrica, maximo)}.`,
      });
    }
  }

  if (violaciones.length > 0) {
    return {
      status: "fail",
      violaciones,
      message: [
        `Lighthouse no cumple el presupuesto en ${ruta}:`,
        ...violaciones.map((v) => `  - ${v.detalle}`),
        "",
        "Mide en la CI y mira qué audit baja la nota antes de tocar apps/web/perf/budget.json: subir un umbral es una decisión de producto, no un ajuste de test.",
      ].join("\n"),
    };
  }

  return {
    status: "pass",
    violaciones,
    message: `Lighthouse cumple el presupuesto en ${ruta}.`,
  };
}

export function leerPresupuestoLighthouse(rutaPresupuesto) {
  const contenido = JSON.parse(readFileSync(resolve(rutaPresupuesto), "utf8"));
  const bloque = contenido.lighthouse;
  if (!bloque) {
    throw new Error(`${rutaPresupuesto} no tiene bloque "lighthouse": no hay umbrales que comprobar.`);
  }
  return bloque;
}

/**
 * Git Bash en Windows convierte un argumento que empieza por "/" en una ruta de
 * Windows ("C:/Program Files/Git/hoy"). En la CI (Linux) no pasa, pero un
 * humano o un agente que lance el script desde Git Bash acabaría midiendo una
 * ruta que no existe. Se recorta el prefijo dejando la ruta de la app.
 */
export function normalizarRuta(argumento) {
  const ruta = String(argumento ?? "");
  if (ruta.startsWith("/")) return ruta;
  const recorte = /\/Git(\/.*)$/.exec(ruta);
  return recorte ? recorte[1] : ruta;
}

function runCli(argv) {
  const [rutaMedida, ficheroInforme] = argv;  if (!rutaMedida || !ficheroInforme) {
    console.error(
      "Uso: node scripts/check-lighthouse-budget.mjs <ruta> <informe.json> [presupuesto.json]",
    );
    return 1;
  }
  if (!existsSync(ficheroInforme)) {
    console.error(`No existe el informe de Lighthouse ${ficheroInforme}.`);
    return 1;
  }

  const rutaPresupuesto = argv[2] ?? "apps/web/perf/budget.json";
  const presupuesto = leerPresupuestoLighthouse(rutaPresupuesto);
  const informe = JSON.parse(readFileSync(ficheroInforme, "utf8"));
  const resultado = comprobarLighthouse({
    ruta: normalizarRuta(rutaMedida),
    informe,
    presupuesto,
  });

  const print = resultado.status === "fail" ? console.error : console.log;
  print(resultado.message);
  return resultado.status === "fail" ? 1 : 0;
}

const isMain =
  Boolean(process.argv[1]) &&
  import.meta.url.toLowerCase() === pathToFileURL(resolve(process.argv[1])).href.toLowerCase();
if (isMain) {
  process.exit(runCli(process.argv.slice(2)));
}
