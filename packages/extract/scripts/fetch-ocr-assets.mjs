// Regenera packages/extract/assets/ocr a partir de las dependencias instaladas
// (tesseract.js y tesseract.js-core) y del modelo `best` de español de
// tessdata_best. Existe para que los activos sean reproducibles y auditables:
// cada fichero lleva su sha256 y, si no coincide, el script falla en vez de
// dejar un binario a medias.
//
// Uso: pnpm --filter @letra-grande/extract ocr:assets
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const paquete = fileURLToPath(new URL("..", import.meta.url));
const destino = join(paquete, "assets", "ocr");

/** Commit de tessdata_best que fija el modelo: el que se versiona aquí. */
const COMMIT_TESSDATA = "9ddc24e750eec0994223a9edc3fcb434a2244f3b";

const MODELO = {
  url: `https://raw.githubusercontent.com/tesseract-ocr/tessdata_best/${COMMIT_TESSDATA}/spa.traineddata`,
  sha256: "e2c1ffdad8b30f26c45d4017a9183d3a7f9aa69e59918be4f88b126fac99ab2c",
};

// Resolución desde tesseract.js: tesseract.js-core es dependencia suya, no nuestra.
const dirTesseract = dirname(dirname(fileURLToPath(import.meta.resolve("tesseract.js"))));
const requerirDesdeTesseract = createRequire(join(dirTesseract, "package.json"));
const dirCore = dirname(requerirDesdeTesseract.resolve("tesseract.js-core/package.json"));

/** Ficheros que se copian tal cual desde las dependencias instaladas. */
const COPIAS = [
  { origen: join(dirTesseract, "dist", "worker.min.js"), nombre: "worker.min.js" },
  {
    origen: join(dirCore, "tesseract-core-relaxedsimd-lstm.wasm.js"),
    nombre: "tesseract-core-relaxedsimd-lstm.wasm.js",
  },
  {
    origen: join(dirCore, "tesseract-core-simd-lstm.wasm.js"),
    nombre: "tesseract-core-simd-lstm.wasm.js",
  },
  { origen: join(dirCore, "tesseract-core-lstm.wasm.js"), nombre: "tesseract-core-lstm.wasm.js" },
  {
    origen: join(dirTesseract, "LICENSE.md"),
    nombre: "LICENSE-tesseract.js.txt",
  },
  { origen: join(dirCore, "LICENSE"), nombre: "LICENSE-tesseract.js-core.txt" },
];

// La licencia llegó al repositorio después del modelo, así que se fija a su propio commit.
const LICENCIA_TESSDATA = {
  url: "https://raw.githubusercontent.com/tesseract-ocr/tessdata_best/e744fa9056c07feeba2e9d10d64f834c176d546b/LICENSE",
  nombre: "LICENSE-tessdata.txt",
  sha256: "a6cba85bc92e0cff7a450b1d873c0eaa2e9fc96bf472df0247a26bec77bf3ff9",
};

function sha256(datos) {
  return createHash("sha256").update(datos).digest("hex");
}

mkdirSync(destino, { recursive: true });

for (const { origen, nombre } of COPIAS) {
  copyFileSync(origen, join(destino, nombre));
  const datos = readFileSync(join(destino, nombre));
  console.log(`${nombre}: ${datos.length} bytes, sha256 ${sha256(datos)}`);
}

async function descargar({ url, nombre, sha256: esperado }) {
  const respuesta = await fetch(url);
  if (!respuesta.ok) {
    throw new Error(`No se ha podido descargar ${url}: ${respuesta.status}`);
  }
  const datos = new Uint8Array(await respuesta.arrayBuffer());
  const obtenido = sha256(datos);
  if (esperado !== undefined && obtenido !== esperado) {
    throw new Error(`sha256 inesperado para ${url}: ${obtenido} (se esperaba ${esperado})`);
  }
  const ruta = join(destino, nombre);
  writeFileSync(ruta, datos);
  console.log(`${nombre}: ${datos.length} bytes, sha256 ${obtenido}`);
}

try {
  await descargar({ ...MODELO, nombre: "spa.traineddata" });
  await descargar(LICENCIA_TESSDATA);
} catch (error) {
  // Un activo a medias es peor que ninguno: el OCR fallaría lejos, en el navegador.
  rmSync(join(destino, "spa.traineddata"), { force: true });
  throw error;
}
