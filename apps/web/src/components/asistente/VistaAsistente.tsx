"use client";

import { useState } from "react";
import { mask } from "@letra-grande/privacy";
import type { AssistantAnswer } from "@letra-grande/schema";
import type {
  AssistantErrorBody,
  AssistantErrorCode,
  AssistantOkBody,
} from "@/app/api/assistant/handler";
import { AssistantAnswerView } from "@/components/blocks/AssistantAnswerView";

/** Un turno de la conversación: lo que se preguntó y lo que se respondió. */
interface Intercambio {
  pregunta: string;
  /** Respuesta validada con sus bloques, o el texto del error explicado. */
  respuesta?: { answer: AssistantAnswer; fuentes: Record<string, { titulo: string; url: string }> };
  error?: string;
}

/**
 * Los cinco errores del endpoint (AI-01 y AI-02) traducidos a la interfaz.
 * Cada texto dice qué pasó y qué puede hacer la persona, con el mismo criterio
 * que el resto de la app: sin promesas y sin repetir el mensaje técnico.
 */
// Tipado con el codigo del handler: si mañana aparece un codigo nuevo,
// TypeScript obliga a traducirlo en vez de dejarlo caer en el texto de red.
const TEXTOS_DE_ERROR: Record<AssistantErrorCode, string> = {
  invalid_body: "No se ha podido enviar la pregunta. Escríbela de nuevo y vuelve a intentarlo.",
  payload_too_large: "La pregunta es demasiado larga. Acórtala y vuelve a intentarlo.",
  unmasked_data:
    "La pregunta contiene datos personales que no se han podido enmascarar. Quita el DNI, el teléfono o el correo y vuelve a intentarlo.",
  rate_limited:
    "Has alcanzado el límite de consultas de este momento. Espera unos minutos y vuelve a intentarlo.",
  service_unavailable:
    "El asistente no está disponible ahora mismo. Prueba de nuevo más tarde.",
};

const ERROR_DE_RED =
  "No se ha podido contactar con el asistente. Comprueba tu conexión y vuelve a intentarlo.";

/**
 * Vista de la página Asistente (AI-03): pregunta, respuesta en bloques con su
 * cita y errores explicados. La conversación vive solo en memoria: una pregunta
 * por vez, sin historial guardado. Antes de enviar nada, el texto pasa por
 * mask(): es el invariante de privacidad del proyecto y el endpoint lo vuelve a
 * comprobar como segunda barrera.
 */
export function VistaAsistente() {
  const [pregunta, setPregunta] = useState("");
  const [intercambios, setIntercambios] = useState<Intercambio[]>([]);
  const [enviando, setEnviando] = useState(false);

  const puedeEnviar = pregunta.trim().length > 0 && !enviando;

  async function enviar(): Promise<void> {
    if (!puedeEnviar) {
      return;
    }
    const escrita = pregunta;
    setEnviando(true);
    setPregunta("");
    try {
      // Todo texto que va a la IA pasa antes por mask(): aquí en el navegador,
      // que es donde el dato personal está en manos de quien lo escribe.
      const { masked } = mask(escrita);
      const respuesta = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: masked }),
      });
      if (!respuesta.ok) {
        let texto = ERROR_DE_RED;
        try {
          const cuerpo = (await respuesta.json()) as AssistantErrorBody;
          texto = TEXTOS_DE_ERROR[cuerpo.error?.code] ?? ERROR_DE_RED;
        } catch {
          // Sin cuerpo legible: se queda el texto de red.
        }
        setIntercambios((previos) => [...previos, { pregunta: escrita, error: texto }]);
        return;
      }
      const cuerpo = (await respuesta.json()) as AssistantOkBody;
      setIntercambios((previos) => [
        ...previos,
        { pregunta: escrita, respuesta: { answer: cuerpo.answer, fuentes: cuerpo.fuentes } },
      ]);
    } catch {
      setIntercambios((previos) => [...previos, { pregunta: escrita, error: ERROR_DE_RED }]);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="lg-asistente">
      <h1>Asistente</h1>
      <section className="lg-asistente-panel" aria-label="Preguntar al asistente">
        <p>
          Pregunta por facturas, contratos o cartas oficiales. Cada respuesta se apoya en las
          fichas de la app y lleva la cita a su fuente.
        </p>

        <form
          className="lg-asistente-formulario"
          onSubmit={(evento) => {
            evento.preventDefault();
            void enviar();
          }}
        >
          <div className="lg-asistente-campo">
            <label htmlFor="lg-asistente-pregunta">Tu pregunta</label>
            <textarea
              id="lg-asistente-pregunta"
              className="lg-asistente-entrada"
              value={pregunta}
              onChange={(evento) => setPregunta(evento.target.value)}
              rows={3}
            />
          </div>
          <p className="lg-asistente-pista">
            Si escribes un DNI, un teléfono o un correo, se sustituye por un marcador antes de
            enviar nada.
          </p>
          <div className="lg-asistente-botones">
            <button type="submit" className="lg-primario" disabled={!puedeEnviar}>
              {enviando ? "Enviando..." : "Enviar pregunta"}
            </button>
          </div>
        </form>
      </section>

      <div className="lg-asistente-mensajes" aria-live="polite">
        {intercambios.map((intercambio, indice) => (
          <article key={indice} className="lg-asistente-intercambio">
            <p className="lg-asistente-pregunta">{intercambio.pregunta}</p>
            {intercambio.respuesta ? (
              <AssistantAnswerView
                answer={intercambio.respuesta.answer}
                fuentes={intercambio.respuesta.fuentes}
              />
            ) : (
              <p className="lg-asistente-error" role="alert">
                {intercambio.error}
              </p>
            )}
          </article>
        ))}
      </div>
    </main>
  );
}
