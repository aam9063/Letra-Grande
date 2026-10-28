// Lighthouse contra el build de producción (QA-05).
//
// Qué hace, en orden:
//   1. Arranca el servidor de Next en un puerto de loopback.
//   2. Espera a que responda la primera ruta (con un límite de tiempo).
//   3. Mide cada ruta del bloque `lighthouse` de budget.json y compara el
//      informe con los umbrales (scripts/check-lighthouse-budget.mjs, que tiene
//      sus propios tests).
//   4. Para el servidor siempre, también cuando una ruta falla.
//
// Vive aparte del verificador porque este es el único trozo que necesita un
// navegador; las reglas del presupuesto se prueban sin él.
//
// Uso local: pnpm build && pnpm perf:lighthouse
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as esperar } from "node:timers/promises";
import { combinarInformes, comprobarLighthouse, leerPresupuestoLighthouse } from "./check-lighthouse-budget.mjs";
import { medirConReintentos, mensajeSinMedida } from "./lighthouse-reintentos.mjs";

const PUERTO = Number(process.env.LG_PERF_PORT ?? 3210);
const PRESUPUESTO = process.env.LG_BUDGET_PATH ?? "apps/web/perf/budget.json";
const WEB_DIR = "apps/web";
const ESPERA_MAXIMA_MS = 120_000;
// Corridas por ruta. Lighthouse recomienda mediana de varias medidas en CI; con
// tres basta para que una corrida atipica no decida el veredicto y el job sigue
// entrando de sobra en su timeout.
// Corridas por ruta. Lighthouse recomienda mediana de varias medidas en CI; con
// tres basta para que una corrida atípica no decida el veredicto y el job sigue
// entrando de sobra en su timeout. Un valor inválido en la variable no debe
// dejar el job sin medir: se cae al 3.
const REPETICIONES = (() => {
  const pedidas = Number(process.env.LG_PERF_REPS ?? 3);
  return Number.isInteger(pedidas) && pedidas > 0 ? pedidas : 3;
})();

// Intentos por corrida. Una corrida de Lighthouse puede fallar entera sin que
// haya nada mal en la app: en el PR #76 el lanzador de Chrome falló en `/` y no
// en `/hoy`, en el mismo job. Se reintenta la corrida, sea cual sea el fallo de
// Lighthouse, porque clasificar el error por su texto sería frágil. Lo que no se
// hace nunca es aprobar una ruta que no se midió: si se agotan los intentos, la
// ruta falla.
const INTENTOS = (() => {
  const pedidos = Number(process.env.LG_PERF_INTENTOS ?? 2);
  return Number.isInteger(pedidos) && pedidos > 0 ? pedidos : 2;
})();

/** Resumen legible de la mediana, para que el log de la CI sirva como evidencia. */
function resumenMediana(informe, presupuesto) {
  const partes = [];
  for (const categoria of Object.keys(presupuesto.categorias ?? {})) {
    const score = informe.categories?.[categoria]?.score;
    partes.push(`${categoria} ${typeof score === "number" ? Math.round(score * 100) : "sin medir"}`);
  }
  for (const metrica of Object.keys(presupuesto.metricas ?? {})) {
    const valor = informe.audits?.[metrica]?.numericValue;
    if (typeof valor === "number") partes.push(`${metrica} ${Math.round(valor)}`);
  }
  return partes.join(", ");
}

/**
 * Arranca `next start` con el servidor ya construido. Se lanza el CLI de Next con
 * el propio binario de Node en vez de `pnpm exec`: en Windows, `spawn` de un
 * `.cmd` exige `shell: true`, y meter un shell en medio complica el cierre del
 * proceso. Así el proceso hijo es Node y se puede matar tal cual.
 */
function arrancarServidor() {
  const cli = join(process.cwd(), WEB_DIR, "node_modules", "next", "dist", "bin", "next");
  if (!existsSync(cli)) {
    throw new Error(`No se encuentra el CLI de Next en ${cli}. Ejecuta \`pnpm install\`.`);
  }
  const proceso = spawn(process.execPath, [cli, "start", "-p", String(PUERTO)], {
    cwd: WEB_DIR,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NODE_ENV: "production" },
  });
  let salida = "";
  proceso.stdout.on("data", (trozo) => {
    salida += trozo.toString();
  });
  proceso.stderr.on("data", (trozo) => {
    salida += trozo.toString();
  });
  return { proceso, salida: () => salida };
}

/**
 * Espera a que responda el servidor y comprueba que es el nuestro.
 *
 * Comprobar solo un 200 no basta: si el puerto ya está ocupado por otro
 * servidor (un `next dev` de otra sesión es el caso real), `next start` muere
 * por EADDRINUSE y Lighthouse mediría el build equivocado, con cifras que no
 * corresponden a nada. Por eso se exige que el proceso siga vivo y que el
 * servidor presente el manifiesto de este build: `/_next/static/<BUILD_ID>/...`
 * lleva el identificador que hay en disco.
 */
