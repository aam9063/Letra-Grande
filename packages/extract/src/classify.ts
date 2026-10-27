/**
 * Clasificador de tipo de documento.
 *
 * Recibe el texto que ya se ha leído en local (DOCS-01a para PDF, DOCS-01b
 * para fotos) y dice de qué documento se trata. Es lógica pura: sin red, sin
 * ficheros, sin estado global y determinista.
 *
 * Regla de oro: **sin evidencia no hay clasificación**. El tipo decide qué se
 * le enseña a la persona y qué módulo lo explica, así que un documento que no
 * se reconoce, o que tiene la misma pinta de dos tipos, se queda en `otro` con
 * la confianza a cero. Además se devuelven las señales que han decidido, para
 * que la interfaz pueda decir por qué.
 */
import type { DocumentKind } from "@letra-grande/schema";

/** Los seis tipos que este clasificador reconoce, más `otro` del esquema. */
export type TipoDocumento = Exclude<DocumentKind, "otro">;

/** Resultado de clasificar un documento. */
export interface DocumentClassification {
  /** Tipo del documento, o `otro` cuando no hay evidencia suficiente o hay empate. */
  kind: DocumentKind;
  /** Confianza de 0 a 100; `otro` siempre lleva 0. */
  confidence: number;
  /** Señales que han decidido el tipo, en texto legible; vacío si no se clasifica. */
  signals: string[];
}

/** Evidencia mínima para atreverse a clasificar. */
const MINIMO_EVIDENCIA = 5;

interface Senal {
  patron: RegExp;
  senal: string;
  peso: number;
}

/**
 * Señales por tipo, con su peso.
 *
 * Los pesos no son caprichosos: las señales casi exclusivas de un tipo valen 4
 * (un expediente sancionador, un importe a ingresar) o 3 (un CUPS, un boletín
 * de denuncia, una prima); las que comparten varios tipos valen 2; y las de
 * cortesía formal, 1. Así una multa firmada por un ayuntamiento no se
 * convierte en carta oficial, porque la carta solo suma el organismo y la
 * multa suma denuncia, sanción e importe a ingresar.
 */
