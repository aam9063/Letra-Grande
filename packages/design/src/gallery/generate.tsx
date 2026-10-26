import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { Gallery } from "./Gallery";

/**
 * Generador de la galería estática. Usa react-dom/server y la hoja base
 * incrustada en un `<style>`: sin bundler, sin dependencias nuevas y sin
 * ninguna petición de red.
 */

// Vitest ejecuta el paquete con cwd en packages/design.
const dirSrc = join(process.cwd(), "src");

export function buildGalleryHtml(): string {
  const css = readFileSync(join(dirSrc, "base.css"), "utf8");
  const cuerpo = renderToStaticMarkup(<Gallery />);
  return [
    "<!DOCTYPE html>",
    '<html lang="es">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    "<title>Galería de Letra Grande</title>",
    `<style>\n${css}\n</style>`,
    "</head>",
    `<body>\n${cuerpo}\n</body>`,
    "</html>",
    "",
  ].join("\n");
}
