import type { NextConfig } from "next";

// Los paquetes del workspace se publican como fuente TypeScript sin paso de build
// y usan especificadores ESM ".js" en sus imports internos (la convención correcta
// para ESM). TypeScript los resuelve con moduleResolution: Bundler, pero webpack
// no: con extensionAlias le decimos que "./x.js" puede ser "./x.ts" o "./x.tsx".
// Corremos con --webpack (ver scripts): Turbopack (por defecto en Next 16) aún no
// soporta extensionAlias (turbopack.resolveExtensionAlias llega en versiones
// posteriores a la 16.4.3).
const nextConfig: NextConfig = {
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
