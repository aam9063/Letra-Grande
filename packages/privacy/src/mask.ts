// Enmascarado con placeholders estables, deshacer y comprobación de seguridad (sección 9).
import { detect, detectar } from "./detect.js";
import type { Detection, MaskOptions, PiiKind } from "./types.js";

/** Clave estable de un valor: el mismo valor normalizado produce siempre el mismo marcador. */
function claveEstable(kind: PiiKind, valor: string): string {
  switch (kind) {
    case "documento":
      return valor.toUpperCase().replace(/[\s-]/g, "");
    case "iban":
      return valor.toUpperCase().replace(/\s/g, "");
    case "tarjeta":
      return valor.replace(/[\s-]/g, "");
    case "telefono":
      return valor.replace(/\D/g, "").slice(-9);
    case "email":
      return valor.toLowerCase();
    default:
      return valor.toUpperCase();
  }
}

export function mask(
  texto: string,
  opts?: MaskOptions,
): {
  masked: string;
  /** placeholder -> valor original, solo en memoria local. */
  mapping: Record<string, string>;
  detections: Detection[];
} {
  const candidatos = detectar(texto, opts);
  const mapping: Record<string, string> = {};
  const contador = new Map<PiiKind, number>();
  const marcadorPorClave = new Map<string, string>();
  const piezas: string[] = [];
  let ultima = 0;

  for (const c of candidatos) {
    const clave = `${c.kind}:${claveEstable(c.kind, c.canonico)}`;
    let marcador = marcadorPorClave.get(clave);
    if (marcador === undefined) {
      const n = (contador.get(c.kind) ?? 0) + 1;
      contador.set(c.kind, n);
      marcador = `{{${c.kind}_${n}}}`;
      marcadorPorClave.set(clave, marcador);
      mapping[marcador] = c.canonico;
    }
    piezas.push(texto.slice(ultima, c.start), marcador);
    ultima = c.end;
  }
  piezas.push(texto.slice(ultima));

  return {
    masked: piezas.join(""),
    mapping,
    detections: candidatos.map((c) => ({
      kind: c.kind,
      start: c.start,
      end: c.end,
      value: c.value,
      valid: c.valid,
    })),
  };
}

/** Restaura los placeholders del mapping. Los que no estén en el mapping se dejan tal cual. */
export function unmask(texto: string, mapping: Record<string, string>): string {
  return texto.replace(/\{\{([^{}]+)\}\}/g, (marca, clave: string) => mapping[`{{${clave}}}`] ?? marca);
}

/** El texto solo es seguro si no contiene ningún dato personal detectable. */
export function isSafeToSend(texto: string, opts?: MaskOptions): boolean {
  return detect(texto, opts).length === 0;
}
