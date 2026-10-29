# UI-05: onboarding de primer arranque

## Objetivo y motivo

La app abre directamente en el shell sin presentar qué es ni cómo protege los
datos. La persona pidió adaptar el onboarding de la app de referencia
(DesignUI/Captura de pantalla *.png, app de reforma digital) a Letra Grande,
siguiendo nuestro sistema de diseño.

## Specs

- S1. «de la app de reforma digital quiero que copies (no literal sino
  adaptado a nuestro proyecto) el onboarding»: tres pasos a pantalla completa,
  con progreso de tres puntos, botón Saltar y avance con Siguiente:
  1. Bienvenida: título adaptado del diseño propio móvil («Los trámites,
     claros») con tres tarjetas numeradas: pregunta con tus palabras; recibes
     pasos con la fuente de cada uno; te avisamos de los plazos.
  2. «¿Por qué no ChatGPT, Claude o Gemini?»: tabla comparativa de dos
     columnas (asistente general frente a Letra Grande, columna propia
     destacada) con cuatro filas: tus datos, tus conversaciones, los trámites,
     envíos y pagos. Adaptado a nuestra privacidad real: el texto llega
     enmascarado por `mask()` en tu dispositivo, la clave no sale del
     dispositivo, cada respuesta cita su fuente y nada se envía sin tu
     aprobación.
  3. «Tu seguridad, primero»: relato del viaje de una petición con el contador
     grande «0 datos tuyos han llegado a la IA» y la lista de pasos con
     iconos, terminando en la afirmación verificable de nuestro proxy (sin
     logs de contenido, rechaza PII residual).
- S2. Del diseño propio móvil (PDF 1): paso final opcional «Ponla en tu
  pantalla de inicio» con instrucciones para Android u ordenador y para
  iPhone, botón Instalar cuando el navegador lo permite y «Ahora no» siempre.
- S3. Comportamiento: ruta /onboarding fuera del shell (pantalla completa);
  se muestra solo en el primer arranque (marcador local, sin datos
  personales); Saltar lleva a /hoy; al terminar el paso 3 o 4, a /hoy.
  100% responsive y AA.

## Alcance y restricciones

- Dentro: grupo (onboarding) con su layout propio, página con los tres pasos
  más el paso de instalación, lógica de primer arranque, tests y e2e.
- Fuera: creación real de la carpeta cifrada (UI-07), grabación de
  preferencias en el vault (aún sin UI de vault), cambiar textos de la
  landing.
- Invariantes: sin red nueva; sin datos personales en tests ni ejemplos;
  AA (foco, contraste, 44 px, 375 px sin scroll horizontal); sin promesas de
  resultados; español tuteante sin rayas largas; el texto de la comparativa
  no puede afirmar de terceros lo que no sabemos: se formula como
  «normalmente» y con neutralidad.

## Superficie de edición

- apps/web/src/app/(onboarding)/ (nuevo: layout, page, datos, css)
- apps/web/src/components/onboarding/ (nuevo si hace falta client)
- apps/web/e2e/onboarding.spec.ts (nuevo)
- docs/backlog.md (fila UI-05, solo mi hunk)

## Modo TDD

- Activo: sí
- Runner: vitest (lógica de primer arranque y pasos), Playwright (flujo)
- Fuente de la decisión: AGENTS.md

## Riesgo y review

- Tipo: UI.
- Review gate: obligatorio (sección 22).

## Tareas

- [ ] T1 (S3) Lógica de primer arranque (marcador local) con RED en vitest.
- [ ] T2 (S1) Los tres pasos con sus datos en un módulo y estilos del sistema.
- [ ] T3 (S2) Paso de instalación PWA con beforeinstallprompt cuando exista.
- [ ] T4 (S3) e2e del flujo: primer arranque, Saltar, terminar, no vuelve a
      aparecer.
- [ ] T5 Backlog (fila UI-05, solo mi hunk) y review gate con informe en
      odd/reviews/ui-05.md; una ronda de correcciones.

## Evidencia y progreso

- (pendiente)

## Siguiente paso

Esperar el cierre de UI-04 (review gate en curso) para no ensuciar su diff
congelado; después T1.

## Cambios de alcance aceptados

- Ninguno.

## Log

- L1. «cuando acabes, vas a continuar implementando UI... el onboarding y
  demás secciones como ajustes etc.» con capturas de la app de referencia y
  PDFs del diseño propio.
- L2. Review gate (odd/reviews/ui-05.md, veredicto «aprobado con cambios»):
  una ronda aplicada. Bloqueante: el paso de instalación no ofrecía «Ahora
  no» (S2); ahora «Instalar la app» solo con beforeinstallprompt y «Ahora no"
  siempre. Recomendados: anunciado de paso con aria-live, e2e de
  beforeinstallprompt y de 375 px en los cuatro pasos, y el texto del borrado
  reformulado (el botón llega con la carpeta cifrada, UI-07). Refactor
  registrado como REF-UI-05 (botones y Trazo duplicados). Notas: el paso de
  instalación no muestra punto de progreso a propósito (en el mockup es
  pantalla aparte tras los tres pasos); localStorage con try/catch por si el
  almacenamiento está bloqueado.
