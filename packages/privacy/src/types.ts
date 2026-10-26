// Contrato público del paquete privacy (sección 9 de docs/ARRANQUE.md).
export type PiiKind =
  | "iban"
  | "cups"
  | "tarjeta"
  | "email"
  | "documento"
  | "telefono"
  | "nombre"
  | "direccion"
  | "otro";

export interface Detection {
  kind: PiiKind;
  start: number;
  end: number;
  value: string;
  /** Falso si el patrón coincide pero falla la validación (letra de DNI, módulo 97...). */
  valid: boolean;
}

export interface KnownTerm {
  kind: "nombre" | "direccion" | "otro";
  value: string;
}

export interface MaskOptions {
  knownTerms?: KnownTerm[];
}
