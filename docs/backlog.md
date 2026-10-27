# Backlog

Estado vivo de las tareas de Letra Grande. El detalle de cada tarea vive en su documento de funcionalidad en `odd/tasks/<id>-<slug>.md`. Los criterios de aceptación son los de `docs/ARRANQUE.md` (sección 17) y no se reescriben aquí.

## Estado actual

Actualizado tras la Ola 1, la entrega del escritorio y el trabajo de interfaz. Cada fila dice qué está cerrado con PR y review, no qué se pretendía.

| Bloque | Hecho | Pendiente |
|---|---|---|
| Ola 0 (humano) | H-09 (entorno) y H-10 (ramas protegidas) | H-01 nombre y marca, H-02 revisión legal, H-03 cuentas y presupuesto, H-04 licencia del contenido, H-05 asociación de consumidores, H-06 avisos, **H-07 verificación de fichas** y **H-08 condiciones de NaN** |
| Ola 1 (fundamentos) | OPS-01, CORE-01, CORE-02, UI-01, OPS-04, AI-06, VAULT-01, UI-02, CONTENT-01, OPS-05, AI-01, AI-02, VAULT-02, OPS-04b, OPS-06 | ninguno |
| Ola 1 (documentación) | CORE-03: `ARCHITECTURE.md` y `data-model.md` | ninguno |
| Ola 2 (módulos) | RADAR-01 (motor de plazos y `.ics`), AI-03a (recuperación BM25), AI-05 (guardarraíles) | DOCS-01a en curso, DOCS-01b OCR (datos de idioma versionados, D-13), DOCS-02 y DOCS-03, RADAR-02 (interfaz de Hoy), AI-03 (pantalla del chat), AI-04 (evaluaciones), MOD-01 a MOD-03, CONTENT-02 a CONTENT-04 |
| Ola 2 (interfaz) | UI-03 a UI-07: landing, shell responsive, onboarding, ajustes y carpeta, con sus specs de Playwright; UI-08 y UI-09: logo del proyecto en landing, icono recortado y icono de la app | el resto de pantallas de los módulos |
| Escritorio (Windows) | DESK-01 build de dos salidas, DESK-02 ventana con `app://`, DESK-02c arranque en Hoy, DESK-03 instalador NSIS, DESK-03c icono de la marca | DESK-02d puerta del service worker, DESK-03b actualizador sobre GitHub Releases (canal decidido, D-12), DESK-04 macOS y Linux |
| Proceso y entrega | OPS-05, OPS-05c (el gate no da falsos rojos), OPS-05d (el informe se acepta con el id o el id base), OPS-05e (checkout del commit de la rama), H-10 (ramas protegidas) | ninguno |

## Detalle de las olas

Cada tarea la ejecuta un agente en su carril. `Dep.` indica dependencias. Los criterios de aceptación son comprobables.

**Carriles:** CORE (contratos y lógica base), VAULT (almacenamiento local), DOCS (extracción), AI (asistente), CONTENT (conocimiento verificado), UI (interfaz), MOD (módulos de producto), DATA (datos abiertos y API), QA (calidad, privacidad, legal), OPS (CI y despliegue), REF (refactors que salen de las reviews), H (humano).

**Reglas transversales (v0.2):**

- Cada tarea es una funcionalidad ODD con su documento `odd/tasks/<id>-<slug>.md` (sección 21.3).
- Toda tarea con lógica lleva tests de unidad (`vitest`) y toda tarea con interfaz lleva su spec de Playwright (sección 23). El modo TDD está activo: primero el test en rojo.
- Toda tarea pasa el review gate (sección 22) antes del merge. Los refactores opcionales que salgan de las reviews se registran como `REF-<id>` y no se ejecutan sin priorizarlos.
- Los carriles son superficies de edición disjuntas: dos tareas que toquen los mismos archivos no se ejecutan en paralelo.
- Los agentes hacen commit en su rama y abren PR. El merge a `main` es siempre humano (H-10).

