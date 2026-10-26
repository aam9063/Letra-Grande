import { Callout } from "../Callout";
import { BlockRenderer } from "../blocks/BlockRenderer";
import type { BlockData } from "../blocks/types";
import { tokens, tonos } from "../tokens";

/**
 * Galería local de referencia: muestra tokens, Callouts, bloques de respuesta
 * y los patrones siempre visibles (verificación e independencia, sección 14).
 * No necesita servidor: se genera como HTML estático con react-dom/server.
 */

const citaEjemplo = [{ sourceId: "boe-ejemplo", quote: "el plazo es de 30 dias" }];

const bloquesEjemplo: BlockData[] = [
  { kind: "step", n: 1, claim: "Rellena el formulario de reclamación.", citations: citaEjemplo },
  { kind: "step", n: 2, claim: "Preséntalo en la sede electrónica.", citations: citaEjemplo },
  { kind: "step", n: 3, claim: "Guarda el justificante en tu Carpeta.", citations: citaEjemplo },
  { kind: "document", claim: "Necesitas una factura reciente.", citations: citaEjemplo },
  { kind: "cost", claim: "La reclamación es gratuita.", citations: citaEjemplo },
  {
    kind: "deadline",
    deadlineId: "plazo-respuesta-ejemplo",
    claim: "Tienes 30 días para responder.",
    citations: citaEjemplo,
  },
  { kind: "warning", claim: "No interrumpas el plazo reclamando por otra vía.", citations: citaEjemplo },
  { kind: "fact", claim: "La hoja de reclamaciones es un derecho.", citations: citaEjemplo },
];

function MuestrasTokens() {
  const pares = [
    { nombre: "tinta sobre lienzo", fondo: tokens.colorLienzo, texto: tokens.colorTinta },
    { nombre: "tinta sobre superficie", fondo: tokens.colorSuperficie, texto: tokens.colorTinta },
    { nombre: "texto sobre acento", fondo: tokens.colorAcento, texto: tokens.colorAcentoTexto },
    ...Object.values(tonos).map((tono) => ({ nombre: `tono ${tono.nombre}`, fondo: tono.fondo, texto: tono.texto })),
  ];
  return (
    <section aria-labelledby="galeria-tokens">
      <h2 id="galeria-tokens">Tokens</h2>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {pares.map((par) => (
          <li
            key={par.nombre}
            style={{ background: par.fondo, color: par.texto, padding: "0.5rem", margin: "0.25rem 0" }}
          >
            {par.nombre}: fondo {par.fondo}, texto {par.texto}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Gallery() {
  return (
    <main>
      <h1>Galería de componentes de Letra Grande</h1>
      <p>
        Referencia local del sistema de diseño. El acento es provisional hasta cerrar D-01 y la tipografía es del
        sistema.
      </p>

      <MuestrasTokens />

      <section aria-labelledby="galeria-acciones">
        <h2 id="galeria-acciones">Acciones</h2>
        <p>Una sola acción primaria por pantalla. Objetivo táctil de 44 px y foco visible.</p>
        <p>
          <button type="button" className="lg-primario">
            Acción principal
          </button>{" "}
          <button type="button" className="lg-secundario">
            Acción secundaria
          </button>
        </p>
      </section>

      <section aria-labelledby="galeria-callouts">
        <h2 id="galeria-callouts">Callouts</h2>
        <Callout tone="info" title="Qué es esto">
          Explicación breve y orientativa, sin consejos a medida.
        </Callout>
        <Callout tone="aviso" title="Comprueba las fechas">
          Los plazos pueden cambiar: revisa siempre la fuente oficial.
        </Callout>
        <Callout tone="peligro" title="No pagues sin comprobar">
          Antes de pagar, revisa si te puede corresponder una reclamación.
        </Callout>
        <Callout tone="exito" title="Reclamación registrada">
          Guarda el justificante en tu Carpeta.
        </Callout>
      </section>

      <section aria-labelledby="galeria-bloques">
        <h2 id="galeria-bloques">Bloques de respuesta</h2>
        <BlockRenderer blocks={bloquesEjemplo} />
      </section>

      <aside className="lg-nota-independencia">
        <p>
          Proyecto independiente: no pertenece a ninguna empresa ni administración. Contenido de ejemplo, verificado el
          1 de enero de 2025, según la ficha de ejemplo.
        </p>
      </aside>
    </main>
  );
}
