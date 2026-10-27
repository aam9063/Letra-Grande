import {
  acento,
  acentoEnlace,
  acentoSuave,
  acentoTexto,
  accesibilidad,
  colaborar,
  columnasFooter,
  confianza,
  datosAbiertos,
  enlacesNav,
  fiable,
  instalacion,
  modulos,
  pasos,
  preguntas,
  privacidad,
  radarHero,
  radarMovil,
  respuesta,
} from "./landing";
import "./landing.css";

/** Icono genérico de trazo (los paths son los del mockup). */
function Trazo({ d, size = 24, ancho = 2 }: { d: string; size?: number; ancho?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={ancho}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

function Flecha() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

const REPO = "https://github.com/aam9063/Letra-Grande";

export default function LandingPage() {
  return (
    <div className="lg-land">
      <p className="lg-land-banner">
        Letra Grande está en construcción y es de código abierto.{" "}
        <a href="#abierto">Ayúdanos a construirla</a>
      </p>

      <header className="lg-land-cabecera">
        <div className="lg-land-envoltura lg-land-cabecera-fila">
          <a href="/" className="lg-land-logo">
            <img src="/logo.svg" alt="" aria-hidden="true" className="lg-land-logo-marca" width={44} height={44} />
            <span className="lg-land-logo-texto">
              Letra <strong>Grande</strong>
            </span>
          </a>
          <nav aria-label="Principal" className="lg-land-nav">
            {enlacesNav.map((n) => (
              <a key={n.href} href={n.href}>
                {n.etiqueta}
              </a>
            ))}
          </nav>
          <div className="lg-land-cabecera-acciones">
            <a className="lg-land-boton-borde" href={REPO}>
              GitHub
            </a>
            <a className="lg-land-boton-solido" href="/hoy">
              Abrir la app
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className="lg-land-hero">
          <div className="lg-land-envoltura lg-land-hero-fila">
            <div className="lg-land-hero-texto">
              <p className="lg-land-pildora">Gratis · Código abierto · Sin cuenta</p>
              <h1>
                Los trámites, en <span className="lg-land-acentuado">letra grande</span>.
              </h1>
              <p className="lg-land-entradilla">
                Te explicamos paso a paso cómo hacer trámites con la Administración y con empresas
                de luz, telefonía o bancos. Guardas tus papeles cifrados en tu dispositivo y te
                avisamos antes de que venza un plazo.
              </p>
              <div className="lg-land-hero-acciones">
                <a className="lg-land-boton-solido lg-land-boton-grande" href="/hoy">
                  Abrir Letra Grande
                  <Flecha />
                </a>
                <a className="lg-land-boton-borde lg-land-boton-grande" href="#como">
                  Ver cómo funciona
                </a>
              </div>
              <p className="lg-land-nota">
                Funciona en el navegador y se instala como app en el móvil. Sin registro.
              </p>
            </div>

            <div className="lg-land-hero-muestras">
              <div className="lg-land-tarjeta lg-land-radar">
                <div className="lg-land-fila-separada">
                  <p className="lg-land-radar-titulo">Hoy · lunes 26 de octubre</p>
                  <span className="lg-land-etiqueta-ok">Cifrada</span>
                </div>
                <ul className="lg-land-radar-lista">
                  {radarHero.map((r) => (
                    <li key={r.titulo} className="lg-land-radar-item">
                      <span
                        className="lg-land-fecha"
                        style={{ background: r.fondo, color: r.texto }}
                      >
                        <strong className="lg-land-fecha-dia">{r.dia}</strong>
                        <strong className="lg-land-fecha-mes">{r.mes}</strong>
                      </span>
                      <span>
                        <strong className="lg-land-radar-gravedad" style={{ color: r.texto }}>
                          {r.gravedad}
                        </strong>
                        <strong className="lg-land-radar-nombre">{r.titulo}</strong>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="lg-land-tarjeta lg-land-burbuja">
                <p className="lg-land-burbuja-pregunta">
                  ¿Cómo me doy de baja sin penalización?
                </p>
                <div className="lg-land-burbuja-respuesta">
                  <span className="lg-land-numero" style={{ background: acento, color: acentoTexto }}>
                    1
                  </span>
                  <p>Mira en tu contrato cuándo termina la permanencia.</p>
                </div>
                <div className="lg-land-burbuja-fuentes">
                  <span className="lg-land-chip-fuente">Fuente 1</span>
                  <span className="lg-land-etiqueta-ok">Verificada el 12 sep.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="lg-land-confianza">
          <div className="lg-land-envoltura lg-land-confianza-fila">
            {confianza.map((t) => (
              <div key={t.titulo} className="lg-land-confianza-item">
                <span className="lg-land-icono">
                  <Trazo d={t.d} size={26} />
                </span>
                <div>
                  <strong className="lg-land-confianza-titulo">{t.titulo}</strong>
                  <p className="lg-land-confianza-texto">{t.texto}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="como" className="lg-land-seccion">
          <div className="lg-land-envoltura">
            <p className="lg-land-antetitulo" style={{ color: acentoEnlace }}>
              Cómo funciona
            </p>
            <h2 className="lg-land-h2">
              Tres pasos para dejar de perderte con el papeleo
            </h2>
            <div className="lg-land-pasos">
              {pasos.map((s) => (
                <article key={s.n} className="lg-land-tarjeta lg-land-paso">
                  <p className="lg-land-paso-numero" style={{ color: acentoEnlace }}>
                    {s.n}
                  </p>
                  <h3 className="lg-land-h3">{s.titulo}</h3>
                  <p className="lg-land-paso-texto">{s.texto}</p>
                  <p className="lg-land-paso-ejemplo" style={{ background: s.fondo, color: s.color }}>
                    {s.ejemplo}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="incluye" className="lg-land-seccion lg-land-alterna">
          <div className="lg-land-envoltura">
            <p className="lg-land-antetitulo" style={{ color: acentoEnlace }}>
              Qué incluye
            </p>
            <h2 className="lg-land-h2">Todo lo que sueles necesitar, en un solo sitio</h2>
            <p className="lg-land-intro">
              Empezamos por lo que más se repite en casa y vamos añadiendo. Cada módulo funciona
              con tu carpeta privada.
            </p>
            <div className="lg-land-modulos">
              {modulos.map((m) => (
                <article key={m.titulo} className="lg-land-tarjeta lg-land-modulo">
                  <div className="lg-land-fila-separada">
                    <span className="lg-land-modulo-icono" style={{ background: acentoSuave, color: acentoEnlace }}>
                      <Trazo d={m.d} size={28} />
                    </span>
                    <span
                      className="lg-land-etiqueta"
                      style={{ background: m.fondo, color: m.color }}
                    >
                      {m.etiqueta}
                    </span>
                  </div>
                  <h3 className="lg-land-h3">{m.titulo}</h3>
                  <p className="lg-land-modulo-texto">{m.texto}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="privacidad" className="lg-land-seccion lg-land-oscura">
          <div className="lg-land-envoltura lg-land-dos-columnas">
            <div>
              <p className="lg-land-antetitulo lg-land-antetitulo-claro">Privacidad</p>
              <h2 className="lg-land-h2">Tus papeles se quedan contigo</h2>
              <p className="lg-land-intro lg-land-intro-claro">
                Letra Grande funciona en tu dispositivo. No hay cuentas, no hay anuncios y no
                vendemos nada.
              </p>
              <ul className="lg-land-lista-check">
                {privacidad.map((p) => (
                  <li key={p.titulo}>
                    <span className="lg-land-check" aria-hidden="true">
                      <Trazo d="M5 12.5l4.5 4.5L19 7.5" size={16} ancho={3} />
                    </span>
                    <div>
                      <strong className="lg-land-item-titulo">{p.titulo}</strong>
                      <p className="lg-land-item-texto">{p.texto}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg-land-demo-enmascarado">
              <p className="lg-land-demo-etiqueta">Lo que escribes</p>
              <p className="lg-land-demo-caja">
                Soy <strong>Ana Ejemplo</strong>, mi DNI es <strong>12345678Z</strong>. ¿Cómo
                reclamo esta factura?
              </p>
              <p className="lg-land-demo-flecha" style={{ color: acentoEnlace }}>
                <Trazo d="M12 4v14M6 12l6 6 6-6" size={22} ancho={2.2} />
                Ocultamos tus datos en tu dispositivo, antes de enviar nada
              </p>
              <p className="lg-land-demo-etiqueta">Lo que llega a la IA</p>
              <p className="lg-land-demo-caja lg-land-demo-enmascarada" style={{ background: acentoSuave }}>
                Soy <span className="lg-land-marcado">NOMBRE</span>, mi DNI es{" "}
                <span className="lg-land-marcado">DOCUMENTO</span>. ¿Cómo reclamo esta factura?
              </p>
              <p className="lg-land-demo-nota">
                Reconocemos DNI, IBAN, tarjetas, correos y teléfonos. Nombres y direcciones se
                ocultan si los añades a tu perfil.
              </p>
            </div>
          </div>
        </section>

        <section id="fuentes" className="lg-land-seccion">
          <div className="lg-land-envoltura lg-land-dos-columnas">
            <div className="lg-land-orden-2">
              <p className="lg-land-antetitulo" style={{ color: acentoEnlace }}>
                Información fiable
              </p>
              <h2 className="lg-land-h2">Cada respuesta dice de dónde sale</h2>
              <p className="lg-land-intro">
                La IA no se inventa plazos ni importes. Responde con fichas escritas y revisadas
                por personas, y cada cifra tiene que aparecer en la fuente que cita.
              </p>
              <ul className="lg-land-lista-fiable">
                {fiable.map((r) => (
                  <li key={r.titulo}>
                    <Trazo d="M5 12.5l4.5 4.5L19 7.5" size={22} ancho={2.4} />
                    <span>
                      <strong>{r.titulo}</strong> {r.texto}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg-land-orden-1">
              <div className="lg-land-tarjeta lg-land-respuesta">
                <div className="lg-land-fila-separada">
                  <p className="lg-land-radar-titulo">Respuesta</p>
                  <span className="lg-land-etiqueta-ok">Verificada el 12 sep. 2026</span>
                </div>
                <div className="lg-land-respuesta-filas">
                  {respuesta.map((a, i) => (
                    <div key={a.etiqueta} className={i === 0 ? undefined : "lg-land-respuesta-fila"}>
                      <p className="lg-land-respuesta-etiqueta">{a.etiqueta}</p>
                      <p className="lg-land-respuesta-texto">{a.texto}</p>
                      <span className="lg-land-chip-fuente">Fuente 1</span>
                    </div>
                  ))}
                </div>
                <p className="lg-land-aviso">
                  <strong>Atención.</strong> Si te siguen cobrando después de la baja, reclama.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="datos" className="lg-land-seccion lg-land-alterna">
          <div className="lg-land-envoltura lg-land-dos-columnas">
            <div>
              <p className="lg-land-antetitulo" style={{ color: acentoEnlace }}>
                Datos abiertos y API
              </p>
              <h2 className="lg-land-h2">Lo que sabemos, abierto para todos</h2>
              <p className="lg-land-intro">
                Las fichas de trámites y los datos oficiales que reunamos serán públicos y
                reutilizables. Cada dato guarda su fuente y su fecha.
              </p>
              <ul className="lg-land-datos-lista">
                {datosAbiertos.map((d) => (
                  <li key={d.titulo} className="lg-land-datos-item">
                    <div>
                      <strong className="lg-land-item-titulo">{d.titulo}</strong>
                      <p className="lg-land-item-texto">{d.texto}</p>
                    </div>
                    <span className="lg-land-etiqueta-proxima">Próximamente</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="lg-land-codigo">
                <p className="lg-land-codigo-ruta">GET /api/v1/procedures?sector=telefonia</p>
                <pre className="lg-land-codigo-bloque">
{`{
  "id": "baja-internet-movil",
  "sector": "telefonia",
  "verified": true,
  "verifiedOn": "2026-09-12",
  "sources": [
    { "kind": "empresa", "url": "..." }
  ]
}`}
                </pre>
                <p className="lg-land-codigo-nota">Ejemplo ilustrativo del formato.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="accesible" className="lg-land-seccion">
          <div className="lg-land-envoltura">
            <p className="lg-land-antetitulo" style={{ color: acentoEnlace }}>
              Para todo el mundo
            </p>
            <h2 className="lg-land-h2">Pensada para leerse sin esfuerzo</h2>
            <div className="lg-land-accesible">
              {accesibilidad.map((a) => (
                <article key={a.titulo} className="lg-land-tarjeta lg-land-accesible-item">
                  <p className="lg-land-accesible-muestra" style={{ color: acentoEnlace, fontSize: a.tamaño }}>
                    {a.muestra}
                  </p>
                  <h3 className="lg-land-h3">{a.titulo}</h3>
                  <p className="lg-land-modulo-texto">{a.texto}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="movil" className="lg-land-seccion lg-land-alterna">
          <div className="lg-land-envoltura lg-land-dos-columnas">
            <div>
              <p className="lg-land-antetitulo" style={{ color: acentoEnlace }}>
                En tu móvil
              </p>
              <h2 className="lg-land-h2">Instálala como una app, sin tienda</h2>
              <p className="lg-land-intro">
                Letra Grande es una aplicación web. Se instala desde el navegador y sigue
                funcionando sin conexión.
              </p>
              <ol className="lg-land-instalacion">
                {instalacion.map((i) => (
                  <li key={i.n}>
                    <span className="lg-land-numero lg-land-numero-redondo" style={{ background: acento, color: acentoTexto }}>
                      {i.n}
                    </span>
                    <span className="lg-land-instalacion-texto">{i.texto}</span>
                  </li>
                ))}
              </ol>
              <a className="lg-land-boton-borde lg-land-boton-medio" href="#abierto">
                Ver cómo colaborar
              </a>
            </div>
            <div className="lg-land-movil-centro">
              <div className="lg-land-movil">
                <div className="lg-land-movil-pantalla">
                  <p className="lg-land-movil-fecha">Lunes, 26 de octubre</p>
                  <p className="lg-land-movil-titulo">Hoy tienes una cosa urgente</p>
                  <p className="lg-land-movil-boton" style={{ background: acento, color: "#FFFFFF" }}>
                    Preguntar al asistente
                  </p>
                  {radarMovil.map((r) => (
                    <div key={r.titulo} className="lg-land-movil-item">
                      <span className="lg-land-fecha lg-land-fecha-movil" style={{ background: r.fondo, color: r.texto }}>
                        <strong className="lg-land-fecha-dia">{r.dia}</strong>
                        <strong className="lg-land-fecha-mes">{r.mes}</strong>
                      </span>
                      <strong className="lg-land-movil-item-titulo">{r.titulo}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="abierto" className="lg-land-seccion">
          <div className="lg-land-envoltura">
            <p className="lg-land-antetitulo" style={{ color: acentoEnlace }}>
              Código abierto
            </p>
            <h2 className="lg-land-h2">Hecha entre todos, con licencia MIT</h2>
            <p className="lg-land-intro">
              Puedes mirar cómo funciona, copiarla y mejorarla. Hay tres maneras de ayudar, y
              ninguna exige saber programar.
            </p>
            <div className="lg-land-colaborar">
              {colaborar.map((h) => (
                <article key={h.titulo} className="lg-land-tarjeta lg-land-colaborar-item">
                  <h3 className="lg-land-h3">{h.titulo}</h3>
                  <p className="lg-land-modulo-texto lg-land-colaborar-texto">{h.texto}</p>
                  <a className="lg-land-enlace-cta" href={h.href}>
                    {h.cta}
                    <Flecha />
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="preguntas" className="lg-land-seccion lg-land-alterna">
          <div className="lg-land-envoltura lg-land-preguntas">
            <h2 className="lg-land-h2">Preguntas frecuentes</h2>
            <div className="lg-land-faq">
              {preguntas.map((f) => (
                <details key={f.q} className="lg-land-faq-item">
                  <summary>{f.q}</summary>
                  <p className="lg-land-faq-respuesta">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="lg-land-cierre">
          <div className="lg-land-envoltura lg-land-cierre-centro">
            <h2 className="lg-land-cierre-titulo">Empieza con tu primer trámite</h2>
            <p className="lg-land-cierre-texto">
              Sin registro y sin instalar nada. Tu carpeta se crea en tu dispositivo en menos de
              un minuto.
            </p>
            <a className="lg-land-boton-solido lg-land-boton-enorme" href="/hoy">
              Abrir Letra Grande
            </a>
          </div>
        </section>
      </main>

      <footer className="lg-land-footer">
        <div className="lg-land-envoltura">
          <div className="lg-land-footer-filas">
            <div className="lg-land-footer-marca">
              <div className="lg-land-logo">
                <img
                  src="/logo.svg"
                  alt=""
                  aria-hidden="true"
                  className="lg-land-logo-marca lg-land-logo-marca-pie"
                  width={36}
                  height={36}
                />
                <span className="lg-land-logo-texto">
                  Letra <strong>Grande</strong>
                </span>
              </div>
              <p className="lg-land-footer-lema">
                Trámites claros para todo el mundo. Proyecto independiente y de código abierto.
              </p>
            </div>
            {columnasFooter.map((c) => (
              <nav key={c.titulo} className="lg-land-footer-col" aria-label={c.titulo}>
                <p className="lg-land-footer-col-titulo">{c.titulo}</p>
                {c.enlaces.map((e) => (
                  <a
                    key={e.texto}
                    href={e.href}
                    {...(e.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
                  >
                    {e.texto}
                  </a>
                ))}
              </nav>
            ))}
          </div>
          <p className="lg-land-footer-legal">
            Letra Grande es un proyecto independiente. No tiene relación con la Administración ni
            con ninguna de las empresas que aparecen como ejemplo. La información es orientativa y
            no constituye asesoramiento jurídico. Licencia MIT.
          </p>
        </div>
      </footer>
    </div>
  );
}
