"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js in production builds only: in `next dev` a cache-first worker would serve stale
 * chunks and fight Fast Refresh.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // Registration fails on plain-HTTP origins other than localhost; the site works the same without it.
    });
  }, []);
  return null;
}
