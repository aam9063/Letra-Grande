// Tipos del conjunto de evaluaciones del asistente (AI-04). Las seis métricas
// y las diez categorías son la sección 13.2 de docs/ARRANQUE.md, a texto
// literal: aquí solo se operacionalizan, no se redefinen.

/** Las diez categorías de la sección 13.2, con el nombre literal en el informe. */
export const CATEGORIES = [
  "escalado",
  "baja",
  "cifra-no-respaldada",
  "asesoramiento",
  "fuera-de-alcance",
  "inyeccion-en-documento",
  "marcadores",
  "datos-caducados",
  "idioma",
  "ambiguedad",
] as const;

export type CaseCategory = (typeof CATEGORIES)[number];

/** Nombre legible de cada categoría, tal y como aparece en la sección 13.2. */
export const CATEGORY_LABELS: Readonly<Record<CaseCategory, string>> = {
  escalado: "Ruta de escalado",
  baja: "Baja",
  "cifra-no-respaldada": "Cifra no respaldada",
  asesoramiento: "Asesoramiento",
  "fuera-de-alcance": "Fuera de alcance",
  "inyeccion-en-documento": "Inyección en documento",
  marcadores: "Marcadores",
  "datos-caducados": "Datos caducados",
  idioma: "Idioma",
  ambiguedad: "Ambigüedad",
};

/**
 * Qué se espera de un caso. Todos los campos son opcionales y las comprobaciones
 * son deterministas: no hay juicio del evaluador sobre la calidad, solo
 * guardarraíles y presencia o ausencia de fragmentos concretos.
 */
export interface CaseExpectation {
  /** La respuesta honesta es outOfScope true y sin bloques. */
  outOfScope?: boolean;
  /** La respuesta debe tener al menos un bloque y todas sus citas válidas. */
  blocksWithCitations?: boolean;
  /** Ninguna cifra del claim puede faltar en el texto de las fuentes citadas. */
  figuresBacked?: boolean;
  /** Mínimo de bloques "step" numerados (ruta de escalado). */
  minSteps?: number;
  /** Una sola pregunta corta de aclaración (categoría Ambigüedad). Como todo
   * bloque del catálogo necesita cita y puede que no haya contenido que
   * citar, también se acepta la salida honesta outOfScope. */
  clarification?: boolean;
  /** La respuesta debe llevar un bloque "warning" que avise de la caducidad. */
  stalenessWarning?: boolean;
  /** Fragmentos que deben aparecer en la respuesta (idioma, aviso...). */
  mustMention?: string[];
  /** Fragmentos que no deben aparecer (órdenes inyectadas, nombres inventados). */
  mustNotMention?: string[];
  /** Al menos una de estas fuentes citada (id de fuente de la ficha esperada). */
  mustCiteSourceIds?: string[];
}

/** Un caso de evaluación: pregunta, ficha esperada y qué se espera. */
export interface EvalCase {
  id: string;
  category: CaseCategory;
  question: string;
  /** Id de la ficha de content/ que debe responder al caso, o null si se espera outOfScope. */
  expectedFicha: string | null;
  expect: CaseExpectation;
  /**
   * Respuesta del catálogo cerrado (JSON en texto) que devuelve el proveedor
   * mock para esta pregunta: es dato del caso, no código. Sus afirmaciones
   * están respaldadas por la ficha esperada y sus datos personales son
   * ficticios. Con el proveedor real (nan) este campo no se usa.
   */
  mockAnswer: string;
}

/** Resultado de evaluar un caso, con los contadores que alimentan las métricas. */
export interface CaseResult {
  case: EvalCase;
  /** El caso cumple todas sus expectativas y no filtra datos personales. */
  passed: boolean;
  /** Motivos de fallo, en español, para el informe. */
  failures: string[];
  /** El primer intento del proveedor fue un JSON válido del catálogo cerrado. */
  jsonValidFirst: boolean;
  outOfScopeExpected: boolean;
  /** En casos fuera de alcance: la respuesta final fue un rechazo. */
  rejectedCorrectly: boolean;
  /** La respuesta final mantiene todas sus citas dentro de las fuentes recuperadas. */
  citationsOk: boolean;
  /** Ninguna cifra de la respuesta final falta en sus fuentes citadas. */
  figuresOk: boolean;
  /** La respuesta final pasa el guardarraíl de tono (calidad del español). */
  toneClean: boolean;
  /** La respuesta final no contiene datos personales detectables. */
  personalDataClean: boolean;
  /** La respuesta final quedó degradada a la salida segura outOfScope. */
  degradedToOutOfScope: boolean;
}

/** Las seis métricas de la sección 13.2, en porcentaje de 0 a 100. */
export interface EvalMetrics {
  /** 1. Porcentaje de bloques con cita válida, sobre los casos que deben
   * responder con bloques citados (expectativa blocksWithCitations o minSteps). */
  citationsValidPercent: number;
  /** 2. Porcentaje de cifras respaldadas por la fuente, sobre los casos con
   * expectativa figuresBacked. */
  figuresBackedPercent: number;
  /** 3. Tasa de rechazo correcto en preguntas fuera de alcance. */
  outOfScopeRejectionPercent: number;
  /** 4. Ausencia de datos personales en las salidas. */
  noPersonalDataPercent: number;
  /** 5. Porcentaje de respuestas con JSON válido a la primera. */
  jsonValidFirstPercent: number;
  /** 6. Calidad del español: respuestas que pasan el guardarraíl de tono,
   * sobre los casos que deben responder con bloques y no quedaron degradados. */
  spanishQualityPercent: number;
}

/** Umbral versionado de una métrica, con la anotación de dónde sale. */
export interface MetricThreshold {
  /** Valor mínimo aceptable (0 a 100): por debajo, el ejecutor sale con error. */
  min: number;
  /** De dónde sale el umbral: la primera medición real que lo fijó. */
  source: string;
}

export type Thresholds = Record<keyof EvalMetrics, MetricThreshold>;

/** Resultado completo de una ejecución del conjunto. */
export interface EvalsRun {
  results: CaseResult[];
  metrics: EvalMetrics;
}
