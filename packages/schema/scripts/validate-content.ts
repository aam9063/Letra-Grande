import { fileURLToPath } from "node:url";
import { Authority, Company, Procedure } from "../src";
import { validateContent } from "../src/validate-content-core";

const root = fileURLToPath(new URL("../../../content", import.meta.url));

const result = validateContent(root, [
  { dir: "companies", schema: Company },
  { dir: "authorities", schema: Authority },
  { dir: "procedures", schema: Procedure },
]);

for (const w of result.warnings) console.warn(`AVISO ${w}`);
if (result.errors.length > 0) {
  console.error(`\n${result.errors.length} error(es) de contenido:\n` + result.errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log(`Contenido OK: ${result.validCount} ficha(s) válidas.`);