const SENALES: Record<TipoDocumento, Senal[]> = {
  factura: [
    { patron: /\bcups\b|punto de suministro/, senal: "punto de suministro (CUPS)", peso: 3 },
    { patron: /potencia contratada/, senal: "potencia contratada", peso: 3 },
    { patron: /periodo de facturaci[oó]n|periodo facturado/, senal: "periodo de facturación", peso: 2 },
    { patron: /\bkwh\b|\bconsumo\b/, senal: "consumo en kWh", peso: 2 },
    { patron: /importe total|total a pagar|total factura/, senal: "importe total", peso: 2 },
    { patron: /\bfactura\b|facturaci[oó]n/, senal: "la palabra factura", peso: 2 },
    { patron: /n[uú]mero de factura|n[.º] factura/, senal: "número de factura", peso: 2 },
  ],
  contrato: [
    { patron: /\bcontrato\b/, senal: "la palabra contrato", peso: 3 },
    { patron: /cl[aá]usula|condiciones generales/, senal: "cláusulas y condiciones", peso: 2 },
    { patron: /duraci[oó]n|pr[oó]rroga|vigencia inicial/, senal: "duración o prórroga", peso: 2 },
    { patron: /penalizaci[oó]n|indemnizaci[oó]n/, senal: "penalización", peso: 2 },
    { patron: /las partes|por una parte|por otra parte/, senal: "las partes firmantes", peso: 2 },
    {
      patron: /firmado|firma del cliente|en prueba de conformidad/,
      senal: "firma",
      peso: 2,
    },
  ],
  carta_oficial: [
    {
      patron:
        /ayuntamiento|concejal[ií]a|ministerio|consejer[ií]a|direcci[oó]n general|agencia|juzgado|delegaci[oó]n/,
      senal: "un organismo público",
      peso: 3,
    },
    {
      patron: /expediente|n[uú]mero de registro|registro de entrada/,
      senal: "expediente o registro",
      peso: 2,
    },
    {
      patron: /resoluci[oó]n|notificaci[oó]n|le informamos|le comunicamos/,
      senal: "notificación",
      peso: 2,
    },
    { patron: /alegaciones|recurso de|escrito/, senal: "alegaciones o recurso", peso: 2 },
    { patron: /atentamente|el [aá]rea|la directora|el director/, senal: "despedida formal", peso: 1 },
  ],
  multa: [
    { patron: /denuncia|bolet[ií]n de denuncia/, senal: "boletín de denuncia", peso: 3 },
    { patron: /expediente sancionador/, senal: "expediente sancionador", peso: 4 },
    { patron: /sanci[oó]n|infracci[oó]n/, senal: "sanción o infracción", peso: 3 },
    {
      patron: /importe a ingresar|pago voluntario|liquidaci[oó]n/,
      senal: "importe a ingresar o pago voluntario",
      peso: 4,
    },
    { patron: /matr[ií]cula|veh[ií]culo|turismo/, senal: "vehículo y matrícula", peso: 2 },
    { patron: /puntos/, senal: "puntos del permiso", peso: 2 },
    { patron: /plazo de \d+ d[ií]as|descuento del \d+ ?%/, senal: "plazo con descuento", peso: 1 },
  ],
  ticket: [
    { patron: /\bticket\b|resguardo de compra/, senal: "la palabra ticket", peso: 3 },
    { patron: /\bcompra\b|art[ií]culos|unidades/, senal: "compra y artículos", peso: 2 },
    { patron: /iva incluido|base imponible/, senal: "IVA incluido", peso: 2 },
    { patron: /efectivo|tarjeta|cambio|caja/, senal: "forma de pago de caja", peso: 2 },
    { patron: /gracias por su compra|vuelva pronto/, senal: "despedida de tienda", peso: 1 },
    { patron: /\btotal\b/, senal: "total", peso: 1 },
  ],
  poliza: [
    { patron: /p[oó]liza/, senal: "la palabra póliza", peso: 3 },
    { patron: /prima|recibo de prima/, senal: "prima", peso: 3 },
    { patron: /cobertura|garant[ií]as cubiertas/, senal: "coberturas", peso: 2 },
    { patron: /asegurad[oa]|tomador/, senal: "asegurado y tomador", peso: 3 },
    { patron: /siniestro|franquicia/, senal: "siniestro o franquicia", peso: 2 },
    { patron: /vigencia/, senal: "vigencia", peso: 1 },
  ],
};

const TIPOS = Object.keys(SENALES) as TipoDocumento[];

/** Clasificación vacía: es lo que se devuelve cuando no hay evidencia o hay empate. */
function sinClasificar(): DocumentClassification {
  return { kind: "otro", confidence: 0, signals: [] };
}

/**
 * Clasifica un documento por su texto.
 *
 * Suma la evidencia de cada tipo, descarta los empates y no clasifica por
 * debajo de la evidencia mínima. La confianza combina cuánta evidencia hay y
 * cuánto margen sobre el segundo tipo, así que un documento con dos señales no
 * puede llevar la misma confianza que uno con siete.
 *
 * @param texto Texto del documento tal como lo devuelven `extractPdfText` o `extractImageText`.
 * @returns Tipo, confianza de 0 a 100 y señales que han decidido.
 */
export function classifyDocument(texto: string): DocumentClassification {
  const normalizado = texto.toLowerCase();

  const puntuaciones = TIPOS.map((tipo) => {
    const encontradas = SENALES[tipo].filter((senal) => senal.patron.test(normalizado));
    return {
      tipo,
      puntos: encontradas.reduce((total, senal) => total + senal.peso, 0),
      senales: encontradas.map((senal) => senal.senal),
    };
  }).sort((a, b) => b.puntos - a.puntos);

  const primero = puntuaciones[0];
  const segundo = puntuaciones[1];
  if (primero === undefined || primero.puntos < MINIMO_EVIDENCIA) return sinClasificar();
  if (primero.puntos <= (segundo?.puntos ?? 0)) return sinClasificar();

  const margen = primero.puntos - (segundo?.puntos ?? 0);
  const confianza = Math.min(
    100,
    Math.max(0, Math.round((100 * margen) / (primero.puntos + MINIMO_EVIDENCIA))),
  );

  return { kind: primero.tipo, confidence: confianza, signals: primero.senales };
}
