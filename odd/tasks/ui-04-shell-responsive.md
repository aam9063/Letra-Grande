# UI-04: shell responsive con sidebar de escritorio y barra flotante glass

## Objetivo y motivo

El shell actual (UI-02) es una columna estrecha con una barra inferior de 8
enlaces de texto. El diseño aprobado (Escritorio.dc.html) define un escritorio
con sidebar (perfil, nav principal, más módulos, estado de la carpeta y
Ajustes) y la persona pide una barra móvil flotante redondeada con aspecto
liquid glass (captura de la app de referencia adjunta en la conversación).

## Specs

- S1. «de la app de reforma digital quiero que copies (no literal sino
  adaptado a nuestro proyecto) el onboarding y demas secciones como ajustes
  etc. El resto intenta seguir nuestro diseño» y «aqui tienes el system
  design: DesignUI/Sistema de diseño-html/Sistema.dc.html»: el shell sigue el
  sistema de diseño (tokens, escala tipográfica, una acción principal por
  pantalla) y el escritorio replica Escritorio.dc.html: sidebar con logo,
  selector de perfil «Perfil: Yo», nav principal (Hoy, Asistente, Carpeta,
  Reclamar y bajas), grupo «Más módulos» (Cambios de vida, Ayudas, Sus
cripciones [Próximamente], Factura de luz, Datos abiertos, Familia), callout
  «Carpeta cifrada. Todo se guarda solo en este dispositivo.» y botón Ajustes.
- S2. «Obviamente va a ser una PWA asi que tiene que ser 100% responsive»:
  sidebar en escritorio (≥ 48rem), barra flotante en móvil (< 48rem); sin
  scroll horizontal a 375 px; nada oculto tras la barra; safe-area inferior en
  iOS (env(safe-area-inset-bottom)); respeta prefers-reduced-motion.
- S3. «el bottom menu de la version movil tiene que ser flotante y me refiero
  a esto [captura] que sea asi redondeado y con aspecto liquid glass de
  apple»: barra fija abajo, centrada, no ocupa todo el ancho (máx. 30rem),
  fondo translúcido con backdrop-filter blur y saturación, bordes muy
  redondeados, sombra suave; cinco destinos con icono y etiqueta: Hoy,
  Asistente, Carpeta, Reclamar, y como quinto botón «Más» con icono de tres
  puntos («la 1 pero encima de 'Más' los 3 puntitos '...'») que abre una hoja
  inferior con los módulos restantes (Cambios de vida, Ayudas, Datos abiertos,
  Familia).
- S4. Decisiones de la persona (misma sesión): 3 tareas en serie (UI-04 shell,
  UI-05 onboarding, UI-06 ajustes); en Ajustes, «Reales los posibles» (tamaño
  de letra y borrado total funcionales; lectura fácil, idioma y proveedor de
  IA como «Próximamente»); la carpeta cifrada real se conecta después (UI-07),
  así que en este shell «Bloquear» no se muestra todavía.

## Alcance y restricciones

- Dentro: layout del grupo (app), sidebar de escritorio, barra móvil glass con
  hoja «Más», reorganización de destinos (4 principales + 4 en «Más»),
  ruta /ajustes como página pendiente honesta, tests y e2e.
- Fuera: onboarding (UI-05), ajustes funcionales (UI-06), conexión real del
  vault y bloqueo (UI-07), asistente, radar, gráficos.
- Invariantes: sin red nueva; sin datos personales en tests; AA (foco visible,
  contraste, 44 px, sin scroll horizontal a 375 px); ninguna acción importante
  truncada; español tuteante sin rayas largas.

## Superficie de edición

- apps/web/src/components/shell/ (destinos.ts, BottomNav → reescrito, nuevo
  Sidebar, tests)
- apps/web/src/app/(app)/layout.tsx, apps/web/src/app/globals.css
- apps/web/src/app/(app)/ajustes/page.tsx (nuevo, pendiente honesto)
- apps/web/e2e/shell.spec.ts (nuevo)
- docs/backlog.md (fila UI-04, solo mi hunk)

## Modo TDD

- Activo: sí
- Runner: vitest (destinos y hoja «Más»), Playwright (responsive y hoja)
- Fuente de la decisión: AGENTS.md

## Riesgo y review

- Tipo: UI (toca el shell compartido de UI-02: carril avisado).
- Review gate: obligatorio (sección 22).

## Tareas

- [ ] T1 (S1) destinos.ts: principales y módulos «Más»; RED en tests de
      destinos; Sidebar de escritorio según Escritorio.dc.html.
- [ ] T2 (S3) Barra móvil glass con hoja «Más»; RED en vitest; accesible
      (dialog, Escape, foco).
- [ ] T3 (S2) CSS responsive del layout: sidebar ≥ 48rem, glass < 48rem,
      safe-area, reduced-motion; sin scroll horizontal a 375 px.
- [ ] T4 (S2,S3) e2e shell.spec.ts: barra en móvil, sidebar en escritorio,
      hoja «Más», sin scroll horizontal; RED antes del CSS final.
- [ ] T5 (S1) Ruta /ajustes pendiente y fila del backlog (solo mi hunk).
- [ ] T6 Review gate (subagente) e informe en odd/reviews/ui-04.md; una ronda.

## Evidencia y progreso

- (pendiente)

## Siguiente paso

T1 con tests en rojo.

## Cambios de alcance aceptados

- Ninguno.

## Log

- L1. «cuando acabes, vas a continuar implementando UI... copias (no literal
  sino adaptado) el onboarding y demás secciones como ajustes etc. El resto
  intenta seguir nuestro diseño. 100% responsive. El bottom menu móvil flotante
  redondeado con aspecto liquid glass de apple [captura]».
- L2. Decisiones: 3 tareas en serie; barra de 5 con «Más» e icono de tres
  puntos; ajustes «reales los posibles»; carpeta real después (UI-07).
- L3. Review gate (odd/reviews/ui-04.md, veredicto «aprobado con cambios»):
  una ronda aplicada. Bloqueante: el velo cerraba la hoja con cualquier clic
  dentro de ella por burbujeo (solo el toque directo en el velo cierra).
  Recomendados: Escape a nivel de documento (el foco puede salir de la hoja
  con Tab), custodia e2e de 44 px en la barra, icono «Más» con los puntos
  duplicados corregido y rama muerta del foco eliminada. Refactor registrado
  como REF-UI-04 (Trazo duplicado, cubos CSS, hex de marca). Fuera de la
  superficie declarada pero justificados y documentados: exclusión de
  DesignUI en scripts/check-style.mjs y las filas REF en el backlog (el
  fichero tiene cambios sin commit de otra sesión, se excluyen de los
  commits).
