// Detección de datos personales con prioridad, validaciones y descarte de solapes (sección 9).
import type { Detection, MaskOptions, PiiKind } from "./types.js";
import { esDocumentoValido, esIbanValido, pasaLuhn } from "./validate.js";

/** Orden de prioridad ante solapes: primero términos conocidos, después IBAN, CUPS, tarjeta, email, documento y teléfono. */
const PRIORIDAD: readonly PiiKind[] = [
  "nombre",
  "direccion",
  "otro",
  "iban",
  "cups",
  "tarjeta",
  "email",
  "documento",
  "telefono",
];

// Patrones con límites Unicode para no engullir partes de palabras o de números mayores.
const RE_IBAN = /(?<![\p{L}\p{N}])ES\d{2}(?: ?[A-Z0-9]{4}){5}(?![\p{L}\p{N}])/gu;
const RE_CUPS = /(?<![\p{L}\p{N}])ES ?\d{4}(?: ?\d{4}){3} ?[A-Z]{2}\d[A-Z](?: ?[A-Z0-9]{2})?(?![\p{L}\p{N}])/gu;
const RE_TARJETA = /(?<![\p{N}\p{L}])\d(?:[ -]?\d){12,18}(?![\p{N}\p{L}])/gu;
const RE_EMAIL = /(?<![A-Za-z0-9._%+-])[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const RE_DOCUMENTO = /(?<![\p{L}\p{N}])(?:[XYZ]\d{7}|\d{8})[A-Z](?![\p{L}\p{N}])/gu;
const RE_TELEFONO = /(?<![\p{N}\p{L}])(?:\+34 ?)?[6789]\d{2}(?: ?\d{2}){3}(?![\p{N}\p{L}])/gu;

/** Candidato interno: añade el valor canónico que se guardará en el mapping. */
export interface Candidato extends Detection {
  canonico: string;
}

function escapar(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Genera los candidatos crudos, en orden de prioridad. La tarjeta falla Luhn no se propone: no es una tarjeta. */
function candidatas(texto: string, opts?: MaskOptions): Candidato[] {
  const resultado: Candidato[] = [];

  for (const term of opts?.knownTerms ?? []) {
    const re = new RegExp(`(?<![\\p{L}\\p{N}])(?:${escapar(term.value)})(?![\\p{L}\\p{N}])`, "giu");
    for (const m of texto.matchAll(re)) {
      resultado.push({
        kind: term.kind,
        start: m.index,
        end: m.index + m[0].length,
        value: m[0],
        canonico: term.value,
        valid: true,
      });
    }
  }

  for (const m of texto.matchAll(RE_IBAN)) {
    const valor = m[0];
    resultado.push({
      kind: "iban",
      start: m.index,
      end: m.index + valor.length,
      value: valor,
      canonico: valor,
      valid: esIbanValido(valor),
    });
  }

  for (const m of texto.matchAll(RE_CUPS)) {
    const valor = m[0];
    resultado.push({
      kind: "cups",
      start: m.index,
      end: m.index + valor.length,
      value: valor,
      canonico: valor,
      valid: true,
    });
  }

  for (const m of texto.matchAll(RE_TARJETA)) {
    const valor = m[0];
    const digitos = valor.replace(/[ -]/g, "");
    if (!pasaLuhn(digitos)) continue;
    resultado.push({
      kind: "tarjeta",
      start: m.index,
      end: m.index + valor.length,
      value: valor,
      canonico: valor,
      valid: true,
    });
  }

  for (const m of texto.matchAll(RE_EMAIL)) {
    const valor = m[0];
    resultado.push({
      kind: "email",
      start: m.index,
      end: m.index + valor.length,
      value: valor,
      canonico: valor,
      valid: true,
    });
  }

  for (const m of texto.matchAll(RE_DOCUMENTO)) {
    const valor = m[0];
    resultado.push({
      kind: "documento",
      start: m.index,
      end: m.index + valor.length,
      value: valor,
      canonico: valor,
      valid: esDocumentoValido(valor.toUpperCase().replace(/[\s-]/g, "")),
    });
  }

  for (const m of texto.matchAll(RE_TELEFONO)) {
    const valor = m[0];
    resultado.push({
      kind: "telefono",
      start: m.index,
      end: m.index + valor.length,
      value: valor,
      canonico: valor,
      valid: true,
    });
  }

  return resultado;
}

/**
 * Detección interna usada por mask: ordena por prioridad y longitud,
 * descarta solapes y devuelve los candidatos ordenados por posición.
 */
export function detectar(texto: string, opts?: MaskOptions): Candidato[] {
  const candidatos = candidatas(texto, opts);
  candidatos.sort(
    (a, b) =>
      PRIORIDAD.indexOf(a.kind) - PRIORIDAD.indexOf(b.kind) ||
      b.end - b.start - (a.end - a.start) ||
      a.start - b.start,
  );
  const guardadas: Candidato[] = [];
  for (const c of candidatos) {
    const solapa = guardadas.some((g) => c.start < g.end && g.start < c.end);
    if (!solapa) guardadas.push(c);
  }
  return guardadas.sort((a, b) => a.start - b.start);
}

/** Detecta datos personales en el texto y devuelve sus posiciones. */
export function detect(texto: string, opts?: MaskOptions): Detection[] {
  return detectar(texto, opts).map((c) => ({
    kind: c.kind,
    start: c.start,
    end: c.end,
    value: c.value,
    valid: c.valid,
  }));
}
