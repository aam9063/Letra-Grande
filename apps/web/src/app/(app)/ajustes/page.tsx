import { Callout } from "@letra-grande/design/client";
import { BorradoTotal } from "@/components/ajustes/BorradoTotal";
import { PreferenciaTamano } from "@/components/ajustes/PreferenciaTamano";

// Ajustes (UI-06): tarjetas sobre el lienzo. Reales: tamaño de letra y
// borrado total. Próximamente: lectura fácil e idioma, siempre visibles y
// deshabilitados, nunca controles que no hagan nada.
export const metadata = { title: "Ajustes | Letra Grande" };

export default function AjustesPage() {
  return (
    <main className="lg-ajustes">
      <h1>Ajustes</h1>

      <section className="lg-ajustes-tarjeta" aria-labelledby="lg-ajustes-lectura">
        <div className="lg-ajustes-fila">
          <div>
            <h2 id="lg-ajustes-lectura">Lectura fácil</h2>
            <p>Un modo de lectura más claro, con frases cortas y más espacio.</p>
          </div>
          <div className="lg-ajustes-control">
            <span className="lg-ajustes-proxima">Próximamente</span>
            <input
              type="checkbox"
              role="switch"
              className="lg-interruptor"
              disabled
              aria-label="Lectura fácil, próximamente"
            />
          </div>
        </div>
      </section>

      <section className="lg-ajustes-tarjeta" aria-label="Tamaño de letra">
        <p className="lg-ajustes-descripcion">Elige el tamaño del texto de toda la app.</p>
        <PreferenciaTamano />
      </section>

      <section className="lg-ajustes-tarjeta" aria-labelledby="lg-ajustes-idioma">
        <div className="lg-ajustes-fila">
          <div>
            <h2 id="lg-ajustes-idioma">Idioma</h2>
            <p>De momento la app está solo en castellano.</p>
          </div>
          <p className="lg-ajustes-valor">Castellano</p>
        </div>
      </section>

      <section className="lg-ajustes-tarjeta" aria-labelledby="lg-ajustes-privacidad">
        <h2 id="lg-ajustes-privacidad">Tu privacidad</h2>
        <p>
          Tus datos se quedan en tu dispositivo. El texto que envías al asistente llega
          enmascarado, sin tus datos personales, y el proxy no guarda contenido. La carpeta cifrada
          solo se abre con tu contraseña.
        </p>
      </section>

      <section className="lg-ajustes-tarjeta" aria-labelledby="lg-ajustes-borrado">
        <h2 id="lg-ajustes-borrado">Borrar todos mis datos</h2>
        <BorradoTotal />
      </section>

      <Callout tone="info" title="Ajustes pendientes">
        <p>Lectura fácil, más idiomas y la elección de proveedor de IA llegan en próximas versiones.</p>
      </Callout>
    </main>
  );
}
