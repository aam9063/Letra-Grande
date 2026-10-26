// Generador de fixtures sinteticas: escribe los documentos originales de
// prueba en apps/web/generated. Todo dato es ficticio, inventado para las
// pruebas: nunca una factura real, nunca una empresa o persona real.
//
// Ejecutar con: pnpm fixtures (desde apps/web)
//
// No se anade ninguna dependencia: el PDF se emite a mano, con un stream de
// texto sin comprimir y una tabla xref calculada aqui.
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const destino = join(aqui, "..", "..", "generated", "factura-luz-sintetica.pdf");

// Lineas de la factura sintetica. Sin tildes en el codigo para no depender de
// la codificacion del terminal: el texto se codifica en latin1 al escribirlo.
const lineas = [
  "Factura sintetica de luz (datos ficticios)",
  "Comercializadora Ejemplo Imaginaria S.A. (empresa inventada)",
  "Cliente: Ana Ejemplo, documento 00000000T (dato ficticio)",
  "Periodo de consumo: del 01/03/2025 al 31/03/2025",
  "Importe total: 63,42 EUR",
];

function escapar(texto) {
  return texto.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

const contenido = [
  "BT",
  "/F1 11 Tf",
  "50 790 Td",
  "16 TL",
  ...lineas.map((l) => `(${escapar(l)}) Tj T*`),
  "ET",
].join("\n");

const objetos = [
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
  "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] " +
    "/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  `<< /Length ${Buffer.byteLength(contenido, "latin1")} >>\nstream\n${contenido}\nendstream`,
];

// Ensamblado con offsets exactos para la tabla xref.
let pdf = "%PDF-1.4\n";
const offsets = [];
objetos.forEach((cuerpo, i) => {
  offsets.push(Buffer.byteLength(pdf, "latin1"));
  pdf += `${i + 1} 0 obj\n${cuerpo}\nendobj\n`;
});

const inicioXref = Buffer.byteLength(pdf, "latin1");
pdf += `xref\n0 ${objetos.length + 1}\n`;
pdf += "0000000000 65535 f \r\n";
for (const offset of offsets) {
  pdf += `${String(offset).padStart(10, "0")} 00000 n \r\n`;
}
pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`;

mkdirSync(dirname(destino), { recursive: true });
writeFileSync(destino, Buffer.from(pdf, "latin1"));

// Autocomprobacion: cada offset de la xref debe apuntar a su objeto.
const leido = Buffer.from(pdf, "latin1");
for (let i = 0; i < offsets.length; i++) {
  const marca = leido.subarray(offsets[i], offsets[i] + 10).toString("latin1");
  if (!marca.startsWith(`${i + 1} 0 obj`)) {
    console.error(`xref roto en el objeto ${i + 1}`);
    process.exit(1);
  }
}
console.log(`Generada ${destino} (${leido.length} bytes, xref verificada)`);
