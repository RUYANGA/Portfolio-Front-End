"use client";

import { useEffect, useState } from "react";
import { countryName, duration, EVENT_NAMES, flag, pageName, SECTION_NAMES, sourceName, type LiveEvent, type Presence } from "./format";
import type { LiveStatus } from "./useLiveAnalytics";

/** "just now", "12 s ago", "3 min ago" (re-rendered by the panel's clock). */
function since(iso: string | undefined, now: number) {
  if (!iso) return "";
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds} s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function where(e: { city: string; country: string }) {
  return e.city || countryName(e.country);
}

function describe(e: LiveEvent): { verb: string; tone: string } {
  if (e.type === "view") return { verb: `Viewed ${pageName(e.path)}`, tone: "is-view" };
  if (e.name === "section") return { verb: `Reached ${SECTION_NAMES[e.target] || e.target}`, tone: "is-section" };
  if (e.name === "outbound") return { verb: `Clicked ${e.target === "email" ? "your email" : e.target === "phone" ? "your phone" : e.target}`, tone: "is-out" };
  const goal = ["cv_download", "contact", "booking"].includes(e.name);
  return { verb: EVENT_NAMES[e.name] || e.name, tone: goal ? "is-goal" : "is-event" };
}

export function LiveStatusBadge({ status, visitors }: { status: LiveStatus; visitors: number }) {
  const text =
    status === "live" ? `Live · ${visitors} ${visitors === 1 ? "visitor" : "visitors"} now` : status === "connecting" ? "Connecting…" : "Offline · reconnecting";
  return (
    <span className={`an-live is-${status}${status === "live" && visitors ? " is-on" : ""}`} title="Updates instantly over a live connection">
      <span className="an-live-dot" aria-hidden="true" />
      {text}
    </span>
  );
}

/** Who is on the site now, and everything happening, as it happens. */
export default function LivePanel({ status, presence, feed }: { status: LiveStatus; presence: Presence; feed: LiveEvent[] }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const clock = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(clock);
  }, []);
  // "Reached a section" fires up to six times per visit; it's in Journeys and Home page reach instead.
  const activity = feed.filter((e) => e.name !== "section");

  return (
    <section className="an-livepanel" aria-label="Live">
      <div className="adm-card an-card">
        <div className="an-card-head">
          <div>
            <h2>
              Right now <span className="an-count">{presence.visitors}</span>
            </h2>
            <p>People with a page of your site open at this moment</p>
          </div>
        </div>
        {presence.pages.length ? (
          <ul className="an-now">
            {presence.pages.map((p, i) => (
              <li key={`${p.path}-${p.since}-${i}`}>
                <span className="an-flag" title={countryName(p.country)} aria-hidden="true">
                  {flag(p.country)}
                </span>
                <span className="an-now-main">
                  <strong>{pageName(p.path)}</strong>
                  <span>{[where(p), p.device, p.source && sourceName(p.source)].filter(Boolean).join(" · ")}</span>
                </span>
                <span className="an-now-time" title="Time on this page">
                  {p.seconds ? duration(p.seconds) : since(p.since, now)}
                </span>
                <span className="an-live-dot is-pulse" aria-hidden="true" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="an-empty-cell">{status === "live" ? "Nobody is on the site right now. New visitors appear here instantly." : "Waiting for the live connection…"}</p>
        )}
      </div>

      <div className="adm-card an-card">
        <div className="an-card-head">
          <div>
            <h2>Live activity</h2>
            <p>Every visit and action, the moment it happens</p>
          </div>
        </div>
        {activity.length ? (
          <ol className="an-feed" aria-live="polite">
            {activity.map((e) => {
              const { verb, tone } = describe(e);
              return (
                <li key={e.id} className={tone}>
                  <span className="an-feed-dot" aria-hidden="true" />
                  <span className="an-feed-main">
                    <strong>{verb}</strong>
                    <span>
                      {flag(e.country)} {[where(e), e.device, e.type === "view" && e.source ? sourceName(e.source) : "", e.returning ? "returning" : ""]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <time dateTime={e.at}>{since(e.at, now)}</time>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="an-empty-cell">New visits and clicks appear here as they happen. Open your site in another tab to see it.</p>
        )}
      </div>
    </section>
  );
}
