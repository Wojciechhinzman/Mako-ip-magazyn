"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Instalacja PWA jest dodatkiem; aplikacja działa także bez service workera.
      });
    }
  }, []);

  return null;
}