async function esperarServidor(buildId, proceso) {
  const limite = Date.now() + ESPERA_MAXIMA_MS;
  while (Date.now() < limite) {
    if (proceso.exitCode !== null) return { ok: false, motivo: "el servidor terminó antes de responder" };
    try {
      const respuesta = await fetch(`http://127.0.0.1:${PUERTO}/hoy`);
      if (respuesta.ok) {
        const manifiesto = await fetch(`http://127.0.0.1:${PUERTO}/_next/static/${buildId}/_buildManifest.js`);
        if (manifiesto.ok) return { ok: true };
        return {
          ok: false,
          motivo: `en el puerto ${PUERTO} responde otro servidor: no conoce el build ${buildId}`,
        };
      }
    } catch {
      // El servidor aún no escucha: se reintenta hasta el límite.
    }
    await esperar(500);
  }
  return { ok: false, motivo: `no respondió en ${ESPERA_MAXIMA_MS / 1000} s` };
}

/**
 * Entrada JS de Lighthouse. Se lanza con el binario de Node, no con el shim de
 * `node_modules/.bin`: en Windows ese shim es un `.cmd` y Node se niega a
 * arrancarlo sin un shell de por medio (EINVAL). La versión es la del lockfile,
 * nunca una descargada al vuelo por npx.
 */
function entradaLighthouse() {
  const entrada = join(process.cwd(), "node_modules", "lighthouse", "cli", "index.js");
  return existsSync(entrada) ? entrada : null;
}

function medirRuta({ entrada, ruta, ficheroSalida }) {
  return new Promise((resolver, rechazar) => {
    const proceso = spawn(
      process.execPath,
      [
        entrada,
        `http://127.0.0.1:${PUERTO}${ruta}`,
        "--quiet",
        "--output=json",
        `--output-path=${ficheroSalida}`,
        "--only-categories=performance,accessibility,best-practices,seo",
        // El runner de la CI no tiene entorno gráfico ni permisos de sandbox.
        "--chrome-flags=--headless=new --no-sandbox --disable-dev-shm-usage",
      ],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
    let error = "";
    proceso.stderr.on("data", (trozo) => {
      error += trozo.toString();
    });
    proceso.on("error", rechazar);
    proceso.on("exit", (codigo) => {
      if (codigo === 0) resolver();
      else rechazar(new Error(`Lighthouse falló en ${ruta} (código ${codigo}):\n${error}`));
    });
  });
}

async function main() {
  const presupuesto = leerPresupuestoLighthouse(PRESUPUESTO);
  const rutas = presupuesto.rutas ?? [];
  if (rutas.length === 0) {
    console.error(`${PRESUPUESTO} no declara rutas que medir en "lighthouse.rutas".`);
    return 1;
  }

  const entrada = entradaLighthouse();
  if (!entrada) {
    console.error(
      "No está instalado Lighthouse. Ejecuta `pnpm install` en la raíz del repositorio.",
    );
    return 1;
  }

  const ficheroBuildId = join(WEB_DIR, ".next", "BUILD_ID");
  if (!existsSync(ficheroBuildId)) {
    console.error("Falta la build de producción. Ejecuta `pnpm build` antes de medir con Lighthouse.");
    return 1;
  }
  const buildId = readFileSync(ficheroBuildId, "utf8").trim();

  const salida = mkdtempSync(join(tmpdir(), "lg-lighthouse-"));
  const servidor = arrancarServidor();

  try {
    const listo = await esperarServidor(buildId, servidor.proceso);
    if (!listo.ok) {
      console.error(
        `No se puede medir: ${listo.motivo}.\nUn servidor en el puerto ${PUERTO} que no sea este build daría cifras falsas; elige otro con LG_PERF_PORT.\n${servidor.salida()}`,
      );
      return 1;
    }

    let fallos = 0;
    for (const [indiceRuta, ruta] of rutas.entries()) {
      const corridas = [];
      let errorDeMedida = null;
      for (let corrida = 0; corrida < REPETICIONES; corrida += 1) {
        const ficheroSalida = join(salida, `informe-${indiceRuta}-${corrida}.json`);
        // Un intento anterior puede haber dejado un informe a medias: se borra
        // para que nunca se lea el de una corrida que no terminó.
        rmSync(ficheroSalida, { force: true });
        try {
          await medirConReintentos({
            medir: () => medirRuta({ entrada, ruta, ficheroSalida }),
            intentos: INTENTOS,
            avisar: (intento) =>
              console.log(`  ${ruta}: el intento ${intento} de ${INTENTOS} falló, se reintenta`),
          });
          corridas.push(JSON.parse(readFileSync(ficheroSalida, "utf8")));
        } catch (error) {
          errorDeMedida = error;
          break;
        }
      }

      if (errorDeMedida) {
        console.error(mensajeSinMedida({ ruta, intentos: INTENTOS, error: errorDeMedida }));
        fallos += 1;
        continue;
      }

      // Se presupuesta la mediana, no el pico de una corrida: el runner es
      // compartido y una sola medida de Lighthouse oscila demasiado (TBT de 329
      // ms en una corrida y de 28 en la siguiente, con el mismo build).
      const informe = combinarInformes(corridas);
      const resultado = comprobarLighthouse({ ruta, informe, presupuesto });
      const print = resultado.status === "fail" ? console.error : console.log;
      print(resultado.message);
      print(`  Mediana de ${corridas.length} corridas en ${ruta}: ${resumenMediana(informe, presupuesto)}`);
      if (resultado.status === "fail") fallos += 1;
    }

    return fallos > 0 ? 1 : 0;
  } finally {
    servidor.proceso.kill();
    rmSync(salida, { recursive: true, force: true });
  }
}

process.exit(await main());
