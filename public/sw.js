/* VIP Drivers service worker.
 *
 * Deliberately minimal: it exists to make the app installable and to receive
 * push notifications. It does NOT cache API responses or pages, because a
 * chauffeur looking at the available-rides board must never be shown a stale
 * one — a ride another driver has already taken.
 */

const SHELL_CACHE = "vip-shell-v1";
const SHELL_ASSETS = ["/offline.html", "/icons/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== SHELL_CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

/* Network-only, with an offline page for navigations that fail. */
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || request.mode !== "navigate") return;

  event.respondWith(
    fetch(request).catch(() =>
      caches.match("/offline.html").then((cached) => cached ?? Response.error()),
    ),
  );
});

self.addEventListener("push", (event) => {
  let payload = { title: "VIP Drivers", body: "", url: "/" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    if (event.data) payload.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/badge.png",
      data: { url: payload.url },
      tag: payload.tag || undefined,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Focus an existing tab on the same origin rather than opening a
      // second one, which is what a native app would do.
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(target).catch(() => {});
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
