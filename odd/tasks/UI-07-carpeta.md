# UI-07: carpeta privada (crear, desbloquear y bloquear)

## Objetivo y motivo

El paquete `@letra-grande/vault` (VAULT-01/02) ya implementa el almacén
cifrado, las sesiones con bloqueo y la copia de seguridad, pero no tiene
interfaz. El diseño propio (PDF «diseño de la interfaz (2)») define «Crea tu
carpeta privada» y la pantalla de bloqueo. La sidebar reserva el sitio de
«Bloquear» (retirado de UI-04 hasta que esto exista).

## Specs

- S1. Del PDF de diseño (2), texto y estructura: «Crea tu carpeta privada»,
  «Aquí guardarás tus facturas, contratos y cartas. Solo tú podrás abrirla.»,
  lista de garantías («Se guarda cifrada, solo en este dispositivo», «Tus
  documentos no se suben a ningún servidor», «Funciona también sin
  conexión»), campo Contraseña con «Mostrar», pista («Buena. Una frase larga
  es más segura que una palabra rara.»), repetición de contraseña, Callout de
  tono Importante («Si olvidas la contraseña, no podemos recuperar tu
  carpeta. Apúntala en un lugar seguro.»), casilla «Entiendo que no se puede
  recuperar» requerida, botón «Crear carpeta» y enlace «Ya tengo una carpeta:
  desbloquear».
- S2. Desbloquear: con contraseña, `openVault`; error `WrongPasswordError`
  mostrado como mensaje; al abrir, la app entra en la ruta solicitada.
- S3. Bloquear: botón en la sidebar (segundo de la fila inferior, junto a
  Ajustes) y en la carpeta; cierra la sesión (borra la clave de memoria) y
  lleva a la pantalla de desbloqueo. Sin conexión a ningún servidor.
- S4. La carpeta abierta se comparte en la app (contexto cliente) para las
  tareas siguientes (subida de documentos, radar). El alcance de esta tarea
  termina en crear/desbloquear/bloquear y dejar la sesión disponible.
- S5. 100 % responsive y AA; español tuteante sin rayas largas; sin datos
  personales en tests.

## Alcance y restricciones

- Dentro: pantallas de crear y desbloquear, bloqueo desde la sidebar, sesión
  compartida cliente, tests y e2e.
- Fuera: subida de documentos, exportar/importar copia (su función existe en
  VAULT-02, su UI será otra tarea), lectura fácil, idiomas.
- Invariantes: la clave derivada nunca persiste; sin red nueva; el borrado
  total sigue en Ajustes; sin datos personales en tests.

## Superficie de edición

- apps/web/src/components/carpeta/ (nuevo)
- apps/web/src/app/(app)/carpeta/page.tsx (sustituye la pendiente)
- apps/web/src/components/shell/Sidebar.tsx (botón Bloquear)
- apps/web/src/app/globals.css
- apps/web/e2e/carpeta.spec.ts (nuevo)
- docs/backlog.md (fila UI-07, solo mi hunk)

## Modo TDD

- Activo: sí
- Runner: vitest con fake-indexeddb (flujo crear/desbloquear/bloquear),
  Playwright (pantallas)
- Fuente de la decisión: AGENTS.md

## Riesgo y review

- Tipo: vault (contraseña, clave derivada, sesión): alto riesgo. Review gate
  obligatorio (sección 22) más verificación independiente si el revisor lo
  marca.

## Tareas

- [ ] T1 (S1) RED: crear carpeta (contraseñas distintas fallan, casilla
      requerida, crea con openVault y marca sesión).
- [ ] T2 (S2) RED: desbloquear con error honesto; T3 (S3) RED: bloquear
      cierra la sesión.
- [ ] T4 (S1,S2) Pantallas según el PDF y estilos del sistema.
- [ ] T5 (S4) e2e del flujo completo; fila del backlog.
- [ ] T6 Review gate con informe en odd/reviews/UI-07.md; una ronda.

## Evidencia y progreso

- (pendiente)

## Siguiente paso

Arrancar T1 cuando UI-06 esté cerrada (su revisor está corriendo).

## Cambios de alcance aceptados

- Ninguno.

## Log

- L1. «el onboarding y demás secciones como ajustes etc. ... El resto intenta
  seguir nuestro diseño» con el PDF (2): «Crea tu carpeta privada».
- L2. Review gate (odd/reviews/UI-07.md, veredicto «aprobado con cambios»,
  sin bloqueantes): una ronda aplicada. Test negativo del filtro «?next»
  («//evil.com», «https://evil.com») y endurecimiento con la barra invertida
  («/\evil.com», RED a GREEN). Refactor registrado como REF-UI-07 (patrón
  contraseña + error aria-live + casilla duplicado entre BorradoTotal y la
  carpeta). Notas documentadas sin cambio: window.location.assign tras
  bloquear es aceptable y deseable; el botón deshabilitado sin contraseña
  es pulido, no defecto AA. Implementación delegada a un escritor con
  superficie de edición acotada y TDD (RED a GREEN en crear, desbloquear y
  bloquear); el test del carril shell (rutas.test.tsx) lo adaptó el
  integrador al contrato nuevo de la página.
