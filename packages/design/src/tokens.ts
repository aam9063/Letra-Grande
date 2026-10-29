/**
 * Tokens de diseño de Letra Grande (sección 14 de docs/ARRANQUE.md).
 * D-01 sigue pendiente: la tipografía es del sistema (Host Grotesk en T2 de UI-03).
 * Estos valores son la fuente de verdad; la hoja base (base.css) los declara
 * como custom properties y los tests comprueban el contraste AA.
 */

export interface ParTono {
  /** Nombre legible del tono, para los mensajes de los tests. */
  readonly nombre: string;
  /** Color de fondo del tono. */
  readonly fondo: string;
  /** Color de texto sobre el fondo del tono. */
  readonly texto: string;
}

export const tokens = {
  /** Color de texto principal (tinta). */
  colorTinta: "#141414",
  /** Color de fondo general (lienzo). */
  colorLienzo: "#F7F7F8",
  /** Color de las tarjetas y paneles (superficie). */
  colorSuperficie: "#FFFFFF",
  /** Acento de marca (teal, UI-03). Sin fuentes remotas. */
  colorAcento: "#3E9B94",
  /** Color de texto sobre el acento (acción primaria). Tinta: 5.5:1 AA. */
  colorAcentoTexto: "#141414",
  /** Texto secundario (grupos de la navegación, ayudas). AA 6.9:1 sobre lienzo. */
  colorTextoTenue: "#55555F",
  /** Texto de apoyo en landing y onboarding. AA 10.5:1 sobre lienzo. */
  colorTextoMedio: "#3A3A42",
  /** Bordes suaves y separadores de tarjetas. */
  colorBordeSuave: "#E3E3E8",
  /** Bordes de controles (campos, interruptores). */
  colorBorde: "#D5D5DC",
  /** Texto de apoyo sobre fondos oscuros (pie de la landing). */
  colorTextoApoyo: "#C9C9D1",
  /** Separadores de filas de tabla sobre superficie. */
  colorSuperficieAlterna: "#ECECF0",
  /** Fondo de apoyo con acento (navegación activa, iconos). */
  colorAcentoSuave: "#ECF5F4",
  /** Texto y enlaces sobre colorAcentoSuave y sobre superficie. AA 6.5:1. */
  colorAcentoSuaveTexto: "#26605C",
  /** Antetítulos decorativos de la landing sobre fondo oscuro. */
  colorAcentoClaro: "#BFE6E2",
  /** Ruta del bloque de código de la landing sobre fondo oscuro. */
  colorAcentoClaroFuerte: "#8FD3CC",
  /** Etiquetas de estado (REF-QA-08-01), con su par de contraste AA. */
  etiquetas: {
    ok: { nombre: "ok", fondo: "#E6F4EA", texto: "#135C2E" },
    proxima: { nombre: "proxima", fondo: "#E3F2F1", texto: "#17504B" },
  },
  /** Tamaño base de lectura. */
  tamanoBase: "16px",
} as const;

/** Tonos del Callout, con su par de contraste AA. */
export const tonos: Record<"info" | "aviso" | "peligro" | "exito", ParTono> = {
  info: { nombre: "info", fondo: "#E8F1FA", texto: "#0B3D66" },
  aviso: { nombre: "aviso", fondo: "#FDF3D7", texto: "#6B4B00" },
  peligro: { nombre: "peligro", fondo: "#FBE9E9", texto: "#8A1C1C" },
  exito: { nombre: "exito", fondo: "#E7F4EA", texto: "#14532D" },
};

/** Luminancia relativa de un color hexadecimal (#RGB o #RRGGBB). */
export function luminancia(hex: string): number {
  const limpio = hex.replace("#", "");
  const completo =
    limpio.length === 3
      ? limpio
          .split("")
          .map((c) => c + c)
          .join("")
      : limpio;
  const canales = [0, 2, 4].map((i) => {
    const valor = Number.parseInt(completo.slice(i, i + 2), 16) / 255;
    return valor <= 0.04045 ? valor / 12.92 : ((valor + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * canales[0]! + 0.7152 * canales[1]! + 0.0722 * canales[2]!;
}

/** Ratio de contraste WCAG entre dos colores hexadecimales. */
export function contraste(a: string, b: string): number {
  const la = luminancia(a);
  const lb = luminancia(b);
  const clara = Math.max(la, lb);
  const oscura = Math.min(la, lb);
  return (clara + 0.05) / (oscura + 0.05);
}
