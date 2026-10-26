import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { parse } from "yaml";
import type { ZodType } from "zod";

const STALE_DAYS = 180;

export interface ContentCollection {
  dir: string;
  schema: ZodType;
}

export interface ContentValidationResult {
  errors: string[];
  warnings: string[];
  validCount: number;
}

const DEFAULT_COLLECTIONS: { dir: string; schema: ZodType }[] = [];

/**
 * Valida una raíz de contenido con el esquema de cada colección.
 * Función pura respecto al proceso: lee el disco, pero no escribe, no imprime
 * y no termina el proceso. La CLI de `scripts/validate-content.ts` la envuelve.
 */
export function validateContent(
  root: string,
  collections: ContentCollection[] = DEFAULT_COLLECTIONS,
): ContentValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const idsByDir = new Map<string, Set<string>>();
  const escalationRefs: { file: string; id: string }[] = [];
  let count = 0;

  for (const { dir, schema } of collections) {
    const ids = new Set<string>();
    idsByDir.set(dir, ids);
    const folder = join(root, dir);
    if (!existsSync(folder)) {
      errors.push(`content/${dir}: no existe la carpeta de esta colección`);
      continue;
    }
    const files = readdirSync(folder).filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));

    for (const file of files) {
      const full = join(folder, file);
      // Separadores normalizados a / para que los mensajes sean iguales en todas las plataformas.
      const rel = relative(root, full).replace(/\\/g, "/");
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

  return { errors, warnings, validCount: count };
}
