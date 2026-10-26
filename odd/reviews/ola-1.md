# Cierre de la Ola 1

Pase de ola sobre lo construido y lo pendiente. Las reviews por tarea están en `odd/reviews/<id>.md`; esto es la vista de conjunto.

## Qué quedó hecho

Catorce tareas en `dev`, cada una con su documento en `odd/tasks/`, su informe de review, CI en verde y merge por este orquestador sobre la rama `dev`. `main` sigue intacta: solo tiene el documento de arranque, y el merge a `main` es decisión humana.

| Área | Tarea | Qué entrega |
|---|---|---|
| Repositorio | OPS-01 | Monorepo pnpm, TypeScript estricto, estilo, `AGENTS.md`, backlog y CI |
| Datos | CORE-01 | `@letra-grande/schema`: ficha, organismo, trámite, bloques y vault, con validador de contenido |
| Privacidad | CORE-02 | `@letra-grande/privacy`: detección y enmascarado con cobertura por encima del 90 % |
| Diseño | UI-01 | `@letra-grande/design`: tokens, `Callout`, bloques con cita enlazada y galería con axe |
| Interfaz | UI-02 | Shell PWA, ocho rutas, manifiesto, iconos y service worker versionado |
| Vault | VAULT-01, VAULT-02 | IndexedDB cifrado con AES-GCM, copia cifrada, importación atómica y borrado total |
| IA | AI-06 | Capa de proveedor `nan`/`mock`, reintentos acotados, circuit breaker, cuota y presupuesto |
| IA | AI-01 | Proxy sin estado con segunda barrera de privacidad y sin registro de contenido |
| IA | AI-02 | Respuestas por bloques validados contra las fuentes y renderizador |
| Pruebas | OPS-04, OPS-04b | Playwright con cuatro proyectos, guardián de red y job de CI sobre la imagen oficial |
| Proceso | OPS-05 | Review gate exigible en CI: un PR con id de tarea sin informe no pasa |
| Contenido | CONTENT-01 | Guía de contribución de datos y plantillas de issue |
| Entorno | OPS-06 | Next 16.4.3, React 19.3, TypeScript 7, Vitest 5 y el resto al día |

## Verificación de conjunto

- `pnpm check`: estilo, tipos, tests de los cinco paquetes y validación de contenido.
- `pnpm build`: Next 16.4.3 en modo webpack.
- `pnpm e2e`: ocho pruebas en chromium, firefox, webkit y mobile-chrome sobre la build de producción.
- El guardián de red se prueba a sí mismo y hoy no hay ninguna petición a un origen ajeno.
- La clave de IA no aparece en código, fixtures, documentación ni bundle; el paquete falla al cargar en un contexto de navegador.

## Deuda registrada, sin ejecutar

En `docs/backlog.md`, tabla de refactores: `REF-OPS-01`, `REF-OPS-01b`, `REF-OPS-04`, `REF-OPS-04b`, `REF-OPS-06`, `REF-UI-01`, `REF-AI-01`, `REF-AI-06`, `REF-VAULT-02` y `REF-UI-02`. Ninguna bloquea la Ola 2.

## Riesgos que siguen abiertos

- **H-08 y el proveedor de IA.** NaN solo vale para desarrollo y beta con datos ficticios hasta que responda por escrito si su clave personal puede atender usuarios finales y qué retención aplica. AI-03 depende de esto para producción, no para construir.
- **Contenido verificado.** La Ola 1 no produce ninguna ficha real: el contenido de `content/` son tres plantillas ficticias. Sin H-07 (verificación humana) la app explica pero no informa de nada real.
- **Migración a Turbopack.** El proyecto corre en webpack porque necesita `extensionAlias` para los especificadores `.js` de los paquetes del workspace. `REF-OPS-06` tiene el plan de salida.
- **Días hábiles y calendario laboral.** El radar de la Ola 2 no puede calcular plazos exactos hasta tener el calendario por comunidad; el documento ya exige mostrarlos como orientativos.

## Estado de las tareas humanas de la Ola 0

Siguen abiertas, ninguna bloquea la Ola 2 salvo donde se indica: H-01 (nombre y marca), H-02 (revisión legal), H-03 (proveedor y cuotas), H-04 (licencia del contenido y moderación), H-05 (asociación de consumidores), H-06 (avisos: `.ics` en el MVP), H-07 (verificación de fichas, bloquea el lanzamiento), H-08 (condiciones de NaN, bloquea producción de la IA), H-09 (resuelto en la práctica: el entorno funciona), H-10 (hecho: `dev` y `main` protegidas) y D-01 (acento y tipografía, hoy con valores provisionales aislados en tokens).

## Protección de ramas

`dev` y `main` están protegidas desde el cierre: los cambios entran por pull request, con `check`, `e2e` y `review-report` como comprobaciones requeridas, sin force push ni borrado, y con `enforce_admins` activo. Se probó de la forma que importa: un push directo a `dev` con permisos de administrador fue rechazado con "Changes must be made through a pull request" y "3 of 3 required status checks are expected". Antes de activar `enforce_admins`, el mismo push pasaba, así que la protección sin esa opción era decorativa.

Consecuencia práctica: el orquestador ya no puede publicar directo en `dev`; todo pasa por rama, PR en borrador, informe de review y merge con los checks en verde.

## Siguiente paso

Ola 2, empezando por lo que no depende de contenido real ni de H-08: DOCS-01 (lectura local de PDF y OCR), RADAR-01 (cálculo de plazos), CARPETA-01 y AI-03 con el proveedor `mock`. El contenido (CONTENT-02 a CONTENT-04) se prepara en borrador y espera verificación humana.
