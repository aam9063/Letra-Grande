# Letra Grande

Herramienta abierta para entender las facturas, los contratos y las cartas oficiales, y para reclamar o darse de baja. Los documentos y los datos personales se quedan en tu dispositivo.

**Estado: experimental.** Estamos construyendo el esqueleto del proyecto. Todavía no hay contenido verificado ni una app usable.

## Qué problema resuelve

Casi todo papel que recibes genera una fecha y una acción: una factura que no entiendes, un contrato de alquiler que no sabes leer, una multa con un plazo que se pasa. Letra Grande reúne en una sola línea de tiempo lo que vence, explica cada documento y te dice a quién reclamar.

## Cómo funciona

- **Tus datos no salen del dispositivo.** La carpeta se cifra en el navegador (AES-256-GCM sobre IndexedDB) y la extracción de documentos ocurre en local.
- **Ninguna afirmación sin fuente.** El conocimiento vive en archivos YAML versionados, con fuente, fecha de verificación y caducidad visible.
- **La IA no escribe marcado.** Responde con bloques de un catálogo cerrado y cada bloque cita la fuente. Si una cifra no aparece en la fuente, se descarta.
- **Todo texto que va a la IA se enmascara antes** en el navegador, y el servidor lo vuelve a comprobar.

## Aviso de independencia

> Letra Grande es un proyecto independiente, sin vinculación con ninguna empresa ni con la Administración. Ofrece información orientativa elaborada a partir de fuentes públicas, que puede estar incompleta o desactualizada. No constituye asesoramiento jurídico. Comprueba siempre la fuente enlazada y, ante dudas, consulta con un profesional o con un organismo de consumo.

## Cómo arrancar

Requiere Node 22 o superior y pnpm.

```
pnpm install
pnpm dev
```

Comprobaciones antes de abrir un cambio:

```
pnpm check
pnpm e2e
```

`pnpm check` ejecuta el estilo, los tipos, los tests de unidad y la validación del contenido.

## Cómo se trabaja aquí

Las instrucciones para personas y para agentes están en [`AGENTS.md`](AGENTS.md). El diseño completo, el backlog y las decisiones abiertas están en [`docs/ARRANQUE.md`](docs/ARRANQUE.md) y el estado de las tareas en [`docs/backlog.md`](docs/backlog.md).

## Licencia

El código se publica con licencia MIT. La licencia del contenido está pendiente de decisión (propuesta: CC BY 4.0).
