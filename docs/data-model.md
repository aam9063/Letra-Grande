# Modelo de datos

Todo lo que Letra Grande guarda, publica o responde tiene forma declarada en `packages/schema` y se valida con zod. Este documento describe los modelos reales, las reglas que los acompañan y los formatos binarios del vault. El diseño original está en [`ARRANQUE.md`](ARRANQUE.md), secciones 8 y 10.

## 1. Principio: contenido como código

El conocimiento no vive en una base de datos ni en el prompt de un modelo: vive en archivos YAML versionados, uno por ficha, dentro de `content/`.

```
content/
├── companies/     una ficha por empresa
├── authorities/   una ficha por organismo
└── procedures/    una ficha por trámite
```

Reglas que impone el validador de CI, no la buena voluntad:

- El archivo se llama `<id>.yaml` (o `<id>.yml`), y el nombre debe coincidir con el `id`. Las plantillas que empiezan por `_` quedan exentas.
- El `id` es único dentro de su carpeta.
- Cada `sourceId` citado existe en la lista `sources` de esa misma ficha, y los ids de fuente no se repiten.
- Una ficha `verified: true` exige `verifiedOn`, `verifiedBy` y al menos una fuente de tipo `oficial` o `empresa`. Una fuente `tercero` nunca basta.
- Cada `escalation` de una empresa apunta a un `id` que existe en `authorities`.
- Pasados 180 días desde `verifiedOn`, la CI **avisa** pero no falla: la caducidad es información para la persona, no un bloqueo.

## 2. Tipos comunes

| Tipo | Reglas |
|---|---|
| `slug` | Minúsculas, dígitos y guiones: `mi-empresa`, `oficina-consumo-valencia`. |
| `isoDate` | `AAAA-MM-DD` y fecha real. |
| `Sector` | `energia`, `telefonia`, `banca`, `seguros`, `transporte`, `suscripciones`, `vivienda`, `otros`. |
| `Source` | `id`, `title`, `url` absoluta, `kind` (`oficial`, `empresa`, `tercero`), `retrievedOn`. |
| `Verification` | `verified`, `verifiedOn?`, `verifiedBy?`, `note?`. |

## 3. `Company`: ficha de empresa

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `slug` | Debe coincidir con el nombre del archivo. |
| `name` | texto | |
| `sector` | `Sector` | |
| `group` | texto opcional | Grupo empresarial, cuando la fuente lo dice. |
| `channels.atencionCliente` | `Channel[]` | |
| `channels.reclamacion` | `Channel[]` | |
| `channels.baja` | `Channel[]` | |
| `escalation` | `slug[]` | Ids de `authorities`, en orden de escalado. |
| `permanencia` | `{ text, sourceId }` opcional | |
| `bajaNotes` | texto opcional | |
| `sources` | `Source[]`, mínimo uno | |
| `verification` | `Verification` | |

`Channel` es `{ kind, value, notes?, sourceId }`, con `kind` en `web`, `telefono`, `email`, `app`, `oficina`, `burofax` o `postal`. Todo canal cita su fuente: un teléfono de atención sin fuente no entra.

## 4. `Authority`: organismo al que escalar

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `slug` | |
| `name` | texto | |
| `scope` | `estatal`, `autonomico`, `local` | |
| `region` | texto opcional | **Obligatorio** si el ámbito no es estatal: el consumo es competencia autonómica y local. |
| `sectors` | `Sector[]` | |
| `url` | URL | |
| `howToFile` | texto | Cómo se presenta la reclamación, tal como lo explica la fuente. |
| `sources`, `verification` | | |

## 5. `Procedure`: trámite

| Campo | Tipo | Notas |
|---|---|---|
| `id`, `title` | | |
| `audience` | `consumidor`, `inquilino`, `autonomo`, `familia`, `extranjero`, `general` | |
| `sector`, `region` | opcionales | |
| `summary` | texto | |
| `steps` | `{ n, text, sourceId }[]`, mínimo uno | Numeración correlativa 1, 2, 3; un salto falla. |
| `documents` | `{ text, sourceId }[]` | |
| `cost` | `{ text, amountEur?, sourceId }` opcional | |
| `deadlines` | `Deadline[]` | |
| `warnings` | `{ text, sourceId }[]` | |
| `legalBasis` | `{ name, url }[]` | |
| `sources`, `verification` | | |

`Deadline` es `{ id, label, kind, amount, unit, from, sourceId }`, con `kind` en `plazo_legal`, `permanencia`, `caducidad`, `renovacion` u `otro`, y `unit` en `dias_naturales`, `dias_habiles`, `meses` o `anios`. `from` describe el evento que hace correr el plazo, con las palabras de la fuente: "recepción de la notificación".

Los días hábiles dependen del calendario laboral por comunidad y localidad. Hasta que exista ese calendario, los plazos en días hábiles se calculan como aproximación y la interfaz los muestra como orientativos.

## 6. Bloques de respuesta del asistente

El modelo nunca escribe marcado: elige un `kind` del catálogo cerrado y rellena campos. La interfaz decide cómo se pinta cada uno.

| `kind` | Contenido además de `claim` y `citations` |
|---|---|
| `step` | `n`: número de paso, correlativo desde 1. |
| `document` | nada. |
| `cost` | nada. |
| `deadline` | `deadlineId?` para enlazar con un plazo de la ficha. |
| `warning` | nada. Máximo un bloque de aviso por respuesta. |
| `fact` | nada. |

