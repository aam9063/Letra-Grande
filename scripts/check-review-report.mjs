import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Comprobacion de CI: un PR cuyo titulo lleva id de tarea (por ejemplo OPS-05)
// debe adjuntar su informe de review en odd/reviews/<id>.md (seccion 22 de
// docs/ARRANQUE.md y regla 8 de AGENTS.md). Un PR sin id de tarea no aplica.

const TEMPLATE_PATH = "odd/reviews/_template.md";
const REQUIRED_KEYS = ["tarea", "base", "revisado", "revisor", "veredicto"];
const VALID_VERDICTS = ["aprobado", "aprobado con cambios", "rechazado"];
const ID_PATTERN = /[A-Z]+-\d+/;

export function extractTaskId(title) {
  const match = ID_PATTERN.exec(title ?? "");
  return match ? match[0] : null;
}

function reportPathFor(reviewsDir, id) {
  const wanted = `${id.toLowerCase()}.md`;
  const entries = existsSync(reviewsDir) ? readdirSync(reviewsDir) : [];
  const found = entries.find((entry) => entry.toLowerCase() === wanted);
  return found ? join(reviewsDir, found) : null;
}

function frontMatterLines(content) {
  const lines = content.split(/\r?\n/);
  // Los informes reales (por ejemplo odd/reviews/ops-01.md) pueden llevar una
  // linea de titulo antes del front matter: lo admitimos hasta la linea 3.
  const start = lines.findIndex((line) => line.trim() === "---");
  if (start === -1 || start > 2) return null;
  const end = lines.findIndex((line, index) => index > start && line.trim() === "---");
  if (end === -1) return null;
  return lines.slice(start + 1, end);
}

function missingFrontMatterKeys(lines) {
  return REQUIRED_KEYS.filter((key) => {
    const line = lines.find((candidate) => new RegExp(`^${key}\\s*:`, "i").test(candidate));
    return !line || line.slice(line.indexOf(":") + 1).trim() === "";
  });
}

// Funcion pura de cara a los tests: recibe titulo y directorio de informes,
// no toca el entorno ni llama a process.exit (eso queda en la entrada CLI).
export function checkReviewReport({ title, reviewsDir }) {
  const id = extractTaskId(title);
  if (!id) {
    return {
      status: "skip",
      message: "La comprobacion del informe de review no aplica: el titulo del PR no tiene id de tarea (patron LETRA-NUMERO, por ejemplo OPS-05). No se exige informe.",
    };
  }

  const expectedPath = `odd/reviews/${id.toLowerCase()}.md`;
  const reportFile = reportPathFor(reviewsDir, id);
  if (!reportFile) {
    return {
      status: "fail",
      message: `Falta el informe de review de la tarea ${id}: no existe ${expectedPath}. Copia la plantilla ${TEMPLATE_PATH}, pide la revision (seccion 22 de docs/ARRANQUE.md) y guarda el informe en ${expectedPath} antes de abrir el PR.`,
    };
  }

  const content = readFileSync(reportFile, "utf8");
  const frontMatter = frontMatterLines(content);
  if (!frontMatter) {
    return {
      status: "fail",
      message: `El informe ${expectedPath} no tiene front matter YAML entre dos lineas ---. Faltan las claves obligatorias: ${REQUIRED_KEYS.join(", ")}. Usa la plantilla ${TEMPLATE_PATH}.`,
    };
  }

  const missingKeys = missingFrontMatterKeys(frontMatter);
  if (missingKeys.length > 0) {
    return {
      status: "fail",
      message: `Al informe ${expectedPath} le faltan claves en el front matter: ${missingKeys.join(", ")}. Copia la plantilla ${TEMPLATE_PATH}.`,
    };
  }

  const verdictLine = frontMatter.find((line) => /^veredicto\s*:/i.test(line));
  const verdict = verdictLine.slice(verdictLine.indexOf(":") + 1).trim().toLowerCase();
  if (!VALID_VERDICTS.includes(verdict)) {
    return {
      status: "fail",
      message: `La linea veredicto de ${expectedPath} no es valida: "${verdict}". Valores validos: ${VALID_VERDICTS.join(", ")}.`,
    };
  }

  return {
    status: "pass",
    message: `Informe de review de la tarea ${id} encontrado en ${expectedPath}: front matter completo y veredicto valido (${verdict}).`,
  };
}

function runCli() {
  const title = process.argv[2] || process.env.PR_TITLE || process.env.GITHUB_PR_TITLE || "";
  const reviewsDir = fileURLToPath(new URL("../odd/reviews", import.meta.url));
  const result = checkReviewReport({ title, reviewsDir });
  const print = result.status === "fail" ? console.error : console.log;
  print(result.message);
  return result.status === "fail" ? 1 : 0;
}

// Windows no distingue mayusculas en rutas: comparamos en minusculas para
// detectar la entrada CLI tambien cuando el disco o el shell cambian la caja.
const isMain = Boolean(process.argv[1])
  && import.meta.url.toLowerCase() === pathToFileURL(resolve(process.argv[1])).href.toLowerCase();
if (isMain) {
  process.exit(runCli());
}