### Ola 0: decisiones humanas (antes de publicar)

| ID | Tarea | Criterio |
|---|---|---|
| H-01 | Comprobar nombre: dominio, marca en la OEPM, handles | Nombre confirmado o alternativa elegida |
| H-02 | Revisar el aviso legal y `docs/legal-and-risk.md` con un abogado o una asociación de consumidores | Textos aprobados o corregidos |
| H-03 | Elegir proveedor de IA y alojamiento, crear cuentas y claves, fijar presupuesto mensual | Claves en el gestor de secretos, límite de gasto activo |
| H-04 | Decidir licencia del contenido (propuesta CC BY 4.0) y política de moderación: quién aprueba datos | Decisión escrita en `CONTRIBUTING.md` |
| H-05 | Contactar con una asociación de consumidores para revisión de contenido (opcional pero muy recomendable) | Contacto establecido |
| H-06 | Decidir avisos: solo `.ics` en el MVP, o también Web Push sin datos personales | Decisión escrita |
| D-01 | Elegir acento de color y nombre de la tipografía | Tokens fijados |
| H-08 | Preguntar a NaN Builders: si la clave permite servir a usuarios finales, límites por clave, retención y uso de datos de las peticiones, y soporte de salida estructurada por modelo | Respuesta por escrito archivada en `docs/ai-provider.md` |
| H-09 | Instalar y comprobar gentle-ai y gentle-shell (sección 21.6): `doctor`, estado de la revisión, proveedor NaN, lectura de `AGENTS.md`, versión y sistema operativo. **Hecho** en la práctica: el entorno funciona y de él salieron OPS-04b, OPS-05c y OPS-05e. No hay commit que lo acredite porque es verificación humana del entorno | Lista "no confirmado" de 21.7 resuelta o anotada |
| H-10 | Proteger `main` en GitHub: PR obligatorio, CI en verde, informe de review presente y aprobación humana | **Hecho**: `dev` y `main` protegidas con PR obligatorio, los checks `check`, `e2e` y `review-report` como requeridos, y `enforce_admins` activo. La aprobación no la exige GitHub (0 aprobaciones): la decisión humana es el propio merge |

### Ola 1: fundamentos (todo en paralelo)

| ID | Tarea | Dep. | Criterio de aceptación |
|---|---|---|---|
| OPS-01 | Crear el repo con los archivos de las secciones 6, 7, 11 y 12, README con aviso, CI | Ola 0 mínima | `pnpm install && pnpm check` en verde en CI |
| CORE-01 | `packages/schema` completo con los tests de 8.8 | OPS-01 | Todos los tests pasan; las plantillas validan |
| CORE-02 | `packages/privacy` según la sección 9 | OPS-01 | Todos los vectores de prueba pasan; cobertura superior al 90 % del paquete |
| CORE-03 | Escribir `ARCHITECTURE.md` y `data-model.md` a partir de este documento | CORE-01 | Documentos revisados y enlazados desde README |
| UI-01 | `packages/design`: tokens, Callout, componentes de bloque, foco visible y 44 px | OPS-01 | Storybook o galería local; axe sin errores |
| UI-02 | Shell de la PWA: navegación, rutas vacías por módulo, manifiesto, iconos, service worker, offline básico | UI-01 | Instalable; Lighthouse PWA en verde; sin scroll horizontal a 375 px |
| VAULT-01 | `packages/vault`: IndexedDB con AES-GCM, clave por contraseña (PBKDF2 600 000), bloqueo por inactividad | CORE-01 | Tests de cifrado y descifrado; la clave no es extraíble; manejo de contraseña errónea |
| VAULT-02 | Exportar e importar copia cifrada y "borrar todo" | VAULT-01 | Ida y vuelta sin pérdida; tras borrar no queda nada en IndexedDB |
| AI-01 | Proxy de IA sin estado: rate limit, sin logs de cuerpo, rechaza PII residual | CORE-02, AI-06 | Test: petición con DNI es rechazada; ningún log contiene el texto |
| AI-02 | Renderizador de bloques en UI y validación de servidor (`validateAnswerAgainstSources`) | CORE-01, UI-01 | Respuesta con cifra inventada se descarta; cada `kind` tiene componente |
| CONTENT-01 | Guía y checklist de verificación e issue templates (la plantilla de PR pertenece a OPS-05) | CORE-01 | Plantillas de issue en `.github/`; `CONTRIBUTING.md` con el flujo |
| OPS-04 | Playwright: configuración, cuatro proyectos, fixtures sintéticas, guardián de red, CI con informe y trazas (sección 23) | OPS-01 | `pnpm e2e` pasa con un smoke test en los cuatro proyectos; el CI sube el informe |
| OPS-05 | Review gate: `docs/review-gate.md`, plantilla de informe, plantilla de PR con casilla de review, script que falla si falta `odd/reviews/<id>.md` en un PR con id (sección 22) | OPS-01, H-09 | Un PR de prueba sin informe falla y con informe pasa |
| AI-06 | Capa de proveedor: interfaz `LlmProvider`, adaptadores `nan` (compatible con OpenAI) y `mock`, política de errores y reintentos, cuota por usuario, `.env.example` (sección 24) | CORE-01 | Tests con servidor simulado: un 429 se reintenta y un 401 no; el modo `mock` es determinista |

