# Backlog

Estado vivo de las tareas de Letra Grande. El detalle de cada tarea vive en su documento de funcionalidad en `odd/tasks/<id>-<slug>.md`. Los criterios de aceptación son los de `docs/ARRANQUE.md` (sección 17) y no se reescriben aquí.

## Estado actual

| Ola | Tareas | Estado |
|---|---|---|
| 0 | H-01 a H-10, D-01 | pendiente (humano) |
| 1 | OPS-01, CORE-01, CORE-02, UI-01, OPS-04, AI-06, VAULT-01, UI-02, CONTENT-01, OPS-05, AI-01, AI-02, VAULT-02 | en curso |

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
| H-09 | Instalar y comprobar gentle-ai y gentle-shell (sección 21.6): `doctor`, estado de la revisión, proveedor NaN, lectura de `AGENTS.md`, versión y sistema operativo | Lista "no confirmado" de 21.7 resuelta o anotada |
| H-10 | Proteger `main` en GitHub: PR obligatorio, CI en verde, informe de review presente y aprobación humana | Regla activa |

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
| CONTENT-01 | Guía y checklist de verificación, plantilla de PR de datos, issue templates | CORE-01 | Plantillas en `.github/`; `CONTRIBUTING.md` con el flujo |
| OPS-04 | Playwright: configuración, cuatro proyectos, fixtures sintéticas, guardián de red, CI con informe y trazas (sección 23) | OPS-01 | `pnpm e2e` pasa con un smoke test en los cuatro proyectos; el CI sube el informe |
| OPS-05 | Review gate: `docs/review-gate.md`, plantilla de informe, plantilla de PR con casilla de review, script que falla si falta `odd/reviews/<id>.md` en un PR con id (sección 22) | OPS-01, H-09 | Un PR de prueba sin informe falla y con informe pasa |
| AI-06 | Capa de proveedor: interfaz `LlmProvider`, adaptadores `nan` (compatible con OpenAI) y `mock`, política de errores y reintentos, cuota por usuario, `.env.example` (sección 24) | CORE-01 | Tests con servidor simulado: un 429 se reintenta y un 401 no; el modo `mock` es determinista |

### Ola 2: módulos núcleo

| ID | Tarea | Dep. | Criterio de aceptación |
|---|---|---|---|
| DOCS-01 | Subida y lectura local de PDF (texto) y de fotos (OCR en navegador, carga diferida) | VAULT-01 | Sin ninguna petición de red durante la extracción (comprobado en test) |
| DOCS-02 | Extractor de factura de luz: comercializadora, CUPS, periodo, potencia, tarifa, consumo por periodo, importe | DOCS-01 | Precisión superior al 90 % sobre 20 facturas sintéticas; si falla un campo, lo marca como no leído |
| DOCS-03 | Clasificador de tipo de documento (factura, contrato, carta oficial, multa, ticket, póliza) | DOCS-01 | Precisión superior al 85 % en el conjunto sintético |
| RADAR-01 | `packages/radar`: cálculo de fechas, estados, exportación `.ics` | CORE-01 | Tests de cada unidad de plazo; días hábiles marcados como aproximados |
| RADAR-02 | UI "Hoy": línea de tiempo, crear manual, marcar hecho, exportar `.ics` | RADAR-01, UI-02 | El `.ics` se abre en Google Calendar, Apple y Outlook |
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
