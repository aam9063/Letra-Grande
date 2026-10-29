# UI-06: ajustes con tamaño de letra y borrado total reales

## Objetivo y motivo

La ruta /ajustes es hoy una página pendiente honesta (UI-04). El diseño propio
(PDF «diseño de la interfaz (2)») y las capturas de la app de referencia
definen una pantalla de ajustes. La persona decidió (L2 de UI-04): «reales los
posibles»: tamaño de letra y borrado total funcionales; lectura fácil, idioma
y proveedor de IA como «Próximamente» deshabilitados.

## Specs

- S1. Tamaño de letra funcional: tres opciones (Normal, Grande, Muy grande)
  que escalan el `font-size` de `html` a 100 %, 112,5 % y 125 %. Persiste en
  localStorage (bandera local, sin datos personales) y se aplica en toda la
  app al cargar (antes del primer pintado para evitar saltos). Toda la
  interfaz usa unidades relativas, así que el escalado es consistente.
- S2. «Borrar todos mis datos» funcional e irreversible: con confirmación
  explícita que pide la contraseña de la carpeta; usa `openVault(...)`
  seguido de `Vault.purge()` (VAULT-02, `packages/vault/src/vault.ts:365`;
  la purga conserva solo el registro técnico de época en `meta`, sin datos
  personales). Con contraseña incorrecta, `WrongPasswordError` se muestra como
  mensaje y no se borra nada. Antes, Callout de tono «Importante» con el
  aviso de que no se puede recuperar. Tras borrar, mensaje de éxito y la app
  queda como recién instalada (los ajustes de tamaño vuelven a Normal).
- S3. Secciones visuales del diseño (tarjetas sobre lienzo, interruptores del
  sistema de diseño): «Lectura fácil» (Próximamente), «Tamaño de letra»
  (funcional, tres chips tipo «Seleccionado/Sin seleccionar»), «Idioma»
  (Castellano, único disponible, mostrado como valor fijo), «Tu privacidad»
  (texto informativo: los datos se quedan en el dispositivo, el texto llega
  enmascarado, el proxy no guarda contenido) y «Borrar todos mis datos»
  (funcional). Las entradas «Próximamente» nunca son controles que no hagan
  nada: se muestran deshabilitadas con su chip.
- S4. La página /ajustes sustituye a la pendiente de UI-04, dentro del shell
  (grupo (app)). 100 % responsive y AA: foco visible, contraste, 44 px, sin
  scroll horizontal a 375 px, prefers-reduced-motion, español tuteante sin
  rayas largas.

## Alcance y restricciones

- Dentro: página /ajustes real, preferencia de tamaño de letra (provider o
  script en el layout raíz), flujo de borrado total con confirmación, tests y
  e2e, fila del backlog.
- Fuera: lectura fácil, cambio de idioma, selección de proveedor de IA,
  exportar/importar copia (VAULT-02 tiene la función, su UI llega después),
  bloqueo/desbloqueo de carpeta (UI-07).
- Invariantes: el borrado es el único flujo destructivo del shell; nunca se
  ejecuta sin confirmación con contraseña; nada se envía fuera del
  dispositivo; sin datos personales en tests; sin dependencias nuevas salvo
  reutilizar `fake-indexeddb` (ya en el monorepo, paquete vault) para los
  tests del borrado, con justificación en el PR.

## Superficie de edición

- apps/web/src/app/(app)/ajustes/ (nuevo: page, componentes cliente)
- apps/web/src/components/ajustes/ (nuevo: preferencia de tamaño, borrado)
- apps/web/src/app/layout.tsx (aplicar el tamaño guardado antes de pintar)
- apps/web/src/app/globals.css (estilos de ajustes)
- apps/web/e2e/ajustes.spec.ts (nuevo)
- docs/backlog.md (fila UI-06, solo mi hunk; el fichero tiene cambios sin
  commit de otra sesión, exclúyelos)

## Modo TDD

- Activo: sí
- Runner: vitest (preferencia de tamaño, flujo de borrado con
  fake-indexeddb), Playwright (pantalla y flujo visible)
- Fuente de la decisión: AGENTS.md

## Riesgo y review

- Tipo: UI con flujo destructivo (borrado total irreversible): alto riesgo
  (item 1). La confirmación con contraseña y los tests del purga son
  obligatorios; el review gate es obligatorio (sección 22).

## Tareas

- [ ] T1 (S1) Preferencia de tamaño: RED (leer, guardar, aplicar, valor por
      defecto Normal, valores inválidos ignorados), luego provider + script
      anti-salto en el layout raíz.
- [ ] T2 (S2) Flujo de borrado: RED con fake-indexeddb (contraseña
      incorrecta no borra; correcta purga y deja solo la época; después del
      purge, openVault crea un almacén vacío). Componente de confirmación con
      Callout Importante, campo de contraseña y botón deshabilitado hasta
      escribir.
- [ ] T3 (S3,S4) Página /ajustes con las secciones del diseño y los
      interruptores; la preferencia de tamaño marca el chip activo.
- [ ] T4 (S4) e2e: cambiar tamaño aplica al html y persiste tras recargar;
      borrado con contraseña incorrecta muestra error y no borra; 375 px sin
      scroll horizontal.
- [ ] T5 Backlog (fila UI-06, solo mi hunk) y review gate con informe en
      odd/reviews/ui-06.md; una ronda de correcciones.

## Evidencia y progreso

- (pendiente)

## Siguiente paso

T1 con tests en rojo.

## Cambios de alcance aceptados

- Ninguno.

## Log

- L1. «el onboarding y demás secciones como ajustes etc.» con el PDF de
  diseño (2) y la decisión L2 de UI-04: «Reales los posibles (tamaño de letra
  y borrado total funcionales; lectura fácil, idioma y proveedor de IA como
  Próximamente)».
- L2. Review gate (odd/reviews/ui-06.md, veredicto «aprobado con cambios»,
  sin bloqueantes): una ronda aplicada. Tras la purga se limpia también la
  bandera del onboarding (la app queda exactamente como recién instalada),
  la región aria-live del error es persistente (contenedor siempre montado),
  la confirmación abre con el foco en la contraseña y al cancelar vuelve al
  botón, y se retiró el bloque prefers-reduced-motion sin efecto. Refactor
  registrado como REF-UI-06 (SCRIPT_TAMANO duplica FUENTES sin custodia).
  Notas documentadas: aria-label en la tarjeta de tamaño (patrón h2 en las
  demás), desviación estética menor del chip seleccionado (tinta sobre
  acento, 5,5:1 AA). Implementación delegada a un escritor con superficie
  de edición acotada y TDD (RED a GREEN en preferencia y purga).
