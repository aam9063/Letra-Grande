import type { ReactNode } from "react";
import { tonos, type ParTono } from "./tokens";

/**
 * Callout con los cuatro tonos de la sección 14: info, aviso, peligro y éxito.
 * El tono nunca se comunica solo con color: hay etiqueta de texto visible
 * y cada tono lleva su role ARIA.
 */

const TONOS: Record<CalloutTone, { par: ParTono; etiqueta: string; role: string }> = {
  info: { par: tonos.info, etiqueta: "Información", role: "note" },
  aviso: { par: tonos.aviso, etiqueta: "Aviso", role: "note" },
  peligro: { par: tonos.peligro, etiqueta: "Peligro", role: "alert" },
  exito: { par: tonos.exito, etiqueta: "Hecho", role: "status" },
};

export type CalloutTone = "info" | "aviso" | "peligro" | "exito";

export interface CalloutProps {
  /** Tono del aviso. */
  tone: CalloutTone;
  /** Título corto del aviso. */
  title: string;
  /** Contenido adicional opcional. */
  children?: ReactNode;
}

export function Callout({ tone, title, children }: CalloutProps) {
  const config = TONOS[tone];
  return (
    <div className={`lg-callout lg-callout-${tone}`} role={config.role}>
      <p className="lg-callout-etiqueta">{config.etiqueta}</p>
      <p className="lg-callout-titulo">{title}</p>
      {children ? <div className="lg-callout-cuerpo">{children}</div> : null}
    </div>
  );
}