### Ola 2: módulos núcleo

| ID | Tarea | Dep. | Criterio de aceptación |
|---|---|---|---|
| DOCS-01 | Subida y lectura local de PDF (texto) y de fotos (OCR en navegador, carga diferida). Partida en DOCS-01a y DOCS-01b | VAULT-01 | Lectura de PDF sin ninguna petición de red (comprobado en test). El OCR descarga una sola vez los datos de idioma del propio origen, bajo demanda, y los deja en caché (D-13); el test falla si aparece cualquier origen ajeno |
| DOCS-02 | Extractor de factura de luz: comercializadora, CUPS, periodo, potencia, tarifa, consumo por periodo, importe | DOCS-01 | Precisión superior al 90 % sobre 20 facturas sintéticas; si falla un campo, lo marca como no leído |
| DOCS-03 | Clasificador de tipo de documento (factura, contrato, carta oficial, multa, ticket, póliza) | DOCS-01 | Precisión superior al 85 % en el conjunto sintético |
| RADAR-01 | `packages/radar`: cálculo de fechas, estados, exportación `.ics` | CORE-01 | Tests de cada unidad de plazo; días hábiles marcados como aproximados |
| RADAR-02 | UI "Hoy": línea de tiempo, crear manual, marcar hecho, exportar `.ics` | RADAR-01, UI-02 | El `.ics` se abre en Google Calendar, Apple y Outlook |
| UI-03 | Landing pública en la raíz: maqueta aprobada, acento teal de marca y tipografía autoalojada; la app empieza en `/hoy` | UI-01, UI-02 | Igual al mockup; e2e de portada en verde; sin scroll horizontal a 375 px |
| UI-04 | Shell responsive: sidebar de escritorio (Escritorio.dc.html) y barra móvil flotante glass con hoja «Más» | UI-02, UI-03 | Igual al diseño en escritorio; barra glass en móvil con 44 px y safe-area; sin scroll horizontal a 375 px |
| UI-05 | Onboarding de primer arranque: bienvenida, comparativa con asistentes generales, seguridad con marcadores y paso de instalación PWA | UI-04 | Se muestra solo la primera vez; Saltar y terminar llevan a `/hoy`; e2e del flujo |
| UI-06 | Ajustes: tamaño de letra funcional, borrado total con contraseña (VAULT-02) y «Próximamente» honesto | UI-04, UI-05 | El tamaño se aplica y persiste; la purga pide contraseña y `WrongPasswordError` no borra; AA |
| UI-07 | Carpeta privada: crear, desbloquear y bloquear sobre el vault real | UI-06 | Contraseñas distintas no tocan datos; `WrongPasswordError` honesto; bloquear descarta la clave; sin red |
| CARPETA-01 | UI "Carpeta": lista, ficha de documento, etiquetas, vincular plazo al radar | VAULT-01, DOCS-03, RADAR-01 | Flujo completo de subir un documento y ver su plazo en Hoy |
| AI-03 | Asistente: índice de búsqueda BM25 con filtros sobre `content/`, chat con bloques y citas, aviso de caducidad | AI-01, AI-02, CONTENT-01 | Cada bloque muestra su fuente; sin fuentes, responde `outOfScope` |
| AI-04 | Conjunto de 40 evaluaciones (sección 13.2) y ejecución nocturna en CI | AI-03 | Informe con las cuatro métricas; el CI falla si caen por debajo de los umbrales fijados |
| AI-05 | Guardarraíles: prompt de sistema, rechazo de asesoramiento individual, derivación | AI-03 | Casos de la tabla 13.2 pasan |
| CONTENT-02 | Fichas borrador de las 5 mayores comercializadoras de electricidad y 5 operadoras (**borrador, para verificación humana**) | CONTENT-01 | Fichas con fuentes y `verified: false`; lista de pendientes de verificar |
| CONTENT-03 | Fichas de organismos: consumo estatal, telecomunicaciones, banca, seguros, energía, aviación, y consumo autonómico por comunidad | CONTENT-01 | Una ficha por organismo con `howToFile` y fuente |
| CONTENT-04 | Trámites: reclamar suministro, baja de línea, portabilidad, reclamar retraso de vuelo | CONTENT-01 | Trámites con pasos, plazos y fuentes |
| H-07 | **Verificar a mano** las fichas de CONTENT-02 a 04 (10 a 15 min por ficha) | CONTENT-02..04 | Fichas con `verified: true`, quién y cuándo |
| MOD-01 | Reclamar: triaje, ruta de escalado desde `escalation`, carta con marcadores, PDF, lista de pruebas | AI-03, CONTENT-03 | Carta generada sin datos personales en el servidor; datos rellenados en local |
| MOD-02 | Bajas: directorio, guía por empresa, plantilla de carta y burofax, aviso de permanencia | CONTENT-02 | Cada ficha muestra "verificado el" |
| MOD-03 | Factura de luz: explicación por conceptos, alertas (potencia, conceptos inesperados), comparación informativa con precios públicos | DOCS-02, DATA-01 | Alertas con fuente; la comparación se etiqueta como informativa |

