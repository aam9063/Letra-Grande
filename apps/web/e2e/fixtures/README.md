# Fixtures sinteticas

Las fixtures de esta carpeta se generan, no se editan a mano. El generador
`generate.mjs` es la unica fuente de verdad: crea los documentos de prueba en
`apps/web/generated` con datos ficticios (empresa, persona e importes
inventados, nunca reales).

Comando: `pnpm fixtures` (desde `apps/web`).

El directorio `apps/web/generated` no se versiona a proposito: contiene
binarios regenerables y mantener el generador como unica fuente de verdad
evita copias desincronizadas. Ejecuta `pnpm fixtures` antes de un spec que
necesite una fixture. No se pudo excluir con una entrada de `.gitignore`
porque las superficies de edicion permitidas no incluyen ningun `.gitignore`
que cubra `apps/web/generated`.
