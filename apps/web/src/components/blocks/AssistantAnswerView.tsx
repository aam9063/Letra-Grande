import { BlockRenderer, type Fuentes } from "@letra-grande/design/client";
import type { AssistantAnswer } from "@letra-grande/schema";

/**
 * Vista de una respuesta validada del asistente (AI-02).
 * Solo pinta bloques que ya han pasado la validación de servidor contra las
 * fuentes recuperadas: este componente no acepta texto crudo del modelo.
 * El texto se pinta como texto plano: el modelo nunca escribe marcado y aquí
 * no se interpreta nunca (ni HTML ni markdown).
 */
export function AssistantAnswerView({
  answer,
  fuentes,
}: {
  answer: AssistantAnswer;
  fuentes: Fuentes;
}) {
  if (answer.outOfScope) {
    return <OutOfScopeState />;
  }
  return <BlockRenderer blocks={answer.blocks} fuentes={fuentes} />;
}

/**
 * Estado vacío explicado: sin fuente no hay respuesta, y se sugiere una vía
 * oficial en lugar de prometer nada. Sin datos inventados ni enlaces concretos.
 */
function OutOfScopeState() {
  return (
    <section className="lg-fuera-alcance" aria-live="polite">
      <p>No tengo una fuente para responder a esta pregunta, así que prefiero no aventurar nada.</p>
      <p>
        Puedes comprobarlo en la web oficial del organismo que emite el documento o consultarlo en
        una oficina municipal de consumo.
      </p>
    </section>
  );
}