### Ola 3: módulos ampliados

| ID | Tarea | Dep. | Criterio de aceptación |
|---|---|---|---|
| MOD-04 | Vida: checklists por evento con dependencias entre trámites públicos y privados | CONTENT-04 | 5 eventos con contenido verificado |
| MOD-05 | Multas y cartas oficiales: qué es, plazo, opciones; sin recomendar pagar ni recurrir | DOCS-03, AI-05 | Plazo al radar; pasa las pruebas de asesoramiento |
| MOD-06 | Retrasos y cancelaciones: calculadora de derechos con reglas parametrizadas y reclamación | CONTENT-04 | Reglas con fuente; casos de prueba de la norma |
| MOD-07 | Garantías y devoluciones: plazos por tipo de bien desde un ticket | DOCS-01 | Valores en `content/` verificados |
| MOD-08 | Contratos: detección de permanencia, renovación automática, penalizaciones, modificación unilateral, con cita al texto | DOCS-01, AI-05 | Cada alerta cita el fragmento del contrato |
| MOD-09 | Suscripciones: CSV bancario local, detección de recurrentes, enlace a Bajas | MOD-02 | Todo en local; sin red |
| MOD-10 | Seguros: coberturas, exclusiones, plazos de siniestro | DOCS-01 | Cita a la póliza |
| MOD-11 | Ayudas: perfil cruzado con ayudas por comunidad, plazos al radar | DATA-01 | Cada ayuda con fuente y convocatoria |
| MOD-12 | Familia: perfiles múltiples con bóvedas separadas, lectura fácil | VAULT-01 | Perfiles aislados; cambio de perfil exige contraseña |
| MOD-13 | Autónomo: calendario fiscal personalizable | CONTENT-04 | Fechas con fuente oficial |
| MOD-14 | Guion de llamada: qué decir, qué pedir, dónde apuntar | AI-05 | Bloque guiado reutilizable |
| MOD-15 | Lectura fácil y lenguas cooficiales y en inglés | UI-02 | Cambio de idioma sin recargar; textos revisados por hablantes |

