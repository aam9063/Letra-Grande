/*
 * Service worker de Letra Grande.
 *
 * Estrategia de caché (documentada y versionada):
 * - Precache solo del shell de la aplicación: la portada, el manifiesto y los
 *   iconos. Con eso la app arranca sin conexión y enseña su estado pendiente.
 * - Nunca se cachean datos de usuario: la carpeta, los documentos y las
 *   respuestas del asistente viven solo en el dispositivo, no en la caché HTTP.
 * - Fuera del precache no se escribe nada en ninguna caché: el handler de
 *   fetch solo sirve lo precacheado y devuelve red en todos los demás casos.
 * - Para invalidar la caché antigua se cambia CACHE_VERSION: en activate se
 *   borra cualquier caché con otro nombre.
 */
const CACHE_VERSION = "lg-shell-v1";
const PRECACHE = ["/", "/manifest.webmanifest", "/icon.svg", "/icon-maskable.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((claves) =>
        Promise.all(claves.filter((clave) => clave !== CACHE_VERSION).map((clave) => caches.delete(clave))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Solo mismo origen y solo GET: ni peticiones con cuerpo ni datos de usuario.
  if (event.request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  // Cache-first solo para lo precacheado; el resto, siempre red.
  if (!PRECACHE.includes(url.pathname)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((respuesta) => respuesta ?? fetch(event.request)),
  );
});
