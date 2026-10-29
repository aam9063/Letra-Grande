# Contribuir a Letra Grande

Gracias por querer ayudar. Letra Grande es una PWA abierta (MIT) que ayuda a entender facturas, contratos y cartas oficiales, y a reclamar o darse de baja. Los datos personales se quedan en el dispositivo.

Hay dos formas de contribuir: **datos** (fichas de empresas, organismos y trámites) y **código**. En los dos casos valen las mismas reglas de fondo: nada de datos inventados, todo con fuente, y nunca asesoramiento jurídico.

## 1. Contribuir datos

### 1.1 Elige por dónde empezar

- **Un dato está mal** (un teléfono, un plazo, una URL): abre un issue con la plantilla "Dato incorrecto".
- **Falta una empresa u organismo**: abre un issue con la plantilla "Propuesta de ficha".
- **Quieres verificar una ficha** (dejarla `verified: true`): sigue el checklist de abajo y abre un PR.

Las plantillas de issue están en `.github/ISSUE_TEMPLATE/`. No pongas datos personales reales en el issue, ni los tuyos ni los de nadie. Usa URLs de ejemplo como `example.com` y nombres claramente ficticios.

### 1.2 Checklist de verificación de una ficha

Tiempo estimado: 10 a 15 minutos por ficha. Este es el trabajo que no se comprime con agentes: pueden preparar borradores y buscar fuentes, pero la verificación final la hace una persona.

Para los pasos 5 y 6 necesitas un poco de preparación, aunque no programas:

1. Clona el repositorio.
2. Instala Node 22 o posterior y pnpm.
3. Ejecuta `pnpm install` en la raíz. Después ya puedes lanzar `pnpm check` y `pnpm content:validate`.

Cómo abrir el pull request del paso 6 se explica paso a paso en la sección 2, Contribuir código.

1. Abre la fuente **oficial o de la propia empresa** en su versión actual. Guarda la URL.
2. Comprueba cada dato (canal, teléfono, plazo, importe) contra esa fuente. Nunca contra un foro o un comparador.
3. Rellena `sources` con título, URL, tipo y fecha de consulta.
4. Anota `verifiedBy` y `verifiedOn`. Si tienes dudas, deja `verified: false` y escribe la duda en `note`.
5. Pasa `pnpm check`.
6. En el PR, enlaza la fuente y, si puedes, una captura con fecha.

### 1.2.1 Qué cuenta como verificada

Una ficha pasa a `verified: true` cuando **una persona** ha mirado la fuente oficial o de la propia empresa y ha comprobado cada dato que la ficha afirma: canales, teléfonos, plazos, importes y requisitos. Eso es lo que significa el campo, y no hay otra forma de conseguirlo.

- **Quién firma.** `verifiedBy` lleva el nombre o el identificador de la persona que verificó, no el de un agente ni el de una herramienta. Un borrador preparado por un agente puede ser correcto y aun así no está verificado.
- **Con qué evidencia.** El PR que marca `verified: true` enlaza la fuente exacta que se consultó, no la portada del organismo, y lleva la fecha de consulta en `verifiedOn`. Una captura con fecha ayuda y se agradece, pero lo que cuenta es el enlace.
- **Hasta cuándo vale.** Pasados 180 días desde `verifiedOn`, el validador avisa y la ficha conviene revisarse. El aviso no cambia `verified` solo: alguien tiene que volver a comprobarlo.
- **Qué se rechaza sin discusión.** Marcar `verified: true` con una fuente de tipo `tercero`; verificar contra un foro, un comparador o una nota de prensa; rellenar un dato que no aparece en la fuente, aunque parezca obvio; y firmar con el nombre de otra persona.

El validador de la sección siguiente comprueba que la estructura acompaña a la verificación: que hay fuente oficial, que las fechas están y que los identificadores resuelven. **No comprueba que el dato sea cierto**: eso solo lo hace la persona que firma.

### 1.3 Lo que comprueba el validador de contenido

Antes de abrir el PR, ejecuta `pnpm check` en la raíz. Dentro corre `pnpm content:validate`, que revisa todo `content/`. Estas son las reglas que aplica:

- Cada ficha es YAML válido y cumple el esquema de su colección (`companies`, `authorities`, `procedures`).
- `verified: true` exige `verifiedOn`, `verifiedBy` y al menos una fuente de tipo `oficial` o `empresa`. Una fuente de tipo `tercero` no basta para verificar.
- Cada `sourceId` (canales, pasos, documentos, plazos, avisos `warnings`, `cost` y `permanencia`) apunta a una fuente de la misma ficha. Los ids de fuente no se repiten dentro de una ficha.
- Los pasos de un trámite van numerados 1, 2, 3... sin saltos ni repeticiones.
- Un organismo con ámbito `autonomico` o `local` necesita su campo `region`.
- El archivo se llama `<id>.yaml` igual que el `id` de la ficha. Las plantillas, que empiezan por `_`, quedan fuera de esta regla.
- Los ids no se repiten dentro de la misma carpeta.
- Cada id de `escalation` existe como organismo en `content/authorities`.
- Si `verifiedOn` tiene más de 180 días, el validador avisa de que la ficha conviene revisarla. Es un aviso, no un error.

