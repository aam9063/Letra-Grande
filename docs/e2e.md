# Tests de interfaz con Playwright

Documento operativo de las pruebas e2e de Letra Grande. El diseño de fondo está en la sección 23 de `docs/ARRANQUE.md`; esto es cómo se ejecuta hoy.

## Qué se prueba con e2e y qué no

- **E2E (Playwright):** flujos completos de usuario y los invariantes de privacidad en la red.
- **Unidad (vitest):** lógica pura. Esquemas, enmascarado, radar, extractores, componentes aislados con `jsdom`.

Un flujo de interfaz sin spec de Playwright no se da por terminado. En ODD con TDD, el spec en rojo es el RED de la tarea.

## Estructura

```
apps/web/
├── playwright.config.ts
├── e2e/
│   ├── fixtures/            generador de documentos sintéticos y su README
│   ├── helpers/             guardián de red
│   ├── smoke.spec.ts
│   └── network-guard.spec.ts
└── generated/               salida del generador (ignorada por git)
```

## Cómo se ejecuta

Primera vez en cada máquina:

```
pnpm --filter @letra-grande/web exec playwright install
```

En Ubuntu, dentro de los contenedores de CI, se añade `--with-deps`.

Después:

```
pnpm e2e                                        # los cuatro proyectos, proveedor mock
pnpm --filter @letra-grande/web e2e:ui          # modo interactivo
pnpm --filter @letra-grande/web fixtures        # regenera las fixtures sintéticas
```

Los tests se ejecutan contra la build de producción servida en el puerto 3100. El service worker de la PWA no se comporta igual en desarrollo, y probar la build es la única forma de detectar diferencias de arranque.

## Cuatro proyectos

chromium, firefox, webkit y mobile-chrome (Pixel 7). Un cambio de interfaz no está terminado hasta que pasa en los cuatro.

## Fixtures sintéticas

La fuente de verdad es el generador `apps/web/e2e/fixtures/generate.mjs`, no un archivo versionado: emite un PDF válido con datos inventados y se ejecuta antes de las pruebas. Se decidió así para no versionar binarios y para que el contenido de cada fixture sea auditable en una revisión de código. Esto difiere de la sección 23.2 del documento de arranque, que hablaba de versionar los PDF: manda este documento.

Reglas: nunca una factura real, nunca una empresa real, nunca un dato personal real, ni siquiera en los valores de ejemplo.

## Guardián de red

`e2e/helpers/network-guard.ts` registra dos tipos de violación: salida a un origen no permitido y cuerpo de petición con un patrón de dato personal (documento, IBAN, CUPS, email). Todo spec que toque la red del asistente lo usa y comprueba que la lista queda vacía.

El guardián tiene su propio test: se le cuela una petición a un origen ajeno y un DNI en un cuerpo, y debe detectar ambos. Un guardián que no falla no protege nada.

## Proveedor de IA en las pruebas

En CI y en local el proveedor es `mock`, determinista. Los tests que llaman al proveedor real llevan la etiqueta `@live`, se excluyen por defecto y solo corren con `E2E_LIVE=1` y presupuesto asignado. No bloquean un PR.

## Reglas de escritura de specs

- Localizadores por rol, etiqueta o texto accesible. Nunca por clase CSS.
- Prohibido `waitForTimeout`: se espera por condición observable.
- Cada test arranca con contexto nuevo y carpeta vacía: no dependen unos de otros.
- Fechas y plazos se controlan con `page.clock`, nunca con la fecha real.
- Un test inestable no se reintenta hasta que pase: se arregla o se pone en cuarentena con una issue y una fecha.
- Títulos en español, sin rayas largas ni medias rayas.

## Cobertura mínima por ola

| Ola | Specs que deben existir |
|---|---|
| 1 | `smoke` y `network-guard` (más `pwa-offline` y `vault` cuando existan UI-02 y VAULT-01) |
| 2 | `privacy-network`, `carpeta-factura`, `asistente`, `radar-ics`, `a11y`, `responsive` |
| 3 | un spec por módulo nuevo, con su caso de error |
| 4 | API pública con `request`, Observatorio accesible |
| 5 | auditoría completa de red y un `@live` nocturno |

## CI

El job `e2e` del workflow instala dependencias con el lockfile congelado, instala navegadores con sus dependencias de sistema, regenera las fixtures, ejecuta la suite y sube el informe como artefacto, también cuando falla.
