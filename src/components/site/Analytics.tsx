"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { track, trackTime, trackView } from "@/lib/analytics";

/** The site's own API (résumé PDF, images): links there aren't visitors leaving the site. */
const API_HOST = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL || "").host;
  } catch {
    return "";
  }
})();

/** Home-page sections whose reach is measured (their element ids). */
const SECTIONS = ["about", "experience", "projects", "labs", "skills", "contact"];

/** How far down the page the visitor has seen, in % (100 when the page fits the screen). */
function scrolledPercent() {
  const doc = document.documentElement;
  const max = doc.scrollHeight;
  return max ? Math.min(100, Math.round(((window.scrollY + window.innerHeight) / max) * 100)) : 100;
}

/**
 * Records each page view on the public site with the time it was actually on screen and how far
 * down it was read, which home-page sections were reached, and clicks on links that leave the site.
 */
export default function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;

    let id: number | null = null;
    let active = 0;
    let since: number | null = document.visibilityState === "visible" ? Date.now() : null;
    let deepest = scrolledPercent();
    trackView(pathname).then((value) => (id = value));

    const pause = () => {
      if (since !== null) active += Date.now() - since;
      since = null;
    };
    const report = () => {
      pause();
      if (id !== null && (active >= 1000 || deepest > 0)) trackTime(id, Math.round(active / 1000), deepest);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") report(); // the last reliable moment on phones
      else since = Date.now();
    };
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => (deepest = Math.max(deepest, scrolledPercent())));
    };

    // Sections: each counts once per page view, when a good part of it is on screen.
    const seen = new Set<string>();
    const observer =
      "IntersectionObserver" in window
        ? new IntersectionObserver(
            (entries) => {
              for (const entry of entries) {
                const section = entry.target.id;
                if (entry.isIntersecting && !seen.has(section)) {
                  seen.add(section);
                  track("section", section);
                  observer?.unobserve(entry.target);
                }
              }
            },
            { threshold: 0.25 },
          )
        : null;
    if (pathname === "/") {
      SECTIONS.forEach((section) => {
        const element = document.getElementById(section);
        if (element) observer?.observe(element);
      });
    }

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", report);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", report);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
      observer?.disconnect();
      report(); // moving to another page
    };
  }, [pathname]);

  // Clicks on links that leave the site: GitHub, LinkedIn, live demos, email, phone.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (window.location.pathname.startsWith("/admin")) return;
      const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.hasAttribute("download")) return; // downloads are tracked where they happen
      const href = link.getAttribute("href") || "";
      if (href.startsWith("mailto:")) return track("outbound", "email");
      if (href.startsWith("tel:")) return track("outbound", "phone");
      try {
        const url = new URL(link.href);
        if (/^https?:$/.test(url.protocol) && url.host !== window.location.host && url.host !== API_HOST) {
          track("outbound", url.hostname.replace(/^www\./, ""));
        }
      } catch {
        /* not a URL */
      }
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
