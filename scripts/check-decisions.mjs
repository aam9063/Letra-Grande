// Comprueba que toda decision citada en la documentacion existe en la tabla
// de decisiones de docs/ARRANQUE.md. Nace de un error repetido: buscar "D-12"
// como texto libre encuentra "MOD-12" y da la decision por existente.
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));

/**
 * Ids de decision definidos en la tabla (lineas que empiezan por "| D-NN |").
 * Se leen de todo el documento de arranque, no solo de la seccion 19: hoy es la
 * unica tabla con filas "D-NN" y acotarlo exigiria fijar los numeros de linea.
 */
export function decisionIds(texto) {
  const ids = new Set();
  for (const linea of texto.split("\n")) {
    const coincidencia = /^\|\s*(D-\d{2})\s*\|/.exec(linea);
    if (coincidencia) ids.add(coincidencia[1]);
  }
  return ids;
}

/**
 * Ids citados en un texto. Descarta los que forman parte de otro identificador
 * (por ejemplo MOD-12 o REF-UI-09) exigiendo que no haya letra, digito, guion
 * ni guion bajo justo antes.
 */
export function citedDecisions(texto) {
  const citados = new Set();
  for (const coincidencia of texto.matchAll(/[^A-Za-z0-9_-](D-\d{2})(?![0-9])/g)) {
    citados.add(coincidencia[1]);
  }
  if (/^D-\d{2}(?![0-9])/.test(texto)) citados.add(texto.slice(0, 4));
  return citados;
}

/** Decisiones citadas que no existen en la tabla, ordenadas. */
export function missingDecisions(definidas, citadas) {
  const faltan = [...citadas].filter((id) => !definidas.has(id)).sort();
  return [...new Set(faltan)];
}

/**
 * Documentos donde se buscan citas. Se recorre todo `docs/`, los documentos de
 * tarea y los informes de review, porque los tres citan decisiones.
 *
 * Dos falsos negativos conocidos, fijados con tests para que no sorprendan:
 * un rango como `D-11-D-12` solo detecta `D-11` (el guion separador esta en la
 * clase de exclusion) y una variante como `D-12a` cuenta como `D-12`.
 */
function documentos() {
  const rutas = [];
  const porCarpeta = (carpeta, extension) => {
    try {
      for (const entrada of readdirSync(`${RAIZ}${carpeta}`)) {
        if (entrada.endsWith(extension)) rutas.push(`${carpeta}/${entrada}`);
      }
    } catch {
      // Carpeta ausente: no hay nada que comprobar.
    }
  };
  porCarpeta("docs", ".md");
  porCarpeta("odd/tasks", ".md");
  porCarpeta("odd/reviews", ".md");
  return rutas;
}

function main() {
  const arranque = readFileSync(`${RAIZ}docs/ARRANQUE.md`, "utf8");
  const definidas = decisionIds(arranque);
  const problemas = [];

  for (const documento of documentos()) {
    const texto = readFileSync(`${RAIZ}${documento}`, "utf8");
    for (const id of missingDecisions(definidas, citedDecisions(texto))) {
      problemas.push(`${documento}: cita ${id}, que no existe en la tabla de decisiones de docs/ARRANQUE.md`);
    }
  }

  if (problemas.length > 0) {
    console.error("Decisiones citadas que no existen:\n" + problemas.map((p) => `  - ${p}`).join("\n"));
    process.exit(1);
  }
  console.log(`Decisiones OK: ${definidas.size} definidas y todas las citas resuelven.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
