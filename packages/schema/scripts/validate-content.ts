// Validador mínimo del contenido, provisional. CORE-01 lo sustituye por el de la sección 8.7.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const root = fileURLToPath(new URL("../../../content", import.meta.url));
const collections = ["companies", "authorities", "procedures"];
const problems: string[] = [];
let count = 0;

for (const dir of collections) {
  let files: string[] = [];
  try {
    files = readdirSync(join(root, dir)).filter((f) => /\.ya?ml$/.test(f));
  } catch {
    continue;
  }
  for (const file of files) {
    try {
      parse(readFileSync(join(root, dir, file), "utf8"));
      count += 1;
    } catch (error) {
      problems.push(`${dir}/${file}: YAML inválido: ${(error as Error).message}`);
    }
  }
}

if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`Contenido OK: ${count} ficha(s) válidas.`);
