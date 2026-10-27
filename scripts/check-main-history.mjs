// Comprueba que una rama que va a fusionarse con main lleva toda la historia de
// main. Nace de un problema real: el trabajo del escritorio llegó a main con un
// squash ("Dev #35") mientras dev tenía esos mismos commits, así que el PR de
// dev a main marcó diez conflictos que no eran de contenido, y resolverlos a
// mano podía comerse cambios sin que nadie lo notara.
//
// La regla: dev a main se fusiona, nunca se aplasta; y si main tiene commits que
// dev no tiene, se traen a dev antes de entregar. Ver docs/review-gate.md.
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const BASE_QUE_VIGILA = "main";

/**
 * Decide si la historia de la rama es apta para entregar.
 *
 * Solo aplica cuando el destino es main: en el resto de PRs no hay nada que
 * comprobar, porque dev es la rama de integración.
 *
 * @param {object} datos
 * @param {string} datos.base Rama de destino del PR (`GITHUB_BASE_REF`).
 * @param {boolean} datos.esAncestro Si la base es ancestro de la rama.
 * @param {string[]} datos.commitsSoloEnBase Commits que la base tiene y la rama no.
 * @returns {{ ok: boolean, mensaje: string }}
 */
export function evaluarHistoria({ base, esAncestro, commitsSoloEnBase = [] }) {
  if (base !== BASE_QUE_VIGILA) {
    return { ok: true, mensaje: `No aplica: el PR va a ${base === "" ? "ninguna rama (push)" : base}.` };
  }

  if (esAncestro) {
    return { ok: true, mensaje: "La rama lleva toda la historia de main." };
  }

  const detalle =
    commitsSoloEnBase.length === 0
      ? "main tiene commits que esta rama no tiene."
      : `main tiene ${commitsSoloEnBase.length} commit(s) que esta rama no tiene:\n  ${commitsSoloEnBase.join("\n  ")}`;

  return {
    ok: false,
    mensaje: [
      detalle,
      "",
      "Entregar así deja conflictos fantasma: el mismo código llega dos veces con",
      "historias distintas y git lo ve como cambios enfrentados.",
      "",
      "Arreglo, en la rama de la entrega (dev):",
      "  git fetch origin",
      "  git merge origin/main",
      "  # si hay conflictos, el contenido bueno es el de dev: git checkout dev -- .",
      "  git commit    # commit de fusión, no squash",
      "  git push",
      "",
      "Y el merge de dev a main, con commit de fusión, nunca con squash.",
    ].join("\n"),
  };
}

/** Ejecuta git y devuelve su salida; falla con un mensaje claro si no está. */
function git(args) {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

/** Asegura que exista `origin/main` en el clon, con su historia completa. */
function asegurarBase() {
  try {
    git(["rev-parse", "--verify", "--quiet", `refs/remotes/origin/${BASE_QUE_VIGILA}`]);
  } catch {
    git(["fetch", "--no-tags", "origin", `+refs/heads/${BASE_QUE_VIGILA}:refs/remotes/origin/${BASE_QUE_VIGILA}`]);
  }
}

function main() {
  const base = process.env.GITHUB_BASE_REF ?? "";
  if (base !== BASE_QUE_VIGILA) {
    console.log(evaluarHistoria({ base, esAncestro: true }).mensaje);
    return;
  }

  asegurarBase();
  const referencia = `origin/${BASE_QUE_VIGILA}`;

  let esAncestro = true;
  try {
    git(["merge-base", "--is-ancestor", referencia, "HEAD"]);
  } catch {
    esAncestro = false;
  }

  const commitsSoloEnBase = esAncestro ? [] : git(["log", "--oneline", referencia, "^HEAD"]).split("\n").filter(Boolean);
  const { ok, mensaje } = evaluarHistoria({ base, esAncestro, commitsSoloEnBase });

  if (ok) {
    console.log(mensaje);
    return;
  }

  console.error(`Historia no apta para entregar a ${BASE_QUE_VIGILA}.\n\n${mensaje}`);
  process.exitCode = 1;
}

// Solo actúa como programa cuando se ejecuta; los tests importan el módulo.
if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main();
}
