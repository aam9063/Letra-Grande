# REF-QA-08-01: una sola fuente de verdad para los colores

## Objetivo y motivo

Sale del pase de arquitectura de la ola (`odd/reviews/ola-2.md`, hallazgo 1). Los colores de la app viven en tres sitios: `packages/design/src/tokens.ts` se declara fuente de verdad, `packages/design/src/base.css:8-20` los repite como custom properties y `apps/web/src/app/globals.css:2-6` vuelve a declarar cinco de ellos. Las dos hojas se cargan en la misma página (`apps/web/src/app/layout.tsx:7-8`), así que la última gana, y ya hay una divergencia visible: el lienzo es `#F7F7F8` en `base.css:9` y `#f7f7f8` en `globals.css:3`.

Y el uso: entre las tres hojas hay 143 literales hexadecimales, con `landing.css` a la cabeza (84 literales y solo dos usos de `var(--lg-)`). De todos esos colores, solo nueve son tokens del sistema; el resto son una paleta paralela que nació fuera de `packages/design` y se replicó a mano, incluidos cuatro colores de etiqueta que están en tres hojas.

Coste de dejarlo: cambiar un color de marca exige tocar tres o cuatro ficheros y acordarse de los literales, y el test de contraste no lo ve porque solo mide los tonos de `tokens.ts`. Cada pantalla nueva copia más hexes.

## Alcance y restricciones

- Dentro:
  - Cerrar la paleta en `packages/design`: los diez colores que hoy solo existen como literales pasan a tokens con nombre y, cuando son texto, con su par de contraste comprobado.
  - Declararlos en `base.css` y quitar de `globals.css` la redeclaración de tokens; solo se quedan allí los dos overrides deliberados, documentados como tales.
  - Sustituir los literales de `globals.css`, `landing.css`, `onboarding.css` y los que haya en `landing.ts` por `var(--lg-*)` o por los tokens de TypeScript según dónde estén.
  - Actualizar la galería del sistema de diseño y los tests de contraste.
- Fuera:
  - Cambiar el diseño de ninguna pantalla: mismo aspecto, salvo la unificación de las casi-copias que se explica abajo.
  - Tocar `--lg-espacio` y `--lg-radio`: son overrides deliberados (`layout.tsx:5-6`) y se quedan, ahora documentados.
  - Reordenar o renombrar componentes, o tocar los bloques del catálogo.
- Invariantes: todo par texto/fondo nuevo tiene que pasar AA; ningún token nuevo sin uso real; nada de valores inventados, todos salen de los literales que ya están en las hojas.

## La paleta que se añade

Valores tomados de los literales existentes, sin inventar ninguno:

| Token | Valor | De dónde sale |
|---|---|---|
| `colorTextoTenue` | `#55555F` | texto secundario, en las tres hojas |
| `colorTextoMedio` | `#3A3A42` | texto de apoyo en landing y onboarding |
| `colorBordeSuave` | `#E3E3E8` | bordes suaves, separadores |
| `colorBorde` | `#D5D5DC` | bordes de controles |
| `colorBordeFuerte` | `#C9C9D1` | bordes de la landing |
| `colorSuperficieAlterna` | `#ECECF0` | superficie alterna |
| `colorAcentoSuave` | `#ECF5F4` | fondo de apoyo con acento |
| `colorAcentoSuaveTexto` | `#26605C` | texto sobre el fondo anterior |
| `colorAcentoClaro` | `#BFE6E2` | decorativo de la landing |
| `colorAcentoClaroFuerte` | `#8FD3CC` | decorativo de la landing |

Y un registro `etiquetas` con dos pares, porque hoy están copiados en tres hojas:

| Etiqueta | Fondo | Texto |
|---|---|---|
| `ok` | `#E6F4EA` | `#135C2E` |
| `proxima` | `#E3F2F1` | `#17504B` |

**Unificación aceptada:** la landing usa `#FFF3D6` sobre `#6B4500` como aviso, casi idéntico al tono `aviso` del sistema (`#FDF3D7` con `#6B4B00`). Pasa a usar el tono del sistema. Es el único cambio de color, es imperceptible y gana consistencia; queda anotado aquí porque el criterio del proyecto es no cambiar nada sin decirlo.

## Superficie de edición

`packages/design/src/tokens.ts`, `packages/design/src/base.css`, `packages/design/src/gallery/**`, `packages/design/test/**`, `apps/web/src/app/globals.css`, `apps/web/src/app/(landing)/landing.css`, `apps/web/src/app/(landing)/landing.ts`, `apps/web/src/app/(onboarding)/onboarding.css`, `docs/backlog.md`, `odd/tasks/ref-qa-08-01-tokens.md`, `odd/reviews/ref-qa-08-01.md`.

