"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { marcarOnboardingHecho } from "@/components/onboarding/primer-arranque";
import { bienvenida, comparativa, instalacion, seguridad } from "../onboarding";
import "../onboarding.css";

/** Evento no estándar de instalación PWA (Chrome, Edge, Android). */
interface EventoInstalacion extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

const TOTAL = 4;

/** Onboarding de primer arranque (UI-05): cuatro pasos a pantalla completa. */
export default function OnboardingPage() {
  const router = useRouter();
  const [paso, setPaso] = useState(0);
  const [eventoInstalacion, setEventoInstalacion] = useState<EventoInstalacion | null>(null);

  useEffect(() => {
    function alPedir(evento: Event) {
      evento.preventDefault();
      setEventoInstalacion(evento as EventoInstalacion);
    }
    window.addEventListener("beforeinstallprompt", alPedir);
    return () => window.removeEventListener("beforeinstallprompt", alPedir);
  }, []);

  function salir() {
    marcarOnboardingHecho();
    router.replace("/hoy");
  }

  async function instalar() {
    if (!eventoInstalacion) return;
    await eventoInstalacion.prompt();
    await eventoInstalacion.userChoice;
    salir();
  }

  const ultimo = paso === TOTAL - 1;

  return (
    <div className="lg-ob">
      <div className="lg-ob-cabecera">
        <div className="lg-ob-puntos" aria-hidden="true">
          {Array.from({ length: TOTAL - 1 }, (_, i) => (
            <span key={i} className={i === paso ? "lg-ob-punto lg-ob-punto-activo" : "lg-ob-punto"} />
          ))}
        </div>
        <button type="button" className="lg-ob-saltar" onClick={salir}>
          Saltar
        </button>
      </div>

      {paso === 0 && (
        <section aria-labelledby="ob-bienvenida" className="lg-ob-seccion">
          <h1 id="ob-bienvenida">{bienvenida.titulo}</h1>
          <p className="lg-ob-subtitulo">{bienvenida.subtitulo}</p>
          <div className="lg-ob-tarjetas">
            {bienvenida.tarjetas.map((t, i) => (
              <article key={t.titulo} className="lg-ob-tarjeta">
                <div className="lg-ob-tarjeta-cabecera">
                  <span className="lg-ob-icono">
                    <Trazo d={t.d} />
                  </span>
                  <span aria-hidden="true">{i + 1}</span>
                </div>
                <h2>{t.titulo}</h2>
                <p>{t.texto}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {paso === 1 && (
        <section aria-labelledby="ob-comparativa" className="lg-ob-seccion">
          <h1 id="ob-comparativa">{comparativa.titulo}</h1>
          <p className="lg-ob-subtitulo">{comparativa.subtitulo}</p>
          <div className="lg-ob-tabla" role="table" aria-label={comparativa.titulo}>
            <div role="row" className="lg-ob-fila lg-ob-fila-cabecera">
              <span role="columnheader" />
              <span role="columnheader">{comparativa.columnas.general}</span>
              <span role="columnheader" className="lg-ob-columna-propia">
                {comparativa.columnas.propio}
              </span>
            </div>
            {comparativa.filas.map((f) => (
              <div role="row" key={f.tema} className="lg-ob-fila">
                <span role="rowheader" className="lg-ob-tema">
                  {f.tema}
                </span>
                <span role="cell" className="lg-ob-general">
                  {f.general}
                </span>
                <span role="cell" className="lg-ob-propio">
                  <Trazo d="M5 12.5l4.5 4.5L19 7.5" ancho={2.6} />
                  {f.propio}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {paso === 2 && (
        <section aria-labelledby="ob-seguridad" className="lg-ob-seccion">
          <h1 id="ob-seguridad">{seguridad.titulo}</h1>
          <p className="lg-ob-subtitulo">{seguridad.subtitulo}</p>
          <div className="lg-ob-relato">
            <p className="lg-ob-contador">
              <strong>{seguridad.contador}</strong> {seguridad.contadorTexto}
            </p>
            <ol className="lg-ob-relato-lista">
              {seguridad.pasos.map((p) => (
                <li key={p.titulo}>
                  <span className="lg-ob-icono">
                    <Trazo d={p.d} />
                  </span>
                  <div>
                    <strong>{p.titulo}</strong>
                    <p>{p.texto}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {paso === 3 && (
        <section aria-labelledby="ob-instalacion" className="lg-ob-seccion">
          <h1 id="ob-instalacion">{instalacion.titulo}</h1>
          <p className="lg-ob-subtitulo">{instalacion.subtitulo}</p>
          <div className="lg-ob-instalacion">
            <div>
              <h2>{instalacion.androidTitulo}</h2>
              <ol>
                {instalacion.android.map((pasoTexto) => (
                  <li key={pasoTexto}>{pasoTexto}</li>
                ))}
              </ol>
            </div>
            <div>
              <h2>{instalacion.iphoneTitulo}</h2>
              <ol>
                {instalacion.iphone.map((pasoTexto) => (
                  <li key={pasoTexto}>{pasoTexto}</li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      )}

      <div className="lg-ob-acciones">
        {paso === 3 && eventoInstalacion && (
          <button type="button" className="lg-ob-boton-secundario" onClick={instalar}>
            Instalar la app
          </button>
        )}
        <button
          type="button"
          className="lg-ob-boton-solido"
          onClick={() => (ultimo ? salir() : setPaso(paso + 1))}
        >
          {ultimo ? "Empezar" : "Siguiente"}
        </button>
      </div>
    </div>
  );
}

function Trazo({ d, ancho = 2 }: { d: string; ancho?: number }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={ancho}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flex: "none" }}
    >
      <path d={d} />
    </svg>
  );
}
