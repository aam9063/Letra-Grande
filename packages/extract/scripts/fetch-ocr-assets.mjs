// Regenera packages/extract/assets/ocr a partir de las dependencias instaladas
// (tesseract.js y tesseract.js-core) y de tessdata_best, y comprueba cada
// fichero contra assets/ocr/manifest.json.
//
// Existe para que los activos sean reproducibles y auditables: el manifiesto
// fija el tamaño y el sha256 de cada uno, y tanto este script como la suite de
// tests fallan si algo no cuadra. Un binario a medias rompería el OCR lejos, ya
// en el navegador, así que se comprueba aquí.
//
// Uso: pnpm --filter @letra-grande/extract ocr:assets
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const paquete = fileURLToPath(new URL("..", import.meta.url));
const destino = join(paquete, "assets", "ocr");
const manifiesto = JSON.parse(readFileSync(join(destino, "manifest.json"), "utf8"));

// Resolución desde tesseract.js: tesseract.js-core es dependencia suya, no nuestra.
const dirTesseract = dirname(dirname(fileURLToPath(import.meta.resolve("tesseract.js"))));
const requerirDesdeTesseract = createRequire(join(dirTesseract, "package.json"));
const dirCore = dirname(requerirDesdeTesseract.resolve("tesseract.js-core/package.json"));

/** De dónde sale cada fichero que no se descarga. */
const ORIGENES_LOCALES = {
  "worker.min.js": join(dirTesseract, "dist", "worker.min.js"),
  "tesseract-core-relaxedsimd-lstm.wasm.js": join(
    dirCore,
    "tesseract-core-relaxedsimd-lstm.wasm.js",
  ),
  "tesseract-core-simd-lstm.wasm.js": join(dirCore, "tesseract-core-simd-lstm.wasm.js"),
  "tesseract-core-lstm.wasm.js": join(dirCore, "tesseract-core-lstm.wasm.js"),
  "LICENSE-tesseract.js.txt": join(dirTesseract, "LICENSE.md"),
  "LICENSE-tesseract.js-core.txt": join(dirCore, "LICENSE"),
};

function sha256(datos) {
  return createHash("sha256").update(datos).digest("hex");
}

/** Comprueba tamaño y hash contra el manifiesto. */
function verificar(ficha, ruta) {
  const datos = readFileSync(ruta);
  if (datos.length !== ficha.bytes) {
    throw new Error(
      `${ficha.name}: ${datos.length} bytes, el manifiesto dice ${ficha.bytes}. Actualiza el manifiesto si el cambio es intencionado.`,
    );
  }
  const obtenido = sha256(datos);
  if (obtenido !== ficha.sha256) {
    throw new Error(
      `${ficha.name}: sha256 ${obtenido}, el manifiesto dice ${ficha.sha256}. Actualiza el manifiesto si el cambio es intencionado.`,
    );
  }
  console.log(`${ficha.name}: ${datos.length} bytes, sha256 ${obtenido}`);
}

async function descargar(ficha, ruta) {
  const respuesta = await fetch(ficha.origin);
  if (!respuesta.ok) {
    throw new Error(`No se ha podido descargar ${ficha.origin}: ${respuesta.status}`);
  }
  writeFileSync(ruta, new Uint8Array(await respuesta.arrayBuffer()));
}

mkdirSync(destino, { recursive: true });

for (const ficha of manifiesto.files) {
  const ruta = join(destino, ficha.name);
  if (ficha.origin.startsWith("https://")) {
    await descargar(ficha, ruta);
  } else {
    const origenLocal = ORIGENES_LOCALES[ficha.name];
    if (origenLocal === undefined) {
      throw new Error(`${ficha.name}: el manifiesto no dice de dónde sale.`);
    }
    copyFileSync(origenLocal, ruta);
  }
  verificar(ficha, ruta);
}
