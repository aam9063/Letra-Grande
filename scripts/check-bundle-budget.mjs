// Presupuesto de rendimiento de la web (QA-05).
//
// Dos comprobaciones sobre una build de producción (`pnpm build`), sin navegador
// y sin red:
//
// 1. Tamaño de la primera carga: el JavaScript que referencia el HTML
//    prerenderizado de cada ruta, medido en gzip. Es lo que descarga alguien
//    antes de ver la pantalla, así que es la cifra que se presupuesta.
// 2. Camino crítico: ningún marcador prohibido (el OCR y el lector de PDF, que
//    pesan megas y deben cargarse bajo demanda) puede aparecer en ese mismo
//    JavaScript.
//
// El presupuesto vive en apps/web/perf/budget.json y está versionado: subirlo es
// una decisión consciente que se ve en el diff del PR, no un efecto colateral.
//
// Uso local:
//   pnpm build && pnpm perf:bundle
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";

const PRESUPUESTO_POR_DEFECTO = new URL("../apps/web/perf/budget.json", import.meta.url);

/**
 * Convierte la ruta de un HTML prerenderizado en la ruta pública de la app.
 * `index.html` es la raíz y los ficheros que empiezan por `_` son internos de
 * Next (`_not-found`, `_global-error`): no se presupuestan.
 */
function rutaPublica(relativa) {
  const sinExtension = relativa.replace(/\.html$/, "").split(sep).join("/");
  const nombre = basename(sinExtension);
  if (nombre.startsWith("_")) return null;
  if (sinExtension === "index") return "/";
  return `/${sinExtension.replace(/\/index$/, "")}`;
}

function scriptsDeHtml(html) {
  return [
    ...new Set(
      [...html.matchAll(/<script[^>]+src=["'](\/_next\/[^"']+\.js)["']/g)].map((m) => m[1]),
    ),
  ];
}

function htmlsPrerenderizados(buildDir) {
  const raiz = join(buildDir, "server", "app");
  if (!existsSync(raiz)) return [];

  const encontrados = [];
  const recorrer = (dir) => {
    for (const entrada of readdirSync(dir, { withFileTypes: true })) {
      const completo = join(dir, entrada.name);
      if (entrada.isDirectory()) recorrer(completo);
      else if (entrada.name.endsWith(".html")) encontrados.push(completo);
    }
  };
  recorrer(raiz);
  return encontrados;
}

/**
 * Mide la primera carga de cada ruta prerenderizada, en gzip y en bytes sin
 * comprimir. Un mismo chunk compartido por dos rutas se mide una vez por ruta:
 * cada ruta paga su propia primera carga.
 */
