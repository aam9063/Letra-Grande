# Review gate OPS-07: orden del backlog y robustez del spec de carpeta

---
tarea: OPS-07
base: 8ee9be2
revisado: fbfdde2
revisor: jd-judge-b (contexto limpio, solo lectura, spec ejecutado)
veredicto: aprobado con cambios
---

## Resumen

El defecto y el arreglo son reales y están bien diagnosticados. `useSesionCarpeta` arranca en `"no-creada"`, y en el montaje el hook, el efecto de vista inicial y el efecto que reacciona al estado coincidían en la misma pasada: el tercero veía la clausura con `"no-creada"` y su `setVista("crear")` pisaba el `"desbloquear"` recién fijado, así que se pintaba un fotograma con el formulario de crear. Con la guarda de montaje ese efecto no actúa antes de arrancar. Se revisaron las cuatro transiciones una a una y siguen funcionando: crear a desbloquear tras un fallo, desbloquear a crear cuando no hay carpeta, abrir sesión, y bloqueo manual o por inactividad. El spec gana dos cosas correctas: etiqueta exacta, que elimina la ambigüedad real con "Repite la contraseña", y espera del encabezado de desbloqueo, que quita la carrera sin ocultar una regresión, porque si el formulario no apareciera nunca la espera agotaría el tiempo. El backlog se contrastó con el historial: todo lo que figura como hecho está fusionado y lo que figura como pendiente no tiene commit. Tocar el componente del carril de interfaz está avisado en la tarea y en el PR. `pnpm check` en verde, sin dependencias nuevas, sin secretos.

## Hallazgos

### 1. [recomendado] docs/backlog.md:178

Problema: el refactor del `<img>` duplicado se atribuía a la review de UI-09, que dice literalmente que no encontró olores de código, y además los atributos no son iguales (44 y 36). La duplicación existe, pero el hallazgo es de esta review.
Propuesta: reatribuirlo. Aplicado: la fila pasa a `REF-OPS-07a` y nombra los dos tamaños.

### 2. [recomendado] apps/web/src/components/carpeta/VistaCarpeta.tsx:29

Problema: el fotograma arreglado queda sin red de seguridad. El spec ahora espera el encabezado, así que no detectaría una reintroducción del parpadeo, y el test unitario pasa igual antes y después porque `act` absorbe el fotograma.
Propuesta: dejar la vista imposible de desincronizar, con un unitario que lo fije. Aceptado como refactor: registrado `REF-OPS-07`, sin ejecutarlo ahora.

### 3. [refactor] apps/web/src/components/carpeta/VistaCarpeta.tsx:26-40

Problema: dos fuentes de verdad (la vista y el estado) y el arreglo añade una tercera señal (`montado`). El propio revisor propone derivar la vista del estado, con un estado auxiliar solo para la navegación manual.
Propuesta: registrarlo. Aplicado como parte de `REF-OPS-07`: el arreglo actual es correcto y mínimo, y el refactor no debe entrar en una ronda de correcciones.

### 4. [nota] docs/backlog.md:11 y 15

Problema: H-09 figuraba como hecho en el estado actual pero su fila de detalle no lo decía, y faltaba OPS-05d en "Proceso y entrega".
Propuesta: corregirlo. Aplicado: H-09 queda marcado con la explicación de que es verificación humana sin commit, y OPS-05d entra en el bloque de proceso junto con H-10.

## Code smells

El de las dos fuentes de verdad, registrado como refactor. Ninguno más.

## Secretos

Ninguno.

## Qué se aplicó en la ronda de correcciones

Los hallazgos 1 y 4, y el registro de `REF-OPS-07` para los hallazgos 2 y 3.
