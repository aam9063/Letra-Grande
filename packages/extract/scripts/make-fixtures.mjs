/**
 * Generador de fixtures de PDF para los tests de @letra-grande/extract.
 *
 * Escribe a mano un PDF mínimo, sin dependencias y sin capa de compresión:
 * los flujos de texto van sin comprimir para que el fixture sea legible
 * y reproducible. Todo el contenido es ficticio: empresa, persona e
 * importes inventados. Nunca debe contener datos reales.
 *
 * Uso: node scripts/make-fixtures.mjs (desde la raiz del paquete).
 * Regenera:
 *   fixtures/factura-sintetica.pdf: 3 páginas con texto conocido.
 *   fixtures/escaneado-sintetico.pdf: 1 pagina sin capa de texto.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const dirFixtures = join(raiz, "fixtures");

/** Escapa los caracteres que el PDF no admite dentro de un literal de cadena. */
function escapar(texto) {
  return texto.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/** Convierte lineas de texto en un flujo de contenido con operadores BT/Tj. */
function flujoTexto(lineas) {
  if (lineas.length === 0) {
    return "";
  }
  const partes = ["BT", "/F1 12 Tf", "72 760 Td"];
  lineas.forEach((linea, indice) => {
    if (indice > 0) {
      partes.push("0 -20 Td");
    }
    partes.push(`(${escapar(linea)}) Tj`);
  });
  partes.push("ET");
  return partes.join("\n");
}

/**
 * Monta el PDF completo con tabla xref calculada.
 * objetos: array de cuerpos (sin el índice "N 0 obj"); el orden define el número.
 */
function montarPdf(objetos) {
  const trozos = ["%PDF-1.4\n"];
  const offsets = [];
  objetos.forEach((cuerpo, indice) => {
    offsets.push(trozos.join("").length);
    trozos.push(`${indice + 1} 0 obj\n${cuerpo}\nendobj\n`);
  });
  const inicioXref = trozos.join("").length;
  const xref = ["xref", `0 ${objetos.length + 1}`, "0000000000 65535 f "];
  for (const offset of offsets) {
    xref.push(`${String(offset).padStart(10, "0")} 00000 n `);
  }
  trozos.push(
    xref.join("\n") + "\n",
    `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\n`,
    `startxref\n${inicioXref}\n%%EOF\n`,
  );
  return Buffer.from(trozos.join(""), "latin1");
}

/** Construye un PDF con el número de páginas y flujos de contenido dados. */
function crearPdf(flujos) {
  const primera = 3;
  const kids = flujos.map((_, indice) => `${primera + indice} 0 R`).join(" ");
  const objetos = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${kids}] /Count ${flujos.length} >>`,
  ];
  // La fuente compartida va después de las páginas, en el último número.
  const numeroFuente = primera + flujos.length;
  flujos.forEach((flujo, indice) => {
    const numeroContenido = numeroFuente + 1 + indice;
    objetos.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] ` +
        `/Resources << /Font << /F1 ${numeroFuente} 0 R >> >> /Contents ${numeroContenido} 0 R >>`,
    );
  });
  objetos.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  flujos.forEach((flujo) => {
    const bytes = Buffer.byteLength(flujo, "latin1");
    objetos.push(`<< /Length ${bytes} >>\nstream\n${flujo}\nendstream`);
  });
  return montarPdf(objetos);
}

// Factura sintética: 3 páginas con texto conocido y datos ficticios.
const factura = crearPdf([
  flujoTexto([
    "Comercializadora Ficticia S.L.",
    "Factura numero 2026-0001",
    "Cliente: Perico Palotes, dato inventado",
    "Periodo de consumo: enero de 2026",
    "Importe total: 42,50 EUR",
  ]),
  flujoTexto(["Pagina 2: detalle de consumo inventado", "Consumo estimado: 100 kWh"]),
  flujoTexto(["Pagina 3: condiciones de ejemplo"]),
]);

// Escaneado sintético: una página sin ningún texto, como un PDF de foto.
const escaneado = crearPdf([flujoTexto([])]);

mkdirSync(dirFixtures, { recursive: true });
writeFileSync(join(dirFixtures, "factura-sintetica.pdf"), factura);
writeFileSync(join(dirFixtures, "escaneado-sintetico.pdf"), escaneado);
console.log("Fixtures escritos en", dirFixtures);