### Ola 4: datos abiertos y apertura

| ID | Tarea | Dep. | Criterio de aceptación |
|---|---|---|---|
| DATA-01 | Verificar las fuentes de la sección 16 y construir el framework de ingesta con caché | OPS-01 | `docs/sources.md` con acceso, licencia y formato de cada fuente |
| DATA-02 | Legislación explicada: normas de consumo desde el BOE con resumen y fecha de vigencia | DATA-01 | Cada norma enlaza a su texto consolidado |
| DATA-03 | Observatorio: datos oficiales de reclamaciones y sanciones por sector, con método y fecha | DATA-01 | Página "Sobre los datos"; gráficos accesibles |
| DATA-04 | API pública de lectura: directorio, organismos, trámites, plazos, con OpenAPI y versionado | CORE-01 | Documentación publicada; licencia y atribución indicadas |
| DATA-05 | "Tu comunidad": organismos de consumo autonómicos y locales | CONTENT-03 | Cobertura por comunidad indicada |
| EXT-01 | Extensión de Chrome en solo lectura: explica la factura y avisa de trampas en flujos de baja | MOD-03 | Sin envío de datos; todo local; pasa revisión de permisos mínimos |

### Ola 5: endurecimiento y lanzamiento

| ID | Tarea | Dep. | Criterio de aceptación |
|---|---|---|---|
| QA-01 | Auditoría de privacidad: Playwright intercepta toda la red y falla si algo sale a un origen no permitido o con PII | Ola 2 | Test en CI; lista de orígenes permitidos versionada |
| QA-02 | Accesibilidad: axe en CI, lector de pantalla, zoom al 200 %, 375 px, movimiento reducido | Ola 2 | Sin errores AA |
| QA-03 | Revisión legal de textos, política de privacidad y términos; documentación RGPD | H-02 | Documentos aprobados por un profesional |
| QA-04 | Prueba adversarial: inyección de prompts desde documentos, fuga de datos, abuso del proxy | AI-05 | Informe y correcciones; casos añadidos a las evaluaciones |
| QA-05 | Rendimiento y offline: Lighthouse, tamaño de bundle, OCR cargado bajo demanda | UI-02 | Presupuesto de rendimiento en CI |
| QA-06 | Modelo de contribución: `CODEOWNERS` por sector, plantillas, política de verificación | CONTENT-01 | Documentado y activo |
| QA-07 | Suites e2e completas: vault, privacidad de red, carpeta con factura sintética, asistente con proveedor `mock`, radar y `.ics`, accesibilidad, responsive y offline, más un test `@live` nocturno contra NaN | OPS-04, módulos de la Ola 2 | Todo en verde en los cuatro proyectos; el test `@live` informa de JSON válido y citas válidas |
| QA-08 | Pase de arquitectura al cerrar cada ola: un revisor audita duplicación entre carriles, grafo de dependencias, tamaño de bundle y nombres, y genera tareas `REF-<id>` | Cada ola | Informe en `odd/reviews/ola-<n>.md` |
| OPS-02 | Despliegue con vista previa por PR y cabeceras de seguridad (CSP) | OPS-01 | CSP estricta activa; sin errores en consola |
| OPS-03 | Observabilidad sin datos personales: métricas agregadas y sin analytics de terceros | OPS-02 | Ninguna métrica contiene contenido de usuario |
| REL-01 | Beta cerrada con unas 20 personas y protocolo de feedback sin datos personales | QA-01..04 | Informe de hallazgos |
| REL-02 | Lanzamiento público: web, demo con datos ficticios, contacto con medios y asociaciones | REL-01 | Lanzamiento solo si QA-01, QA-03 y QA-04 están cerrados |

