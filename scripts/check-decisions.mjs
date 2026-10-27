// Comprueba que toda decision citada en la documentacion existe en la tabla
// de decisiones de docs/ARRANQUE.md. Nace de un error repetido: buscar "D-12"
// como texto libre encuentra "MOD-12" y da la decision por existente.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));

/** Ids de decision definidos en la tabla (lineas que empiezan por "| D-NN |"). */
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

const DOCUMENTOS = ["docs/backlog.md", "docs/desktop.md", "docs/ARCHITECTURE.md", "docs/data-model.md"];

function main() {
  const arranque = readFileSync(`${RAIZ}docs/ARRANQUE.md`, "utf8");
  const definidas = decisionIds(arranque);
  const problemas = [];

  for (const documento of DOCUMENTOS) {
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
