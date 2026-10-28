// Sincroniza dev con main después de cada entrega (OPS-11).
//
// Cada entrega a main deja un commit de fusión que dev no tiene: la guardia de
// OPS-10 bloquea la entrega siguiente y GitHub marca la rama como desfasada.
// Este script hace el paso que hasta ahora se hacía a mano: rama desde dev,
// fusión de main, comprobación de que el árbol no cambia, PR y fusión cuando
// las comprobaciones están en verde.
//
// Regla que no se negocia: la sincronización no puede cambiar contenido. Si el
// árbol resultante no es exactamente el de dev, el script falla en vez de
// inventarse una resolución.
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

/** Marca en el nombre de rama: solo se tocan las ramas que empiezan así. */
export const PREFIJO_RAMA = "sync/dev-";

/**
 * ¿Hay que sincronizar?
 *
 * Solo cuando main tiene commits que dev no tiene. Se comprueba la ascendencia
 * y no el contenido: el contenido de main ya está en dev, lo que falta es la
 * historia.
 */
export function necesitaSincronizacion({ mainEsAncestroDeDev }) {
  return !mainEsAncestroDeDev;
}

/**
 * Nombre de la rama de sincronización, estable y reconocible.
 *
 * @param {object} datos
 * @param {string} datos.mainSha Commit de main que se va a fusionar.
 * @param {string} datos.devSha Commit de dev sobre el que se construye.
 * @returns {string} Rama `sync/dev-<main corto>-<dev corto>`.
 */
export function nombreDeRama({ mainSha, devSha }) {
  return `${PREFIJO_RAMA}${mainSha.slice(0, 7)}-${devSha.slice(0, 7)}`;
}

/**
 * Cuerpo del PR de sincronización, con los commits que se traen.
 *
 * @param {object} datos
 * @param {string[]} datos.commits Commits de main que dev no tiene, en una línea.
 * @param {string} datos.mainSha
 * @param {string} datos.devSha
 * @returns {string} Cuerpo en Markdown.
 */
export function cuerpoDePr({ commits, mainSha, devSha }) {
  const lista = commits.map((commit) => `- ${commit}`).join("\n");
  return [
    "## Qué cambia",
    "",
    `Nada de contenido: une en \`dev\` la historia de \`main\` (\`${mainSha.slice(0, 7)}\`) sobre \`dev\` (\`${devSha.slice(0, 7)}\`).`,
    "El árbol resultante es idéntico al de `dev`; el script lo comprueba antes de abrir este PR y falla si no lo es.",
    "",
    "Commits que se traen:",
    "",
    lista,
    "",
    "Es el paso 1 del procedimiento de entrega de OPS-10 (`docs/review-gate.md`), automatizado por OPS-11.",
    "",
    "## Cómo se verificó",
    "",
    "- [x] Fusión sin conflictos y árbol idéntico al de `dev`",
    "- [ ] `pnpm check` y `pnpm e2e` en verde (CI de este PR)",
    "",
    "## Riesgo",
    "",
    "Risk: none",
    "",
    "Solo historia: ni una línea de código ni de contenido cambia.",
    "",
  ].join("\n");
}

/** Ejecuta y devuelve la salida; falla con un mensaje con el comando y el error. */
function correr(comando, argumentos, opciones = {}) {
  return execFileSync(comando, argumentos, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...opciones,
  }).trim();
}

/** Comprueba si `ancestro` es ancestro de `descendiente`. */
function esAncestro(ancestro, descendiente) {
  try {
    correr("git", ["merge-base", "--is-ancestor", ancestro, descendiente]);
    return true;
  } catch {
    return false;
  }
}

/** Entrada del programa: devuelve el código de salida. */
export function main() {
  const token = process.env.SYNC_TOKEN ?? "";
  if (token === "") {
    console.log(
      [
        "SYNC_TOKEN no está configurado: no se hace nada.",
        "",
        "Hace falta un token propio porque los PRs abiertos con el GITHUB_TOKEN por",
        "defecto no disparan workflows, así que su PR de sincronización nunca tendría",
        "comprobaciones. Crear un token de acceso personal con permiso de lectura y",
        "escritura sobre Contents y Pull requests de este repositorio, y guardarlo como",
        "secreto SYNC_TOKEN en Settings, Secrets and variables, Actions.",
      ].join("\n"),
    );
    return 0;
  }

  correr("git", ["fetch", "--no-tags", "origin", "main", "dev"]);
  const mainSha = correr("git", ["rev-parse", "origin/main"]);
  const devSha = correr("git", ["rev-parse", "origin/dev"]);

  if (!necesitaSincronizacion({ mainEsAncestroDeDev: esAncestro(mainSha, devSha) })) {
    console.log("dev ya lleva la historia de main: nada que sincronizar.");
    return 0;
  }

  const commits = correr("git", ["log", "--oneline", "origin/main", "^origin/dev"])
    .split("\n")
    .filter(Boolean);
  const rama = nombreDeRama({ mainSha, devSha });
  console.log(`Sincronizando ${commits.length} commit(s) de main en ${rama}.`);

  correr("git", ["checkout", "-B", rama, devSha]);
  correr("git", ["config", "user.name", "letra-grande-sync"]);
  correr("git", ["config", "user.email", "sync@letra-grande.invalid"]);

  try {
    correr("git", ["merge", "--no-edit", mainSha]);
  } catch {
    // Con conflicto, el contenido bueno es el de dev: se fija el árbol y se sigue.
    console.log("La fusión trae conflictos: se fija el árbol de dev.");
    correr("git", ["checkout", devSha, "--", "."]);
    correr("git", ["add", "-A"]);
    correr("git", ["commit", "--no-edit"]);
  }

  // Regla de oro: si el árbol cambió, no se fusiona nada.
  try {
    correr("git", ["diff", "--quiet", devSha, "HEAD"]);
  } catch {
    console.error(
      [
        "El árbol de la sincronización NO es idéntico al de dev.",
        "No se abre ningún PR: alguien tiene que mirar esto a mano.",
        "",
        correr("git", ["diff", "--stat", devSha, "HEAD"]),
      ].join("\n"),
    );
    return 1;
  }
  console.log("El árbol es idéntico al de dev: se abre el PR.");

  const url = `https://x-access-token:${token}@github.com/${process.env.GITHUB_REPOSITORY}.git`;
  correr("git", ["push", "--force", url, `HEAD:refs/heads/${rama}`]);

  const gh = (argumentos) => correr("gh", argumentos, { env: { ...process.env, GH_TOKEN: token } });
  const prUrl = gh([
    "pr",
    "create",
    "--base",
    "dev",
    "--head",
    rama,
    "--title",
    "OPS-11: sincronizar dev con main",
    "--body",
    cuerpoDePr({ commits, mainSha, devSha }),
  ]);
  console.log(`PR abierto: ${prUrl}`);

  // Se espera a las tres comprobaciones y se fusiona con commit de fusión.
  gh(["pr", "checks", prUrl, "--watch", "--interval", "20", "--exit-status"]);
  gh(["pr", "merge", prUrl, "--merge", "--delete-branch"]);
  console.log("Sincronización fusionada.");
  return 0;
}

// Windows no distingue mayúsculas en rutas: se compara en minúsculas, como en
// los demás scripts del repositorio.
const esPrograma =
  Boolean(process.argv[1]) &&
  import.meta.url.toLowerCase() === pathToFileURL(resolve(process.argv[1])).href.toLowerCase();

if (esPrograma) {
  process.exit(main());
}
