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
 * Decide qué hacer con la sincronización.
 *
 * La regla de oro vive aquí: solo se abre un PR si el árbol resultante es
 * exactamente el de `dev`. Con conflictos no se fuerza nada y con un árbol
 * distinto se aborta, porque eso significaría que `main` trae contenido que
 * `dev` no tiene y alguien tiene que mirarlo.
 *
 * @param {object} datos
 * @param {boolean} datos.mainEsAncestroDeDev Si `dev` ya lleva la historia de `main`.
 * @param {boolean} [datos.huboConflictos] Si la fusión de `main` en `dev` chocó.
 * @param {boolean} [datos.arbolIdentico] Si el árbol resultante es el de `dev`.
 * @returns {{ accion: "nada" | "sincronizar" | "abortar", mensaje: string }}
 */
export function decidirSincronizacion({
  mainEsAncestroDeDev,
  huboConflictos = false,
  arbolIdentico = false,
}) {
  if (mainEsAncestroDeDev) {
    return { accion: "nada", mensaje: "dev ya lleva la historia de main: nada que sincronizar." };
  }
  if (huboConflictos) {
    return {
      accion: "abortar",
      mensaje:
        "La fusión de main en dev tiene conflictos. No se resuelve sola: alguien tiene que mirar qué cambia main antes de sincronizar.",
    };
  }
  if (!arbolIdentico) {
    return {
      accion: "abortar",
      mensaje:
        "El árbol de la sincronización no es idéntico al de dev: main trae contenido que dev no tiene. No se abre ningún PR.",
    };
  }
  return { accion: "sincronizar", mensaje: "El árbol es idéntico al de dev: se abre el PR." };
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
    "- [x] Fusión sin conflictos y árbol idéntico al de `dev`, comprobado antes de abrir el PR",
    "- [x] Auto-merge armado: GitHub fusiona cuando `check`, `e2e` y `review-report` están en verde",
    "",
    "## Riesgo",
    "",
    "Risk: none",
    "",
    "Solo historia: ni una línea de código ni de contenido cambia.",
    "",
  ].join("\n");
}

/**
 * Entorno de git con el token fuera de la línea de comandos.
 *
 * El token va en la configuración por variables de entorno (`GIT_CONFIG_*`), no
 * en la URL del remoto: si un comando falla, el mensaje de error imprime la
 * línea de comandos, y un token ahí acabaría en el log de Actions.
 */
function entornoConToken(token, repositorio) {
  return {
    ...process.env,
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: `url.https://x-access-token:${token}@github.com/.insteadOf`,
    GIT_CONFIG_VALUE_0: "https://github.com/",
    GIT_TERMINAL_PROMPT: "0",
    REPOSITORIO: repositorio,
  };
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
        "comprobaciones. Crear un token de acceso personal (fine-grained) con permiso de",
        "lectura y escritura sobre Contents y Pull requests de este repositorio, sin más:",
        "el workflow no espera las comprobaciones, las espera GitHub con el auto-merge.",
        "Guardarlo como secreto SYNC_TOKEN en Settings, Secrets and variables, Actions.",
      ].join("\n"),
    );
    return 0;
  }

  const repositorio = process.env.GITHUB_REPOSITORY ?? "";
  const entorno = entornoConToken(token, repositorio);
  const git = (argumentos) => correr("git", argumentos, { env: entorno });
  const gh = (argumentos) =>
    correr("gh", argumentos, { env: { ...process.env, GH_TOKEN: token } });

  git(["fetch", "--no-tags", "origin", "main", "dev"]);
  const mainSha = git(["rev-parse", "origin/main"]);
  const devSha = git(["rev-parse", "origin/dev"]);

  if (decidirSincronizacion({ mainEsAncestroDeDev: esAncestro(mainSha, devSha) }).accion === "nada") {
    console.log("dev ya lleva la historia de main: nada que sincronizar.");
    return 0;
  }

  const commits = git(["log", "--oneline", "origin/main", "^origin/dev"]).split("\n").filter(Boolean);
  const rama = nombreDeRama({ mainSha, devSha });
  console.log(`Sincronizando ${commits.length} commit(s) de main en ${rama}.`);

  git(["checkout", "-B", rama, devSha]);
  git(["config", "user.name", "letra-grande-sync"]);
  git(["config", "user.email", "sync@letra-grande.invalid"]);

  let huboConflictos = false;
  try {
    git(["merge", "--no-edit", mainSha]);
  } catch {
    huboConflictos = true;
    git(["merge", "--abort"]);
  }

  // La decisión central, la misma que se prueba en los tests.
  let arbolIdentico = false;
  if (!huboConflictos) {
    try {
      git(["diff", "--quiet", devSha, "HEAD"]);
      arbolIdentico = true;
    } catch {
      arbolIdentico = false;
    }
  }
  const decision = decidirSincronizacion({
    mainEsAncestroDeDev: false,
    huboConflictos,
    arbolIdentico,
  });
  if (decision.accion !== "sincronizar") {
    console.error(decision.mensaje);
    return 1;
  }

  // Si una ejecución anterior dejó un PR de esta misma rama, se reutiliza.
  const abiertos = gh(["pr", "list", "--head", rama, "--state", "open", "--json", "number,url"])
    .trim();
  let prUrl = "";
  const previos = abiertos === "" ? [] : JSON.parse(abiertos);
  if (previos.length > 0) {
    prUrl = previos[0].url;
    console.log(`Ya había un PR abierto para ${rama}: ${prUrl}`);
  } else {
    git(["push", "--force", `https://github.com/${repositorio}.git`, `HEAD:refs/heads/${rama}`]);
    prUrl = gh([
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
  }

  // No se espera a las comprobaciones: se arma el auto-merge y GitHub fusiona
  // cuando check, e2e y review-report están en verde. Así el token no necesita
  // permisos sobre la API de comprobaciones, que los tokens fine-grained no
  // ofrecen, y el workflow no se queda media hora colgado esperando.
  try {
    gh(["pr", "merge", prUrl, "--merge", "--auto", "--delete-branch"]);
    console.log("Auto-merge armado: GitHub fusionará la sincronización cuando esté en verde.");
  } catch {
    // Si el repositorio no tiene el auto-merge activado, se intenta el merge
    // directo, que funciona cuando el PR ya está limpio y en verde.
    console.log("No se pudo armar el auto-merge; se intenta fusionar directamente.");
    gh(["pr", "merge", prUrl, "--merge", "--delete-branch"]);
    console.log("Sincronización fusionada.");
  }
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
