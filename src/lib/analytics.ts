"use client";

/**
 * Privacy-friendly analytics for the public site: no cookies, nothing stored about the visitor
 * except a per-tab session id (sessionStorage), so page views can be grouped into visits.
 */

const ENDPOINT = "/visit";

export type EventName = "cv_download" | "booking" | "contact" | "lab_open" | "share";

function sessionId(): string {
  try {
    let id = sessionStorage.getItem("pf_sid");
    if (!id) {
      id = (crypto.randomUUID?.() ?? `${Date.now()}${Math.random()}`).replace(/[^a-z0-9]/gi, "").slice(0, 32);
      sessionStorage.setItem("pf_sid", id);
    }
    return id;
  } catch {
    return "";
  }
}

function post(body: Record<string, unknown>, keepalive = false) {
  return fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, session: sessionId() }),
    keepalive,
  });
}

let firstView = true;
let lastView: { path: string; at: number; id: Promise<number | null> } | null = null;

/**
 * Record a page view; resolves to its id (for the time-on-page update), or null.
 * A repeat for the same page within a second (React re-running effects) reuses the first one.
 */
export function trackView(path: string): Promise<number | null> {
  if (lastView && lastView.path === path && Date.now() - lastView.at < 1000) return lastView.id;
  lastView = { path, at: Date.now(), id: sendView(path) };
  return lastView.id;
}

async function sendView(path: string): Promise<number | null> {
  const params = new URLSearchParams(window.location.search);
  // The referrer only means something for the page the visitor arrived on.
  const referrer = firstView ? document.referrer : "";
  firstView = false;
  try {
    const res = await post({
      type: "view",
      path,
      referrer,
      source: params.get("utm_source") || params.get("ref") || "",
      language: navigator.language,
    });
    const data = await res.json();
    return typeof data.id === "number" ? data.id : null;
  } catch {
    return null;
  }
}

/** Update how long the visitor actually looked at a page (visible time only). */
export function trackTime(id: number, seconds: number) {
  const body = JSON.stringify({ type: "leave", id, seconds, session: sessionId() });
  if (navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: "application/json" }))) return;
  fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => undefined);
}

/** Record an action: résumé opened, meeting booked, message sent… */
export function track(name: EventName) {
  post({ type: "event", name, path: window.location.pathname }, true).catch(() => undefined);
}