---

## Refactors y notas registrados por las reviews

Estas tareas no se ejecutan dentro de la tarea que las origina: se registran aquí y se priorizan aparte.

| ID | Origen | Qué revisar |
|---|---|---|
| REF-OPS-01 | Review de OPS-01, hallazgo 3 | Dependencias declaradas por adelantado en `apps/web` (`vitest`, `jsdom`, `@testing-library/react`, `cross-env`): confirmar en OPS-04 y en UI-02 cuáles se usan y retirar las que sobren. |
| REF-OPS-01b | Review de OPS-01, hallazgo 4 | Si algún paquete de `packages/` se va a publicar, hará falta build propio: hoy `main` y `types` apuntan a `./src/index.ts`. |
| REF-OPS-04 | Review de OPS-04, hallazgo 2 | El guardián de red solo escucha `page.on("request")`: valorar escuchar también `context.on("request")` para cubrir peticiones del service worker antes de los specs de privacidad de la Ola 2. |
| REF-OPS-04b | Review de OPS-04, hallazgo 3 | `process.env as Record<string, string>` en `playwright.config.ts` oculta valores indefinidos en el entorno del `webServer`. |
| REF-OPS-06 | Review de OPS-06, hallazgo 1 | Salir de webpack: migrar a Turbopack cuando soporte `extensionAlias`, o reescribir los especificadores `.js` de los paquetes del workspace por `bundler`-friendly. Hoy `next dev --webpack` y `next build --webpack` son la salida prevista. |
| REF-UI-01 | Review de UI-01, hallazgo 4 | Cuatro componentes de bloque idénticos salvo la etiqueta: extraer uno genérico con etiqueta y clase por `kind`. |
| REF-AI-01 | Review de AI-01, hallazgo 1 | Mover el tiempo de espera del proveedor a la factoría de `@letra-grande/ai` (`ProviderFromEnvOptions.timeoutMs`) en lugar del decorador del proxy. |
| REF-AI-06 | Review de AI-06, hallazgo 5 | Circuit breaker en half-open: limitar a una única sonda en vuelo para no lanzar una tormenta de pruebas al recuperarse. |
| REF-VAULT-02 | Review de VAULT-02 | Cuatro seguimientos: bloqueo entre pestañas con Web Locks, simulación de aborto a mitad de transacción, nota de memoria con blobs grandes y el doble cast del `payload`. |
| REF-UI-03 | Review de UI-03, hallazgo 6 | El anillo de foco con color de acento es invisible sobre botones con fondo de acento (preexistente en la baseline). Definir un anillo de foco de doble tono. |
| REF-UI-03 | Review de UI-03, hallazgo 7 | Duplicación menor en la landing: URLs de GitHub repetidas y `#26605C`/`#ECF5F4` en TS y CSS; centralizar en un módulo de constantes. |
| REF-UI-04 | Review de UI-04, hallazgo 4 | Duplicación de shell: `Trazo` en BottomNav y Sidebar, cubos de logo CSS repetidos y hex de marca repetidos; extraer a módulo compartido. |
| REF-UI-05 | Review de UI-05, hallazgo 5 | Botones del onboarding duplicados de landing.css (incluido el blanco de L4) y tercera copia de `Trazo`; extraer a un módulo compartido de botones e iconos. |
| REF-UI-06 | Review de UI-06, hallazgo 4 | El script anti-salto del layout duplica las fuentes de `FUENTES` sin custodia: derivar el mapa de `FUENTES` o añadir un test que compare ambos. |
| REF-UI-02 | Review de UI-02, hallazgo 5 | La comprobación de 375 px se hizo a mano y no quedó como spec: entra en `QA-07` (accesibilidad, responsive y offline). |

