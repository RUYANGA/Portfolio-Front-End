"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { trackTime, trackView } from "@/lib/analytics";

/** Records each page view on the public site and the time it was actually on screen. */
export default function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;

    let id: number | null = null;
    let active = 0;
    let since: number | null = document.visibilityState === "visible" ? Date.now() : null;
    trackView(pathname).then((value) => (id = value));

    const pause = () => {
      if (since !== null) active += Date.now() - since;
      since = null;
    };
    const report = () => {
      pause();
      if (id !== null && active >= 1000) trackTime(id, Math.round(active / 1000));
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") report(); // the last reliable moment on phones
      else since = Date.now();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", report);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", report);
      report(); // moving to another page
    };
  }, [pathname]);

  return null;
}