Si el validador falla, corrige lo que señala y vuelve a ejecutarlo. No desactives ni esquives el validador.

### 1.4 Reglas que nunca se rompen con los datos

- No inventes datos: ni teléfonos, URLs, plazos, importes, nombres de organismos ni artículos de ley. Si no puedes comprobarlo contra una fuente oficial o de la propia empresa, déjalo vacío y `verified: false`.
- Una ficha solo es `verified: true` si lo ha verificado una persona. Los agentes pueden preparar borradores, nunca marcar la verificación.
- Toda ficha lleva fuentes con URL y fecha de consulta.
- Sin datos personales reales en fichas, issues, tests, fixtures ni documentación.
- El Observatorio solo publica datos oficiales con fuente, fecha y método. Sin opiniones ni valoraciones sobre empresas.

### 1.5 Quién aprueba

`.github/CODEOWNERS` dice qué persona responde de cada parte del repositorio: las fichas por sector (empresas, organismos, trámites), cada paquete, cada aplicación y la infraestructura. Cuando llega un PR que toca una de esas rutas, GitHub avisa a su propietario.

Hoy hay una sola persona propietaria, y esa persona es también quien abre los PRs. Por eso la revisión obligatoria de code owners **no está activada** en las ramas: GitHub no permite aprobar tu propio PR, así que con un único propietario el requisito no se puede cumplir de la forma prevista. La única salida sería el bypass de administrador, si la regla de rama lo permite, y saltarse el requisito no es cumplirlo. Mientras tanto el fichero sirve de aviso y de mapa de responsabilidades.

Dos detalles antes de contar con este fichero: GitHub usa el `CODEOWNERS` de la **rama base** del PR, así que no avisa de nada hasta que esté fusionado en `dev`; y el autor de un PR no puede aprobarlo, así que el aviso y la aprobación solo aparecen cuando el PR lo abre otra persona.

Cuando haya un segundo propietario, se activa en `Settings` → `Branches` → regla de `dev` y de `main` → marcar **Require review from Code Owners**. A partir de ahí, un PR que toque fichas de un sector no se fusiona sin la aprobación de quien responde de ese sector. El reparto definitivo de sectores entre personas es una tarea abierta del backlog (H-04).

## 2. Contribuir código

1. Coge UNA tarea de `docs/backlog.md` por su id (por ejemplo `UI-02`) y trabaja solo en ella.
2. Crea su documento de funcionalidad en `odd/tasks/<id>-<slug>.md` con la plantilla de `docs/ARRANQUE.md` (sección 21.3) antes de escribir código: alcance, superficie de edición, runner de tests y riesgo.
3. Crea la rama `lg/<id>-descripcion-corta`. Un PR por tarea, con el id en el título.
4. Respeta el carril de tu tarea (prefijo del id) y su superficie de edición. No edites ficheros de otro carril sin avisar.
5. Trabaja con TDD: primero el test en rojo, después lo mínimo para ponerlo en verde y luego refactor. La lógica se prueba con `vitest`; los flujos de interfaz, con specs de Playwright en `apps/web/e2e`.
6. `packages/schema` es el contrato común. Cualquier cambio en él va en un PR aparte.
7. Antes de abrir el PR: `pnpm check` y `pnpm e2e` en verde.
8. Pasa el review gate (sección 22 de `docs/ARRANQUE.md`): un revisor de contexto limpio, solo lectura, con como máximo una ronda de correcciones. Los refactores opcionales se registran como `REF-<id>` en el backlog, no se ejecutan.
9. Actualiza `docs/backlog.md` y la documentación afectada en el mismo PR.
10. Haz commit en tu rama y abre el PR. **No hagas merge a `main`**: la entrega la decide una persona, y de `dev` a `main` se fusiona con commit de fusión, nunca con squash (el job `check` lo comprueba, ver `docs/review-gate.md`).

## 3. Lo que nunca se hace

- Inventar datos o fuentes, aunque parezcan evidentes.
- Marcar una ficha como `verified: true` sin una persona que la haya verificado contra la fuente.
- Poner datos personales reales en un issue, un PR, un test o la documentación. Ni los tuyos ni los de terceros.
- Prometer asesoramiento jurídico o resultados ("te devolverán el dinero", "tienes derecho a"). Letra Grande informa, orienta y deriva a organismos o profesionales. Usa "puede corresponderte" y enlaza la fuente.
- Prometer verificación automática: el validador comprueba estructura y coherencia, la verificación la hace una persona.
- Subir texto sin enmascarar al proveedor de IA o añadir llamadas de red nuevas sin aceptación previa.

## 4. Aviso

Letra Grande no da asesoramiento jurídico individualizado. Explica, orienta y deriva. Los riesgos legales y de reputación del proyecto están listados en la sección 15 de `docs/ARRANQUE.md`.
