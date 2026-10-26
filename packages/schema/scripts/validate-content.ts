import { readdirSync, readFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import type { ZodType } from "zod";
import { Authority, Company, Procedure } from "../src";

const root = fileURLToPath(new URL("../../../content", import.meta.url));
const STALE_DAYS = 180;

const collections: { dir: string; schema: ZodType }[] = [
  { dir: "companies", schema: Company },
  { dir: "authorities", schema: Authority },
  { dir: "procedures", schema: Procedure },
];

const errors: string[] = [];
const warnings: string[] = [];
const idsByDir = new Map<string, Set<string>>();
const escalationRefs: { file: string; id: string }[] = [];
let count = 0;

for (const { dir, schema } of collections) {
  const ids = new Set<string>();
  idsByDir.set(dir, ids);
  const folder = join(root, dir);
  const files = readdirSync(folder).filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));

  for (const file of files) {
    const full = join(folder, file);
    const rel = relative(root, full);
    let raw: unknown;
    try {
      raw = parse(readFileSync(full, "utf8"));
    } catch (e) {
      errors.push(`${rel}: YAML inválido: ${(e as Error).message}`);
      continue;
    }

    const result = schema.safeParse(raw);
    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push(`${rel}: ${issue.path.join(".") || "(raíz)"}: ${issue.message}`);
      }
      continue;
    }
    count += 1;

    const data = result.data as {
      id: string;
      escalation?: string[];
      verification?: { verified: boolean; verifiedOn?: string };
    };

    const stem = basename(file).replace(/\.ya?ml$/, "");
    if (!stem.startsWith("_") && stem !== data.id) errors.push(`${rel}: el nombre del archivo debe ser "${data.id}.yaml"`);
    if (ids.has(data.id)) errors.push(`${rel}: id duplicado "${data.id}"`);
    ids.add(data.id);

    for (const id of data.escalation ?? []) escalationRefs.push({ file: rel, id });

    const v = data.verification;
    if (v?.verified && v.verifiedOn) {
      const age = (Date.now() - Date.parse(v.verifiedOn)) / 86_400_000;
      if (age > STALE_DAYS) warnings.push(`${rel}: verificada hace ${Math.floor(age)} días, conviene revisarla`);
    }
  }
}

const authorityIds = idsByDir.get("authorities") ?? new Set<string>();
for (const ref of escalationRefs) {
  if (!authorityIds.has(ref.id)) errors.push(`${ref.file}: escalation apunta a un organismo inexistente "${ref.id}"`);
}

for (const w of warnings) console.warn(`AVISO ${w}`);
if (errors.length > 0) {
  console.error(`\n${errors.length} error(es) de contenido:\n` + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log(`Contenido OK: ${count} ficha(s) válidas.`);
