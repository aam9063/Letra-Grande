// Comprueba que una rama que va a fusionarse con main lleva toda la historia de
// main. Nace de un problema real: el trabajo del escritorio llegó a main con un
// squash ("Dev #35") mientras dev tenía esos mismos commits, así que el PR de
// dev a main marcó diez conflictos que no eran de contenido, y resolverlos a
// mano podía comerse cambios sin que nadie lo notara.
//
// La regla: dev a main se fusiona, nunca se aplasta; y si main tiene commits que
// dev no tiene, se traen a dev antes de entregar. Ver docs/review-gate.md.
//
// Ojo con el commit que se mira: en un pull_request, actions/checkout deja el
// merge ref, y en cualquier PR fusionable main es ancestro del merge ref por
// construcción. Por eso se comprueba el commit de la rama
// (GITHUB_HEAD_SHA), no HEAD, igual que hace `check-review-report.mjs`.
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const BASE_QUE_VIGILA = "main";

/** Cuántos commits se listan como mucho: una divergencia larga no inunda el log. */
const MAXIMO_COMMITS_LISTADOS = 10;

/**
 * Decide si la historia de la rama es apta para entregar.
 *
 * Solo aplica cuando el destino es main: en el resto de PRs no hay nada que
 * comprobar, porque dev es la rama de integración.
 *
 * @param {object} datos
 * @param {string} datos.base Rama de destino del PR (`GITHUB_BASE_REF`).
 * @param {string} datos.head Rama de origen, para escribir el arreglo.
 * @param {boolean} datos.esAncestro Si la base es ancestro del commit de la rama.
 * @param {string[]} datos.commitsSoloEnBase Commits que la base tiene y la rama no.
 * @param {number} [datos.totalCommitsSoloEnBase] Cuántos hay de verdad, si se recorta la lista.
 * @returns {{ ok: boolean, mensaje: string }}
 */
export function evaluarHistoria({
  base,
  head = "",
  esAncestro,
  commitsSoloEnBase = [],
  totalCommitsSoloEnBase = commitsSoloEnBase.length,
}) {
  if (base === "") {
    return { ok: true, mensaje: "No aplica: no es un pull request." };
  }

  if (base !== BASE_QUE_VIGILA) {
    return { ok: true, mensaje: `No aplica: el PR va a ${base}.` };
  }

  if (esAncestro) {
    return { ok: true, mensaje: "La rama lleva toda la historia de main." };
  }

  const listados = commitsSoloEnBase.slice(0, MAXIMO_COMMITS_LISTADOS);
  const restantes = Math.max(0, totalCommitsSoloEnBase - listados.length);
  const detalle =
    totalCommitsSoloEnBase === 0
      ? "main tiene commits que esta rama no tiene."
      : [
          `main tiene ${totalCommitsSoloEnBase} commit(s) que esta rama no tiene:`,
          ...listados.map((commit) => `  ${commit}`),
          ...(restantes > 0 ? [`  y ${restantes} más`] : []),
        ].join("\n");

  const rama = head === "" ? "<rama de la entrega>" : head;

  return {
    ok: false,
    mensaje: [
      detalle,
      "",
      "Entregar así deja conflictos fantasma: el mismo código llega dos veces con",
      "historias distintas y git lo ve como cambios enfrentados.",
      "",
      "Arreglo, en la rama de la entrega:",
      "  git fetch origin",
      "  git merge origin/main",
      `  # si hay conflictos, el contenido bueno es el de la rama: git checkout ${rama} -- .`,
      "  git commit    # commit de fusión, no squash",
      "  git push",
      "",
      "Y el merge de esa rama a main, con commit de fusión, nunca con squash.",
    ].join("\n"),
  };
}

/** Ejecuta git y devuelve su salida; falla con un mensaje claro si no está. */
function git(args) {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

/** Asegura que exista `origin/main` en el clon. */
function asegurarBase() {
  try {
    git(["rev-parse", "--verify", "--quiet", `refs/remotes/origin/${BASE_QUE_VIGILA}`]);
  } catch {
    git([
      "fetch",
      "--no-tags",
      "origin",
      `+refs/heads/${BASE_QUE_VIGILA}:refs/remotes/origin/${BASE_QUE_VIGILA}`,
    ]);
  }
}

/** Comprueba la historia y devuelve el código de salida. */
export function runCli(entorno = process.env) {
  const base = entorno.GITHUB_BASE_REF ?? "";
  const head = entorno.GITHUB_HEAD_REF ?? "";
  const objetivo = entorno.GITHUB_HEAD_SHA || "HEAD";

  if (base !== BASE_QUE_VIGILA) {
    console.log(evaluarHistoria({ base, head, esAncestro: true }).mensaje);
    return 0;
  }

  asegurarBase();
  const referencia = `origin/${BASE_QUE_VIGILA}`;

  let esAncestro = true;
  try {
    git(["merge-base", "--is-ancestor", referencia, objetivo]);
  } catch {
    esAncestro = false;
  }

  const commitsSoloEnBase = esAncestro
    ? []
    : git(["log", "--oneline", "--max-count=200", referencia, `^${objetivo}`])
        .split("\n")
        .filter(Boolean);

  const { ok, mensaje } = evaluarHistoria({
    base,
    head,
    esAncestro,
    commitsSoloEnBase,
    totalCommitsSoloEnBase: commitsSoloEnBase.length,
  });

  if (ok) {
    console.log(mensaje);
    return 0;
  }

  console.error(`Historia no apta para entregar a ${BASE_QUE_VIGILA}.\n\n${mensaje}`);
  return 1;
}

// Windows no distingue mayúsculas en rutas: comparamos en minúsculas para
// detectar la entrada CLI también cuando el disco o el shell cambian la caja.
const esPrograma =
  Boolean(process.argv[1]) &&
  import.meta.url.toLowerCase() === pathToFileURL(resolve(process.argv[1])).href.toLowerCase();

if (esPrograma) {
  process.exit(runCli());
}