export function medirPrimeraCarga({ buildDir }) {
  const rutas = {};
  const tamanos = new Map();

  const tamanoDe = (src) => {
    if (tamanos.has(src)) return tamanos.get(src);
    // "/_next/static/chunks/x.js" -> "<buildDir>/static/chunks/x.js"
    const fichero = join(buildDir, src.replace(/^\/_next\//, ""));
    const medido = existsSync(fichero)
      ? { gzip: gzipSync(readFileSync(fichero)).length, raw: statSync(fichero).size }
      : null;
    tamanos.set(src, medido);
    return medido;
  };

  for (const html of htmlsPrerenderizados(buildDir)) {
    const ruta = rutaPublica(relative(join(buildDir, "server", "app"), html));
    if (!ruta) continue;

    const srcs = scriptsDeHtml(readFileSync(html, "utf8"));
    const ficheros = [];
    let gzip = 0;
    let raw = 0;
    const ausentes = [];
    for (const src of srcs) {
      const medido = tamanoDe(src);
      if (!medido) {
        ausentes.push(src);
        continue;
      }
      ficheros.push({ src, ...medido });
      gzip += medido.gzip;
      raw += medido.raw;
    }

    rutas[ruta] = { gzip, raw, ficheros, ausentes };
  }

  return { rutas };
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

/**
 * Compara las medidas con el presupuesto. Falla cuando una ruta se pasa, cuando
 * aparece una ruta nueva sin presupuesto (un crecimiento silencioso) y cuando
 * una ruta presupuestada no se midió (build incompleto o ruta borrada).
 */
export function comprobarPresupuesto({ medidas, presupuesto }) {
  const violaciones = [];
  const rutasMedidas = medidas.rutas ?? {};

  if (Object.keys(rutasMedidas).length === 0) {
    return {
      status: "fail",
      violaciones,
      message:
        "No hay ninguna ruta prerenderizada que medir: falta la build. Ejecuta `pnpm build` antes de comprobar el presupuesto.",
    };
  }

  for (const [ruta, limite] of Object.entries(presupuesto.porRuta ?? {})) {
    const medida = rutasMedidas[ruta];
    if (!medida) {
      violaciones.push({
        tipo: "ruta-ausente",
        detalle: `${ruta} está en el presupuesto pero no se midió en la build.`,
      });
      continue;
    }
    // Un chunk referenciado que no está en la build es un build incompleto y se
    // dice con su nombre; antes que "sin scripts", que es otra cosa.
    if (medida.ausentes.length > 0) {
      violaciones.push({
        tipo: "chunk-ausente",
        detalle: `${ruta} referencia ${medida.ausentes.join(", ")}, que no está en la build.`,
      });
      continue;
    }
    if (medida.ficheros.length === 0) {
      // Si Next cambia la forma del HTML (otra etiqueta, otro atributo), el
      // extractor no encuentra nada y la ruta mediría 0 KiB: un aprobado que no
      // ha mirado nada. Se trata como violación, no como build perfecto.
      violaciones.push({
        tipo: "sin-scripts",
        detalle: `${ruta} no referencia ningún JavaScript de la build: el medidor no ha podido medir nada.`,
      });
      continue;
    }
    if (medida.gzip > limite) {
      violaciones.push({
        tipo: "ruta-excedida",
        detalle: `${ruta} descarga ${kb(medida.gzip)} de primera carga y su presupuesto es ${kb(limite)}.`,
      });
    }
  }

  for (const ruta of Object.keys(rutasMedidas)) {
    if (!(ruta in (presupuesto.porRuta ?? {}))) {
      violaciones.push({
        tipo: "ruta-sin-presupuesto",
        detalle: `${ruta} no tiene presupuesto declarado. Añádela a apps/web/perf/budget.json.`,
      });
    }
  }

  const totalMedido = Object.values(rutasMedidas).reduce((suma, r) => suma + r.gzip, 0);
  if (presupuesto.totalGzip !== undefined && totalMedido > presupuesto.totalGzip) {
    violaciones.push({
      tipo: "total-excedido",
      detalle: `El total de primera carga suma ${kb(totalMedido)} y el presupuesto es ${kb(presupuesto.totalGzip)}.`,
    });
  }

  if (violaciones.length > 0) {
    return {
      status: "fail",
      violaciones,
      message: [
        "El presupuesto de rendimiento se ha superado:",
        ...violaciones.map((v) => `  - ${v.detalle}`),
        "",
        "Si el crecimiento es intencionado, actualiza apps/web/perf/budget.json en este mismo PR y explica en la descripción qué se gana a cambio.",
      ].join("\n"),
    };
  }

  return {
    status: "pass",
    violaciones,
    message: `Presupuesto de rendimiento cumplido: ${Object.keys(rutasMedidas).length} rutas, ${kb(totalMedido)} de primera carga en total.`,
  };
}

/**
 * Camino crítico: los marcadores prohibidos (OCR, lector de PDF) solo pueden
 * aparecer en chunks que no se cargan de entrada. Un chunk compartido por todas
 * las rutas es la primera carga más cara posible, así que basta con mirar los
 * ficheros que mide `medirPrimeraCarga`.
 */
export function comprobarCaminoCritico({ buildDir, medidas, prohibidos }) {
  const infracciones = [];
  const revisados = new Map();

  for (const [ruta, medida] of Object.entries(medidas.rutas ?? {})) {
    for (const fichero of medida.ficheros) {
      if (!revisados.has(fichero.src)) {
        const rutaFichero = join(buildDir, fichero.src.replace(/^\/_next\//, ""));
        const contenido = existsSync(rutaFichero) ? readFileSync(rutaFichero, "utf8") : "";
        revisados.set(fichero.src, contenido);
      }
      const contenido = revisados.get(fichero.src);
      for (const marcador of prohibidos) {
        if (contenido.includes(marcador)) {
          infracciones.push({ ruta, fichero: fichero.src, marcador });
        }
      }
    }
  }

  if (infracciones.length > 0) {
    const detalle = infracciones
      .map((i) => `  - ${i.marcador} aparece en ${i.fichero}, que se carga de entrada en ${i.ruta}.`)
      .join("\n");
    return {
      status: "fail",
      infracciones,
      message: [
        "Hay dependencias pesadas en el camino crítico:",
        detalle,
        "",
        "Estas dependencias se cargan bajo demanda (import() dentro de la acción que las usa), nunca en un layout ni en un import de nivel superior.",
      ].join("\n"),
    };
  }

  return {
    status: "pass",
    infracciones,
    message: `Camino crítico limpio: ni ${prohibidos.join(" ni ")} en la primera carga.`,
  };
}

export function leerPresupuesto(ruta = PRESUPUESTO_POR_DEFECTO) {
  const camino = ruta instanceof URL ? ruta : pathToFileURL(resolve(ruta));
  return JSON.parse(readFileSync(camino, "utf8"));
}

function runCli() {
  const buildDir = resolve(process.argv[2] ?? "apps/web/.next");
  const presupuesto = leerPresupuesto(process.env.LG_BUDGET_PATH ?? PRESUPUESTO_POR_DEFECTO);
  const medidas = medirPrimeraCarga({ buildDir });

  const tamano = comprobarPresupuesto({ medidas, presupuesto });
  const camino = comprobarCaminoCritico({
    buildDir,
    medidas,
    prohibidos: presupuesto.caminoCritico?.prohibidos ?? [],
  });

  for (const resultado of [tamano, camino]) {
    const print = resultado.status === "fail" ? console.error : console.log;
    print(resultado.message);
  }

  return tamano.status === "fail" || camino.status === "fail" ? 1 : 0;
}

// Windows no distingue mayúsculas en rutas, igual que en el resto de scripts.
const isMain =
  Boolean(process.argv[1]) &&
  import.meta.url.toLowerCase() === pathToFileURL(resolve(process.argv[1])).href.toLowerCase();
if (isMain) {
  process.exit(runCli());
}