| REF-UI-02 | Review de UI-02, hallazgo 5 | La comprobación de 375 px se hizo a mano y no quedó como spec: entra en `QA-07` (accesibilidad, responsive y offline). |
| REF-OPS-05b | Revisión de AI-03a | El comprobador de informes extrae el id del título con el patrón `[a-z]+-\d+`, así que una tarea con letra final (`AI-03a`) busca `ai-03.md` y no `ai-03a.md`. Ampliar el patrón a `[a-z]+-\d+[a-z]?` antes de que se repita. |
| REF-OPS-05e | Review de OPS-05d | **Hecho en OPS-05e**: el job `review-report` hace checkout del commit de la rama (`github.event.pull_request.head.sha`) en lugar del merge ref. |

## Escritorio (Electron)

Decisión y diseño en [`desktop.md`](desktop.md). Solo Windows en el alcance inicial; macOS y Linux quedan como tareas propias porque exigen firma y, en macOS, el Apple Developer Program.

| ID | Tarea | Dep. | Criterio de aceptación |
|---|---|---|---|
| DESK-01 | Build de dos salidas en `apps/web`: servidor para la web y exportación estática para el escritorio, con la ruta de API fuera de la estática | OPS-06 | `pnpm build` sigue produciendo la web; una segunda orden produce el estático sin errores y sin service worker |
| DESK-02 | `apps/desktop`: ventana Electron con `contextIsolation`, `sandbox`, protocolo `app://`, superficie mínima en el preload, enlaces externos al navegador y CSP | DESK-01 | El binario abre la app, crea el vault, reinicia y el vault persiste; ninguna navegación sale de `app://` |
| DESK-03 | Canal de entrega de Windows: `electron-builder` con NSIS, actualizador, artefacto en CI y firma cuando haya certificado | DESK-02 | Instalador descargable que se instala, actualiza y desinstala; el aviso de SmartScreen está documentado en la landing |
| DESK-02d | Puerta de escritorio en el registro del service worker: `import.meta.env.DESKTOP` para no intentar registrar en `app://`, como promete la sección 5 de `desktop.md` | DESK-02 | El registro no se intenta en la app instalada y la web lo mantiene |
| DESK-04 | macOS y Linux: firma y notarización en macOS, AppImage y `.deb` en Linux, con lo que cada uno exige | DESK-03, licencia de Apple | macOS abre sin bloqueo de Gatekeeper; Linux instala y actualiza por gestor o descarga |
| REF-DESK-01 | Review de DESK-01 | La exportación de escritorio excluye las rutas `.ts` con `pageExtensions`; hoy todas las páginas son `.tsx`. Añadir en CI una comprobación de que el conjunto de rutas de la web y de la exportación coincide, para que una `page.ts` futura no desaparezca en silencio. |
| REF-OPS-07a | Review de OPS-07, hallazgo 1 | El `<img>` de la marca está duplicado en cabecera y pie (`page.tsx`), con tamaños distintos (44 y 36): extraer un componente de marca cuando se toque esa zona. |
| REF-UI-09b | Review de UI-09, hallazgo 2 | `logo-icono.png` pesa 70 KB en RGBA; una cuantización a paleta lo dejaría en 20 o 25 KB sin pérdida visible y mejora el LCP de la landing. |
| REF-UI-09c | Review de UI-09, hallazgo 1 | Queda una orla de un píxel casi blanca con alfa muy bajo en el icono del escritorio: erosionar el alfa un píxel si alguna vez se ve sobre un fondo oscuro grande. |
| REF-OPS-07 | Review de OPS-07, hallazgos 2 y 3 | `VistaCarpeta` tiene dos fuentes de verdad (la vista y el estado) y el arreglo del fotograma añade una tercera señal (`montado`). Derivar la vista del estado y dejar el fotograma imposible por construcción, con un test unitario que lo fije. |
