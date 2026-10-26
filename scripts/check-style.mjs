import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";

// fileURLToPath y no pathname: en Windows pathname devuelve "/C:/..." y rompe el recorrido.
const root = fileURLToPath(new URL("..", import.meta.url));
const IGNORE = new Set(["node_modules", ".next", ".git", "dist", "coverage", ".cache"]);
const EXT = new Set([".md", ".yaml", ".yml", ".ts", ".tsx", ".mjs", ".json"]);
// Generado por herramientas, no se edita a mano y no sigue nuestras reglas:
// `next dev` reescribe apps/web/AGENTS.md en cada arranque.
const IGNORE_FILES = new Set(["apps/web/AGENTS.md"]);
// Material de diseño de referencia (maquetas exportadas, UI-04): sus textos
// siguen las reglas de la herramienta, no las nuestras.
const IGNORE_DIRS = new Set(["DesignUI"]);
const FORBIDDEN = [
  { char: String.fromCharCode(0x2014), name: "raya larga (em dash)" },
  { char: String.fromCharCode(0x2013), name: "media raya (en dash)" },
];
const problems = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (IGNORE.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) { if (!IGNORE_DIRS.has(entry)) walk(full); continue; }
    if (!EXT.has(extname(entry)) || entry === "pnpm-lock.yaml") continue;
    if (IGNORE_FILES.has(relative(root, full).split("\\").join("/"))) continue;
    readFileSync(full, "utf8").split("\n").forEach((line, i) => {
      for (const f of FORBIDDEN) {
        if (line.includes(f.char)) problems.push(`${relative(root, full)}:${i + 1}: ${f.name}`);
      }
    });
  }
}

walk(root);
if (problems.length) { console.error("Problemas de estilo:\n" + problems.join("\n")); process.exit(1); }
console.log("Estilo OK.");
