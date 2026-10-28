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
import { comprobarLighthouse, leerPresupuestoLighthouse } from "./check-lighthouse-budget.mjs";

const PUERTO = Number(process.env.LG_PERF_PORT ?? 3210);
const PRESUPUESTO = process.env.LG_BUDGET_PATH ?? "apps/web/perf/budget.json";
const WEB_DIR = "apps/web";
const ESPERA_MAXIMA_MS = 120_000;

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

async function esperarServidor() {
  const limite = Date.now() + ESPERA_MAXIMA_MS;
  while (Date.now() < limite) {
    try {
      const respuesta = await fetch(`http://127.0.0.1:${PUERTO}/hoy`);
      if (respuesta.ok) return true;
    } catch {
      // El servidor aún no escucha: se reintenta hasta el límite.
    }
    await esperar(500);
  }
  return false;
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

  if (!existsSync(join(WEB_DIR, ".next", "BUILD_ID"))) {
    console.error("Falta la build de producción. Ejecuta `pnpm build` antes de medir con Lighthouse.");
    return 1;
  }

  const salida = mkdtempSync(join(tmpdir(), "lg-lighthouse-"));
  const servidor = arrancarServidor();

  try {
    if (!(await esperarServidor())) {
      console.error(
        `El servidor de producción no respondió en ${ESPERA_MAXIMA_MS / 1000} s.\n${servidor.salida()}`,
      );
      return 1;
    }

    let fallos = 0;
    for (const [indice, ruta] of rutas.entries()) {
      const ficheroSalida = join(salida, `informe-${indice}.json`);
      try {
        await medirRuta({ entrada, ruta, ficheroSalida });
      } catch (error) {
        console.error(error.message);
        fallos += 1;
        continue;
      }

      const informe = JSON.parse(readFileSync(ficheroSalida, "utf8"));
      const resultado = comprobarLighthouse({ ruta, informe, presupuesto });
      const print = resultado.status === "fail" ? console.error : console.log;
      print(resultado.message);
      if (resultado.status === "fail") fallos += 1;
    }

    return fallos > 0 ? 1 : 0;
  } finally {
    servidor.proceso.kill();
    rmSync(salida, { recursive: true, force: true });
  }
}

process.exit(await main());