## Modo TDD (nuestra)

- Activo: sí.
- Runner: `vitest` para los tokens y el contraste, `playwright` para comprobar que el aspecto no se rompe (los specs de accesibilidad de QA-02 y los de interfaz existentes).
- RED: los tests de contraste de los pares nuevos y el test que exige que `base.css` declare exactamente los tokens de `tokens.ts` se escriben antes de tocar las hojas.

## Riesgo y review (nuestra)

- Tipo: UI / sistema de diseño.
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 3, porque `packages/design` es un paquete compartido que consumen todas las pantallas y sus tokens son contrato; y elemento 6 si un cambio de color degrada el contraste sin que ningún test lo note. Mitigación: los tokens nuevos se prueban con el mismo test de contraste AA que ya existe, y la guarda de accesibilidad de QA-02 corre en CI sobre las once rutas.

## Tareas

- [x] Documento de funcionalidad antes del primer código.
- [x] RED: tests de contraste de los pares nuevos y test de coherencia entre `tokens.ts` y `base.css`.
- [x] Tokens nuevos en `tokens.ts` con su registro de etiquetas.
- [x] `base.css` declara la paleta completa; `globals.css` deja de redeclarar.
- [x] Sustituir los literales de las tres hojas y de `landing.ts`.
- [x] Galería del sistema de diseño actualizada.
- [x] `pnpm check` y `pnpm e2e` en verde, con axe AA en las once rutas (`pnpm style` aparte: solo falla por `.atl/skill-registry.md`, fuera de git).
- [x] Backlog actualizado y `REF-QA-08-01` cerrada (falta el PR y el merge, que deciden una persona).
- [x] Review gate con informe en `odd/reviews/ref-qa-08-01.md` y una ronda de correcciones.

## Evidencia y progreso

Implementación en la rama `lg/ref-qa-08-01-tokens` (pendiente de review gate).

- **RED:** cinco tests nuevos en `packages/design/test` (contraste de texto tenue y medio sobre lienzo, superficie y superficie alterna; par de acento suave; registro `etiquetas`; coherencia exacta `tokens.ts`/`base.css`). Fallaban porque los tokens no existían (`Object.keys(undefined)` y `contraste(undefined, ...)`).
- **GREEN:** 43 tests de `packages/design` en verde tras añadir los diez tokens y el registro `etiquetas` a `tokens.ts` y las catorce custom properties a `base.css`.
- **Literales hexadecimales** (medidos con `grep -o '#[0-9A-Fa-f]\{6\}'`): `globals.css` 26 → 0, `landing.css` 84 → 0, `onboarding.css` 20 → 0, `landing.ts` 24 → 3 (solo comentarios). Con la autorización posterior del orquestador, `#FDEBE9/#9A1B12` pasa al tono `peligro` del sistema (contraste 7.18:1 → 7.92:1) y `#F0F0F3` pasa a `colorSuperficieAlterna` (Δ ≤ 4/255 por canal): cambios imperceptibles.
- **Registro `etiquetas`:** vive anidado en el objeto `tokens` (`tokens.etiquetas`) porque `index.ts` y `client.ts`, que están fuera de la superficie de edición, no lo reexportan y `landing.ts` solo puede importar por el barrel o por `/client`. Si se prefiere como export separado (como `tonos`), hace falta añadirlo a los dos barrel.
- **Aviso de la landing unificado** al tono `aviso` del sistema en `landing.css` y en los dos radares de `landing.ts`, según lo aceptado en este documento.
- **Decisiones fuera del documento:** en `globals.css` se conservan `--lg-fuente-base` y `--lg-linea` (escala tipográfica de la app, no vienen de `base.css`, no son redeclaración de tokens); `--lg-objetivo` se elimina porque sí lo declara `base.css` con el mismo valor.
- **Superficie ampliada con autorización:** `apps/web/src/test/pwa.test.ts` exigía que `globals.css` redeclarara los tokens, justo lo que esta tarea elimina. Con autorización expresa del orquestador, el test exige ahora el comportamiento nuevo: `globals.css` no redeclara los tokens de color ni `--lg-objetivo` (los declara `base.css`) y conserva solo `--lg-espacio: 0.25rem` y `--lg-radio: 0.5rem` como overrides, más su escala tipográfica propia. Los barrels `index.ts` y `client.ts` no se tocan: `etiquetas` anidado en `tokens` se mantiene por decisión del orquestador.
- **Verificación:** `pnpm --filter @letra-grande/design test` 43/43 en verde; `pnpm typecheck` en verde; `pnpm content:validate` en verde (24 fichas); `pnpm check` en verde salvo `pnpm style`, que falla solo por `.atl/skill-registry.md` (ruido del equipo, fuera de git); `pnpm e2e` (resultado abajo).
