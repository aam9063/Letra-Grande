/*
 * Service worker de Letra Grande.
 *
 * Estrategia de caché (documentada y versionada):
 * - Precache del shell: la portada, el manifiesto y los iconos. Con eso la app
 *   arranca sin conexión y enseña su estado pendiente.
 * - Las navegaciones son network-first con caché de respaldo: el HTML de la
 *   portada cambia en cada despliegue y, si se sirviera cache-first sin subir
 *   CACHE_VERSION, referencearía chunks que ya no existen. Primero red; si
 *   no hay conexión, se cae a la caché para que el offline siga funcionando.
 * - Cache-first solo para el manifiesto y los iconos: son inmutables entre
 *   versiones porque cada cambio lleva su CACHE_VERSION nueva.
 * - Nunca se cachean datos de usuario: la carpeta, los documentos y las
 *   respuestas del asistente viven solo en el dispositivo, no en la caché HTTP.
 * - Fuera del precache no se escribe nada en ninguna caché: el handler de
 *   fetch solo sirve lo precacheado y devuelve red en todos los demás casos.
 * - Para invalidar la caché antigua se cambia CACHE_VERSION: en activate se
 *   borra cualquier caché con otro nombre.
 */
const CACHE_VERSION = "lg-shell-v1";
const PRECACHE = ["/", "/manifest.webmanifest", "/icon.svg", "/icon-maskable.svg"];
const CACHE_FIRST = ["/manifest.webmanifest", "/icon.svg", "/icon-maskable.svg"];

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

  // Navegaciones: network-first con respaldo en caché (ver comentario arriba).
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match("/").then((respuesta) => respuesta ?? Response.error()),
      ),
    );
    return;
  }

  // Cache-first solo para lo inmutable entre versiones: manifiesto e iconos.
  if (!CACHE_FIRST.includes(url.pathname)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((respuesta) => respuesta ?? fetch(event.request)),
  );
});
