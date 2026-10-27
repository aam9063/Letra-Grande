import type { NextConfig } from "next";

// Los paquetes del workspace se publican como fuente TypeScript sin paso de build
// y usan especificadores ESM ".js" en sus imports internos (la convención correcta
// para ESM). TypeScript los resuelve con moduleResolution: Bundler, pero webpack
// no: con extensionAlias le decimos que "./x.js" puede ser "./x.ts" o "./x.tsx".
// Corremos con --webpack (ver scripts): Turbopack (por defecto en Next 16) aún no
// soporta extensionAlias (turbopack.resolveExtensionAlias llega en versiones
// posteriores a la 16.4.3).
//
// Dos modos de build en la misma app (ver docs/desktop.md, secciones 3 y 6):
// sin LG_DESKTOP se construye la web de servidor (por defecto) y con LG_DESKTOP=1
// se construye la exportación estática para el escritorio (DESK-01). El modo
// escritorio usa un distDir propio (dist-desktop) para no pisar la salida .next
// de la web. transpilePackages y el hook webpack con extensionAlias se mantienen
// en los dos modos: los paquetes del workspace son fuentes TypeScript en los dos.
//
// Por qué pageExtensions sin "ts" en modo escritorio: la ruta de API
// (src/app/api/assistant/route.ts) es un archivo .ts y output: "export" rechaza
// los manejadores POST, así que el build fallaría. Todas las páginas y layouts
// son .tsx, de modo que quitar "ts" de pageExtensions deja fuera route.ts (y con
// él su carpeta api) sin renombrar ni duplicar nada, y las páginas siguen
// entrando en la exportación. En modo web se usan los valores por defecto.
const desktop = process.env.LG_DESKTOP === "1";

const nextConfig: NextConfig = {
  ...(desktop
    ? {
        output: "export" as const,
        distDir: "dist-desktop",
        // Sin next/image hoy, pero la exportación estática exige el cargador
        // sin optimizar si alguna página lo añade más adelante. No afecta a la web.
        images: { unoptimized: true },
        pageExtensions: ["tsx", "jsx", "js"],
      }
    : {}),
  transpilePackages: [
    "@letra-grande/schema",
    "@letra-grande/privacy",
    "@letra-grande/ai",
    "@letra-grande/vault",
    "@letra-grande/design",
  ],
  webpack(config) {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".jsx": [".tsx", ".jsx"],
    };
    return config;
  },
};

export default nextConfig;