`AssistantAnswer` es `{ question, outOfScope, blocks }` con estas reglas: toda afirmación lleva al menos una cita; una respuesta dentro de alcance necesita al menos un bloque; como máximo un `warning`; los pasos se numeran 1, 2, 3; y como máximo doce bloques por respuesta.

`validateAnswerAgainstSources(answer, sourceTexts)` devuelve una lista de incidencias:

- `unknown_source`: la cita apunta a un `sourceId` que no está entre las fuentes recuperadas.
- `unsupported_figure`: la afirmación contiene una cifra que no aparece en el texto de las fuentes que cita.

La comparación de cifras normaliza separadores de miles y comas decimales, y compara **cifra normalizada contra cifra normalizada**, no subcadenas: `30` no valida contra `300`, `500` no valida contra `1.500`, y `1.500` sí valida contra una fuente que dice `1500`. El número de orden de un paso no es una cifra de la afirmación: va en su propio campo.

## 7. Registros del vault

Viven solo en el dispositivo, cifrados. La forma la define `packages/schema` y el almacenamiento `packages/vault`.

**`Profile`**: `id`, `label` (el alias que ve la persona), `knownTerms[]` con `{ kind: nombre | direccion | otro, value }`, `region?` y `plainLanguage` (lectura fácil). Los `knownTerms` son la única forma de ocultar nombres y direcciones: no se detectan por patrón, así que si no están en el perfil, no se enmascaran. La interfaz debe decirlo.

**`VaultDocument`**: `id`, `profileId`, `kind` (`factura`, `contrato`, `carta_oficial`, `multa`, `ticket`, `poliza`, `otro`), `title`, `addedAt`, `fields` (campos extraídos, solo tipos primitivos), `tags[]` y `blobId?` con el original cifrado.

**`RadarItem`**: `id`, `profileId`, `title`, `dueDate` (`AAAA-MM-DD`), `origin` (`documento`, `procedimiento`, `manual`), `documentId?`, `procedureId?`, `deadlineId?`, `severity` (`info`, `aviso`, `urgente`), `status` (`pendiente`, `hecho`, `descartado`) y `createdAt`.

## 8. Formato de almacenamiento cifrado

**Metadatos (`meta`)**: `{ kdf: { algorithm, iterations, salt }, verifier, epoch }`.

- `algorithm` es `PBKDF2-HMAC-SHA256`, con 600 000 iteraciones por defecto y sal de 16 bytes por vault.
- `verifier` es un texto conocido cifrado con la clave: sirve para distinguir una contraseña incorrecta de metadatos corruptos sin escribir nada.
- `epoch` se incrementa en cada importación y en cada purga. Una sesión abierta con una época anterior no puede operar: así una sesión vieja no escribe con la clave vieja tras reemplazar el contenido.

**Registro cifrado**: `{ version, iv, data }`, con `version` 2, `iv` de 12 bytes aleatorios por registro y `data` el texto cifrado con AES-256-GCM. El **id del registro es el `additionalData`**: si alguien intercambia dos registros almacenados, el descifrado falla en lugar de devolver datos con el id equivocado. La versión se lee al descifrar y una versión desconocida se rechaza con su propio error.

**Copia de seguridad**: un único artefacto binario con esta cabecera en claro, solo técnica:

| Campo | Tamaño | Contenido |
|---|---|---|
| `magic` | 4 bytes | `LGVX` |
| `formatVersion` | 4 bytes, entero sin signo, big endian | Versión del formato de copia. |
| `longitudAlgoritmo` | 2 bytes, entero sin signo | Longitud del identificador que sigue. |
| `algoritmo` | `longitudAlgoritmo` bytes, UTF-8 | Texto `PBKDF2-HMAC-SHA256`. No es un código de dos bytes: es una cadena con su longitud delante. |
| `iterations` | 4 bytes, entero sin signo | Iteraciones de la copia, con tope de 10 000 000 al importar. |
| `salt` | 16 bytes | Sal nueva de la copia. |
| `iv` | 12 bytes | IV del cifrado de la copia. |
| `payload` | resto | AES-256-GCM del JSON con las cinco colecciones, autenticando toda la cabecera como `additionalData`. |

Importar rechaza un almacén con datos salvo `replace: true`, valida y descifra todo antes de escribir y hace una única transacción: si algo falla, el almacén anterior queda intacto.

## 9. Versionado y migraciones

Tres versiones distintas, cada una con su dueño:

- **Formato de registro** (`version` en cada registro cifrado): se lee al descifrar. Una versión desconocida falla con `VaultRecordVersionError`, nunca se interpreta a ciegas.
- **Parámetros de derivación** (`kdf` en `meta`): se validan **antes** de derivar, para que un vault futuro diga "parámetros no compatibles" y no "contraseña incorrecta".
- **Formato de copia** (`formatVersion` en la cabecera): se comprueba antes de descifrar.

Un cambio de esquema en `packages/schema` va en un PR propio, porque es el contrato que consumen todos los carriles.

## 10. Pendiente en este documento

`packages/radar` todavía no existe. Cuando se implemente (RADAR-01), aquí se documentarán el cálculo de plazos por unidad, el tratamiento de los días hábiles como aproximación y el formato de exportación `.ics`.
