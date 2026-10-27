# Pruebas de extremo a extremo

Playwright sobre la build de producción (el service worker no se comporta igual en desarrollo). Cuatro proyectos: Chromium, Firefox, WebKit y un móvil.

## Auditoría de privacidad (`privacidad-red.spec.ts`)

La promesa del proyecto es que ningún dato personal sale del dispositivo. Esta auditoría la comprueba en la app real, no en la teoría:

- Recorre las rutas principales (`/`, `/hoy`, `/ajustes`, `/carpeta`, `/onboarding`) con el guardián puesto.
- Falla si aparece una petición a un origen que no sea el nuestro, o un cuerpo con datos personales sin enmascarar.
- Exige haber visto peticiones: un guardián que no ve nada daría verde siempre.

El guardián vive en `helpers/network-guard.ts` y escucha a nivel de **contexto**, no de página, así que también ve lo que piden otras pestañas y el service worker. Los datos personales los detecta `detect()` de `@letra-grande/privacy`, la misma implementación que enmascara: no hay una segunda lista de patrones que pueda desviarse.

## Añadir un origen permitido

`allowed-origins.json` está vacío a propósito. Si algún día hace falta hablar con un servicio de terceros, se añade ahí su origen exacto, y el PR tiene que justificarlo: es la lista que la auditoría vigila, y una excepción silenciosa equivale a dejar de auditar. Nunca se añade un origen con comodín (`https://*.ejemplo.test`) ni un `http://` en producción.

## Ejecutar solo la auditoría

```bash
pnpm --filter @letra-grande/web exec playwright test privacidad-red
```
