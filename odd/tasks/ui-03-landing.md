# UI-03: landing pública en la raíz

## Objetivo y motivo

La raíz `/` es hoy un placeholder dentro del shell de la app. La landing es la
cara pública del proyecto: explica qué es Letra Grande, cómo cuida la
privacidad y cómo colaborar, y da paso a la app. Se replica el mockup
`Landing.dc.html` (diseño cerrado, valores visuales concretos).

## Specs

- S1. «te vas a encargar de la landing ... lo vas a hacer tal cual
  file:///C:/Users/alber/Downloads/Landing-html/Landing.dc.html»: reproducir el
  mockup con fidelidad: mismas secciones (aviso superior, cabecera, héroe con
  tarjetas de ejemplo, confianza, cómo funciona, qué incluye, privacidad con
  demostración de enmascarado, fuentes, datos abiertos y API, accesibilidad,
  móvil/PWA, código abierto, FAQ, cierre, footer), mismos textos y valores
  visuales (colores, tamaños, radios, sombras, iconos SVG).
- S2. Decisión de la persona (sesión del 26 oct): la landing reemplaza `/` y la
  app empieza en `/hoy`; acento teal `#3E9B94` en toda la app; la cifra
  «15 días de antelación» del mockup se quita («Avisa con antelación a la fecha
  de fin de permanencia»); la tipografía es «Host Grotesk» con su fallback, en
  toda la app, autoalojada (sin peticiones a terceros).

## Alcance y restricciones

- Dentro: landing en `/` (route group sin shell), acento teal en tokens de
  `packages/design` y `apps/web`, fuente autoalojada en `apps/web`, e2e de la
  landing, backlog y docs afectados.
- Fuera: contenidos reales de los módulos de la app (siguen pendientes), nueva
  página «Instalar», cambios en `packages/schema`, nuevos proveedores.
- Invariantes: sin fuentes ni scripts de terceros en el navegador (la fuente se
  autoaloja con `next/font/local`); ningún dato personal real (los del mockup
  son ficticios: «Ana Ejemplo», DNI de ejemplo); aviso de independencia visible
  en la landing; sin promesas de resultados; sin rayas largas (script de
  estilo); AA: foco visible, contraste, objetivos de 44 px, sin scroll
  horizontal a 375 px.

## Superficie de edición

- `apps/web/src/app/(landing)/` (nuevo), `apps/web/src/app/page.tsx` (se elimina)
- `apps/web/src/app/(app)/` (nuevo: movimiento de las 8 rutas y del layout con shell)
- `apps/web/src/app/layout.tsx`, `apps/web/src/app/globals.css`
- `apps/web/public/fonts/` (nuevo), `apps/web/public/manifest.webmanifest` (theme_color)
- `packages/design/src/tokens.ts`, `packages/design/src/base.css` (cambio de
  acento; carril UI-01 avisado: es el contrato visual compartido)
- Tests afectados: `packages/design/test/{contrast,tokens}.test.ts`,
  `apps/web/src/components/shell/{layout,rutas}.test.tsx`,
  `apps/web/src/test/pwa.test.ts`, `apps/web/e2e/smoke.spec.ts`
- `docs/backlog.md` (solo la fila de UI-03; el resto del fichero tiene cambios
  sin commit de otra sesión, se excluyen de los commits de esta tarea),
  `docs/ARCHITECTURE.md` si menciona la portada.

## Modo TDD

- Activo: sí
- Runner: vitest (tokens y contraste) y Playwright (flujo de landing)
- Fuente de la decisión: AGENTS.md

## Riesgo y review

- Tipo: UI (toca el contrato visual compartido de UI-01: tokens y acento).
- Review gate: obligatorio (sección 22).

## Tareas

- [ ] T1 (S2) Acento teal: RED en tests de tokens/contraste, luego tokens.ts,
      base.css, globals.css, themeColor del layout y manifest; texto sobre
      acento pasa a tinta `#141414` (5.5:1, AA). Commit.
