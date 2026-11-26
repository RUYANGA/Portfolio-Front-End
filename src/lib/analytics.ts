"use client";

/**
 * Privacy-friendly analytics for the public site: no cookies. The only things kept in the browser
 * are a per-tab session id (sessionStorage), so page views can be grouped into visits, and a
 * "has been here before" flag (localStorage) for new vs returning visitors. Neither identifies anyone.
 */

const ENDPOINT = "/visit";

export type EventName = "cv_download" | "booking" | "contact" | "lab_open" | "share" | "section" | "outbound";

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

/** Whether this browser visited before this tab's visit started (worked out once per visit). */
function isReturning(): boolean {
  try {
    const known = sessionStorage.getItem("pf_ret");
    if (known !== null) return known === "1";
    const seen = localStorage.getItem("pf_seen") !== null;
    localStorage.setItem("pf_seen", "1");
    sessionStorage.setItem("pf_ret", seen ? "1" : "0");
    return seen;
  } catch {
    return false;
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
      returning: isReturning(),
    });
    const data = await res.json();
    return typeof data.id === "number" ? data.id : null;
  } catch {
    return null;
  }
}

/** Update how long the visitor looked at a page (visible time only) and how far down they got (%). */
export function trackTime(id: number, seconds: number, scroll: number) {
  const body = JSON.stringify({ type: "leave", id, seconds, scroll, session: sessionId() });
  if (navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: "application/json" }))) return;
  fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => undefined);
}

/** Record an action: résumé opened, meeting booked, message sent, section reached, link clicked… */
export function track(name: EventName, target = "") {
  post({ type: "event", name, target, path: window.location.pathname }, true).catch(() => undefined);
}
