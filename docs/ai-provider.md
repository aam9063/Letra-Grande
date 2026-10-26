# Proveedor de IA: adaptador, errores y protecciones

El código de la app nunca habla con NaN ni con ningún proveedor concreto. Todo pasa por la
interfaz `LlmProvider` de `packages/ai` (sección 24.4 de `docs/ARRANQUE.md`), así que cambiar
de proveedor es escribir otro adaptador, no tocar el resto. Este paquete implementa la tarea
AI-06; el proxy HTTP que la usa es AI-01.

## Adaptadores

| Adaptador | Uso | Cómo se configura |
|---|---|---|
| `nan` | Desarrollo, staging y beta cerrada | Variables de entorno, ver tabla siguiente |
| `mock` | CI y e2e | Sin configuración; responde desde una tabla fija |

La factoría `createProviderFromEnv()` lee `AI_PROVIDER` (`nan` o `mock`, con `mock` por
defecto) y devuelve el adaptador correspondiente.

### Variables de entorno del adaptador `nan`

| Variable | Obligatoria | Significado |
|---|---|---|
| `NAN_API_KEY` | Sí | Clave del proveedor. Si falta, el adaptador falla al crearlo, con un mensaje claro y sin ningún valor por defecto |
| `AI_MODEL` | Sí | Modelo a usar, por ejemplo `glm5.3-flash` |
| `NAN_BASE_URL` | No | Base de la API. Por defecto `https://api.nan.builders/v1`, que es pública y está documentada |

Para pruebas se pueden inyectar el entorno, `fetch` y los parámetros de reintento, de modo
que ningún test abre una conexión real.

## Política de errores

`LlmError` clasifica cada fallo con un `kind` y marca si es reintentable:

| Error | Reintento | Motivo |
|---|---|---|
| 401, 402, 403, 404 | No | Son problemas de configuración o de cuota: otra llamada dará el mismo resultado. Reintentar solo retrasa el aviso |
| 429 y 5xx | Sí | Son fallos transitorios: sobrecarga o incidencia del proveedor |
| Petición abortada o tiempo de espera agotado | No | El usuario o el proxy ya han renunciado a esa respuesta; repetirla puede duplicar el coste |
| Fallo de red sin estado HTTP | No | Solo se reintenta lo previsto en la tabla de la sección 24.5 |
| `maxTokens` no válido | No | Se rechaza antes de hacer ninguna llamada |

Parámetros del reintento (valores por defecto de `DEFAULT_RETRY_OPTIONS`):

- `maxAttempts: 2`: la tabla 24.5 fija como máximo 2 intentos, es decir, la llamada original
  y una repetición.
- `baseDelayMs: 250`, `factor: 2`, `jitterRatio: 0.2`: espera exponencial con una variación
  aleatoria de hasta un 20% para no sincronizar los reintentos de varias peticiones.

Los mensajes de error nunca incluyen la clave ni el cuerpo de la petición o de la respuesta:
solo el estado HTTP y una descripción corta.

## Circuit breaker, cuota y presupuesto

- `CircuitBreaker`: abre el circuito tras el número de fallos consecutivos configurado
  (`failureThreshold`), corta las llamadas lanzando un error con `kind: "circuitOpen"` y pasa
  a semiabierto al agotarse el enfriamiento (`cooldownMs`). Si la prueba funciona, cierra;
  si falla, vuelve a abrir. Su estado (`closed`, `open`, `halfOpen`) es una propiedad pública,
  y el reloj se inyecta para probarlo sin esperas reales.
- `TokenBucketQuota`: cubo de fichas por usuario anónimo (el identificador lo genera el
  proxy, nunca una cabecera enviada por el cliente). Tiene capacidad máxima, relleno
  progresivo y reloj inyectable.
- `DailyBudget`: presupuesto diario de tokens con corte automático al llegar al límite. El
  día cambia a medianoche UTC. El consumo real por día y modelo se consulta con
  `GET /v1/usage`; esa lectura aún no está implementada y corresponde al proxy (AI-01).

## El navegador nunca ve la clave

- `NAN_API_KEY` solo se lee en el servidor, desde variables de entorno. Nunca en código, en
  variables `NEXT_PUBLIC_*`, en fixtures, en logs ni en la documentación.
- El paquete `@letra-grande/ai` no tiene ninguna dependencia del navegador y no se importa
  desde el cliente.
- Si la clave se perde, se genera otra en el panel del proveedor y se elimina la anterior.
  Al mostrarse solo una vez, se guarda en el gestor de contraseñas y en los secretos de CI y
  del hosting.

## Pendiente con NaN (H-08)

Antes de usar NaN en producción hay que confirmar con el proveedor, por escrito:

1. Si las condiciones del plan permiten atender a usuarios finales con una clave personal.
2. Si los límites por clave aguantan el tráfico previsto.
3. Su política de retención y uso de los datos de las peticiones, crítica para este proyecto.
4. Estabilidad y soporte en caso de incidencia.
5. Si soporta salida estructurada (esquema JSON o herramientas) en cada modelo.

Mientras no haya respuesta, NaN solo para desarrollo, staging y beta cerrada con datos
ficticios. Si H-08 sale mal, se escribe otro adaptador de `LlmProvider` y nada más cambia.

## Verificación

```bash
pnpm --filter @letra-grande/ai test
pnpm check
```

Los tests usan un `fetch` simulado y relojes inyectados: no hay red real en la suite.