- [ ] T2 (S2) Host Grotesk autoalojada: woff2 400/500/700 en
      `public/fonts/` con su OFL, `next/font/local` en el layout raíz,
      `font-family` con fallback ajustado en toda la app. Commit.
- [ ] T3 (S2) Route groups: root layout mínimo, `(app)` con shell (aviso +
      BottomNav) para las 8 rutas, sin shell en la raíz; tests de shell y rutas
      actualizados. Commit.
- [ ] T4 (S1,S2) Página de landing completa con datos del mockup como
      constantes (`landing.ts`), enlaces reales (anclas, GitHub, `/hoy`), CSS
      propio. Commit.
- [ ] T5 (S1) e2e: reescribir `smoke.spec.ts` para la landing (h1, aviso de
      independencia en el footer, CTA a `/hoy`, sin scroll horizontal a 375 px,
      FAQ desplegable); RED antes de la página. Commit.
- [ ] T6 (S1) Backlog (fila UI-03) y docs afectados. Commit.
- [ ] T7 Review gate (subagente solo lectura) e informe en
      `odd/reviews/ui-03.md`; una ronda de correcciones.

## Evidencia y progreso

- T1: RED observado (tokens.test 1 failed) antes de cambiar tokens; GREEN con
  `pnpm check` completo.
- T4/T5: RED observado (8 failed en 4 navegadores) antes de la página; GREEN
  con `pnpm e2e` (16 passed: 3 smoke y 1 guardián de red por cada uno de los
  4 proyectos).
- Capturas de comparación con el mockup a 1440 px revisadas: héroe a dos
  columnas, privacidad, cierre y footer fieles.

## Siguiente paso

T6 (backlog y docs) y T7 (review gate).

## Cambios de alcance aceptados

- Ninguno por ahora. (El acento en toda la app y la fuente común were
  decididos por la persona al asignar la tarea; quedan recogidos en S2.)

## Log

- L1. «averigua porque al hacer pnpm run dev me da error...» (resuelto aparte:
  Langfuse ocupaba el 3000) y «y actualiza» (deps, ya mergeada como OPS-06 por
  otra sesión).
- L2. «te vas a encargar de la landing... lo vas a hacer tal cual
  Landing.dc.html».
- L3. Decisiones: reemplaza `/`; teal en toda la app; quitar la cifra de 15
  días; fuente Host Grotesk en todo con fallback.
- L4. Revisión visual de la persona: botón de cierre ocupaba todo el ancho
  (era flex a nivel de bloque; ahora inline-flex, 243 px) y «todos los botones
  que tengan bg en el verde ese la fuente en color blanco». Aplicado a los
  botones con fondo teal (cabecera, héroe, cierre y maqueta del móvil); las
  pastillas de número quedan como el mockup (tinta). Nota AA: blanco sobre
  #3E9B94 es 3.3:1, pasa como texto grande (3:1); los botones suben a
  19 px en negrita para cumplir el umbral.
- L5. Correcciones de maquetación detectadas en la revisión visual: el main
  de la landing heredaba max-width 42 rem del globals.css de la app (anulado);
  Firefox no estira el main de un flex en columna (width: 100%); faltaban el
  globo oscuro de la pregunta del chat y las sombras del héroe.
- L6. Review gate (odd/reviews/ui-03.md, veredicto «aprobado con cambios»):
  una ronda aplicada. Bloqueante: la PWA (start_url, precache y fallback
  offline) apuntaba a la raíz, que ahora es la landing; alineado con S2
  (start_url y fallback /hoy, CACHE_VERSION v2). Recomendados baratos:
  enlaces del footer a 44 px, iconos PWA al teal, documentación aquí de la
  desviación «Ver cómo colaborar» (la maqueta enlazaba a una página Instalar
  que no existe en el alcance). Refactors opcionales registrados como
  REF-UI-03 en el backlog. Verificación de la fuente variable: el CSS de
  Google Fonts declara font-weight: 400 800 para el woff2 descargado, es
  variable.
