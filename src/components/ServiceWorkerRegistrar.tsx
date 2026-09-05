"use client";

import { useEffect } from "react";

/**
 * Registers the service worker that makes the app installable and able to
 * receive push notifications. Registration is deliberately deferred until
 * after load so it never competes with the first paint.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((error) => console.warn("[sw] registration failed", error));
    };

    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
