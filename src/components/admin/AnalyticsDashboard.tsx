"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowUpRight, Clock, Download, Eye, Globe, Mail, Monitor, UserIcon } from "@/components/ui/Icons";
import { adminFetch, ApiError } from "@/lib/admin/client";

/* ---------- API shape (GET /api/admin/analytics/) ---------- */

type Summary = { views: number; visitors: number; sessions: number; views_per_session: number; bounce_rate: number; avg_time: number };
type Row = { views: number; visitors: number };
type Report = {
  range: { days: number; start: string; end: string; timezone: string };
  totals: Summary;
  previous: Summary;
  series: ({ label: string } & Row)[];
  countries: ({ country: string } & Row)[];
  cities: ({ city: string; country: string } & Row)[];
  pages: ({ path: string; avg_time: number } & Row)[];
  sources: ({ source: string } & Row)[];
  devices: ({ device: string } & Row)[];
  browsers: ({ browser: string } & Row)[];
  systems: ({ os: string } & Row)[];
  languages: ({ language: string } & Row)[];
  hours: number[];
  weekdays: number[];
  events: { name: string; count: number; visitors: number }[];
  live: { visitors: number; pages: { path: string; country: string; city: string; device: string }[] };
  recent: { created_at: string; path: string; country: string; city: string; device: string; browser: string; os: string; referrer: string; duration: number }[];
};

const RANGES: [number, string][] = [
  [1, "Today"],
  [7, "7 days"],
  [30, "30 days"],
  [90, "90 days"],
  [365, "12 months"],
];

const EVENTS: Record<string, { label: string; hint: string; icon: (p: { size?: number }) => JSX.Element }> = {
  cv_download: { label: "Résumé opened", hint: "previewed or downloaded", icon: Download },
  booking: { label: "Meetings booked", hint: "through the booking page", icon: Clock },
  contact: { label: "Messages sent", hint: "from the contact form", icon: Mail },
  lab_open: { label: "Cloud labs viewed", hint: "opened a lab's details", icon: Eye },
};

const REFRESH_MS = 60_000;

/* ---------- formatting ---------- */

const nf = new Intl.NumberFormat();
const num = (n: number) => nf.format(n);
const compact = (n: number) => new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(n);

function duration(seconds: number) {
  if (!seconds) return "0s";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m ? `${m}m ${String(s).padStart(2, "0")}s` : `${s}s`;
}

let regionNames: Intl.DisplayNames | null = null;
let languageNames: Intl.DisplayNames | null = null;
function countryName(code: string) {
  if (!code) return "Unknown";
  try {
    regionNames ??= new Intl.DisplayNames(["en"], { type: "region" });
    return regionNames.of(code) || code;
  } catch {
    return code;
  }
}
function languageName(code: string) {
  try {
    languageNames ??= new Intl.DisplayNames(["en"], { type: "language" });
    return languageNames.of(code) || code;
  } catch {
    return code;
  }
}
/** "RW" → 🇷🇼 (regional indicator letters); a globe when the country is unknown. */
function flag(code: string) {
  if (!/^[A-Z]{2}$/.test(code)) return "🌐";
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
const PAGE_NAMES: Record<string, string> = { "/": "Home", "/book": "Book a meeting", "/book/manage": "Manage booking" };
const pageName = (path: string) => PAGE_NAMES[path] || path;

function change(now: number, before: number) {
  if (!before) return now ? null : 0; // nothing to compare with
  return ((now - before) / before) * 100;
}

/* ---------- component ---------- */

export default function AnalyticsDashboard() {
  const [days, setDays] = useState(30);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [updated, setUpdated] = useState<Date | null>(null);
  const timeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      try {
        const data = await adminFetch<Report>(`analytics/?days=${days}&tz=${encodeURIComponent(timeZone)}`);
        setReport(data);
        setError("");
        setUpdated(new Date());
      } catch (e) {
        if (!quiet) setError(e instanceof ApiError ? e.message : "Couldn't load analytics.");
      } finally {
        setLoading(false);
      }
    },
    [days, timeZone],
  );

  useEffect(() => {
    load();
    const timer = window.setInterval(() => document.visibilityState === "visible" && load(true), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const t = report?.totals;
  const empty = report && report.totals.views === 0 && report.previous.views === 0;

  return (
    <div className="an-page">
      <header className="adm-page-head">
        <div>
          <p className="adm-eyebrow">Insights</p>
          <h1>Analytics</h1>
          <p>Who visits your portfolio, where they come from and what they do. No cookies are used, and your own visits while signed in aren&apos;t counted.</p>
        </div>
        <div className="adm-page-actions">
          {report && (
            <span className={`an-live${report.live.visitors ? " is-on" : ""}`} title="Visitors active in the last 5 minutes">
              <span className="an-live-dot" aria-hidden="true" />
              {report.live.visitors} {report.live.visitors === 1 ? "visitor" : "visitors"} now
            </span>
          )}
          <div className="adm-segmented" role="tablist" aria-label="Date range">
            {RANGES.map(([value, label]) => (
              <button key={value} type="button" role="tab" aria-selected={days === value} onClick={() => setDays(value)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {error && (
        <div className="adm-alert is-error" role="alert">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {!report && loading && <SkeletonDashboard />}

      {report && t && (
        <div className={`an-body${loading ? " is-loading" : ""}`} aria-busy={loading}>
          {empty && <EmptyState />}

          <section className="an-kpis" aria-label="Key figures">
            <Kpi label="Unique visitors" value={num(t.visitors)} delta={change(t.visitors, report.previous.visitors)} icon={UserIcon} />
            <Kpi label="Page views" value={num(t.views)} delta={change(t.views, report.previous.views)} icon={Eye} />
            <Kpi label="Visits" value={num(t.sessions)} delta={change(t.sessions, report.previous.sessions)} icon={Globe} hint="Browsing sessions" />
            <Kpi
              label="Pages per visit"
              value={t.views_per_session.toFixed(1)}
              delta={change(t.views_per_session, report.previous.views_per_session)}
              icon={Monitor}
            />
            <Kpi label="Avg. time on page" value={duration(t.avg_time)} delta={change(t.avg_time, report.previous.avg_time)} icon={Clock} />
            <Kpi
              label="Bounce rate"
              value={`${t.bounce_rate}%`}
              delta={change(t.bounce_rate, report.previous.bounce_rate)}
              lowerIsBetter
              icon={ArrowUpRight}
              hint="Visits that left after one page"
            />
          </section>

          <section className="adm-card an-card an-traffic">
            <div className="an-card-head">
              <div>
                <h2>Traffic</h2>
                <p>{days === 1 ? "Today, by hour" : `Last ${RANGES.find(([d]) => d === days)?.[1]}, by day`} · {timeZone.replace(/_/g, " ")}</p>
              </div>
              <div className="an-legend" aria-hidden="true">
                <span className="an-key is-views">Page views</span>
                <span className="an-key is-visitors">Visitors</span>
              </div>
            </div>
            <TrafficChart series={report.series} hourly={days === 1} />
          </section>

          <div className="an-grid an-grid-wide">
            <Card title="Countries" subtitle="Where your visitors are">
              <BarList
                rows={report.countries.map((r) => ({
                  key: r.country || "unknown",
                  label: (
                    <>
                      <span className="an-flag" aria-hidden="true">
                        {flag(r.country)}
                      </span>
                      {countryName(r.country)}
                    </>
                  ),
                  value: r.visitors,
                  extra: `${num(r.views)} views`,
                }))}
                total={t.visitors}
                showShare
                limit={10}
                emptyText="No visits yet. Countries appear once the site is live on Vercel."
              />
            </Card>
            <Card title="Cities" subtitle="Top cities">
              <BarList
                rows={report.cities.map((r) => ({
                  key: `${r.city}-${r.country}`,
                  label: (
                    <>
                      <span className="an-flag" aria-hidden="true">
                        {flag(r.country)}
                      </span>
                      {r.city}
                    </>
                  ),
                  value: r.visitors,
                }))}
                emptyText="No city data yet."
              />
            </Card>
          </div>

          <div className="an-grid an-grid-wide">
            <Card title="Top pages" subtitle="What people read">
              <table className="an-table">
                <thead>
                  <tr>
                    <th scope="col">Page</th>
                    <th scope="col">Views</th>
                    <th scope="col">Visitors</th>
                    <th scope="col">Avg. time</th>
                  </tr>
                </thead>
                <tbody>
                  {report.pages.map((p) => (
                    <tr key={p.path}>
                      <td>
                        <a href={p.path} target="_blank" rel="noreferrer" className="an-page-link" title={p.path}>
                          {pageName(p.path)}
                        </a>
                      </td>
                      <td>{num(p.views)}</td>
                      <td>{num(p.visitors)}</td>
                      <td>{duration(p.avg_time)}</td>
                    </tr>
                  ))}
                  {!report.pages.length && (
                    <tr>
                      <td colSpan={4} className="an-empty-cell">
                        No page views in this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>
            <Card title="Traffic sources" subtitle="How visitors found you">
              <BarList
                rows={report.sources.map((r) => ({
                  key: r.source,
                  label: (
                    <>
                      <span className="an-source-mark" aria-hidden="true">
                        {r.source === "Direct" ? "→" : r.source[0]?.toUpperCase()}
                      </span>
                      {r.source === "Direct" ? "Direct / unknown" : r.source}
                    </>
                  ),
                  value: r.visitors,
                }))}
                total={t.visitors}
                showShare
                emptyText="No referrals yet."
              />
            </Card>
          </div>

          <section className="an-actions" aria-label="Actions">
            {Object.entries(EVENTS).map(([name, info]) => {
              const event = report.events.find((e) => e.name === name);
              const count = event?.count ?? 0;
              const rate = t.visitors ? ((event?.visitors ?? 0) / t.visitors) * 100 : 0;
              const Icon = info.icon;
              return (
                <div key={name} className="adm-card an-action">
                  <span className="an-action-icon" aria-hidden="true">
                    <Icon size={18} />
                  </span>
                  <div>
                    <p className="an-action-label">{info.label}</p>
                    <p className="an-action-value">{num(count)}</p>
                    <p className="an-action-hint">
                      {rate ? `${rate.toFixed(1)}% of visitors · ` : ""}
                      {info.hint}
                    </p>
                  </div>
                </div>
              );
            })}
          </section>

          <div className="an-grid an-grid-4">
            <Card title="Devices">
              <Split rows={report.devices.map((r) => ({ label: r.device, value: r.visitors }))} />
            </Card>
            <Card title="Browsers">
              <BarList rows={report.browsers.map((r) => ({ key: r.browser, label: r.browser, value: r.visitors }))} total={t.visitors} showShare compact />
            </Card>
            <Card title="Operating systems">
              <BarList rows={report.systems.map((r) => ({ key: r.os, label: r.os, value: r.visitors }))} total={t.visitors} showShare compact />
            </Card>
            <Card title="Languages">
              <BarList rows={report.languages.map((r) => ({ key: r.language, label: languageName(r.language), value: r.visitors }))} total={t.visitors} showShare compact />
            </Card>
          </div>

          <div className="an-grid an-grid-wide">
            <Card title="Busiest hours" subtitle={`Page views by hour of day (${timeZone.replace(/_/g, " ")})`}>
              <Columns values={report.hours} labels={report.hours.map((_, h) => `${String(h).padStart(2, "0")}:00`)} tick={(i) => i % 6 === 0} />
            </Card>
            <Card title="Busiest days" subtitle="Page views by day of the week">
              <Columns values={report.weekdays} labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]} tick={() => true} />
            </Card>
          </div>

          <div className="an-grid an-grid-wide">
            <Card title="Recent visits" subtitle="The latest page views">
              <ul className="an-recent">
                {report.recent.map((v, i) => (
                  <li key={`${v.created_at}-${i}`}>
                    <span className="an-flag" title={countryName(v.country)} aria-label={countryName(v.country)}>
                      {flag(v.country)}
                    </span>
                    <div className="an-recent-main">
                      <strong>{pageName(v.path)}</strong>
                      <span>
                        {[v.city || countryName(v.country), `${v.browser} on ${v.os}`, v.referrer && `from ${v.referrer}`].filter(Boolean).join(" · ")}
                      </span>
                    </div>
                    <span className="an-recent-time">
                      <RelativeTime iso={v.created_at} />
                      {v.duration > 0 && <small>{duration(v.duration)}</small>}
                    </span>
                  </li>
                ))}
                {!report.recent.length && <li className="an-empty-cell">No visits in this period.</li>}
              </ul>
            </Card>
            <Card title="Right now" subtitle="Pages open in the last 5 minutes">
              {report.live.pages.length ? (
                <ul className="an-recent">
                  {[...report.live.pages].reverse().map((p, i) => (
                    <li key={i}>
                      <span className="an-flag" aria-label={countryName(p.country)}>
                        {flag(p.country)}
                      </span>
                      <div className="an-recent-main">
                        <strong>{pageName(p.path)}</strong>
                        <span>{[p.city || countryName(p.country), p.device].filter(Boolean).join(" · ")}</span>
                      </div>
                      <span className="an-live-dot" aria-hidden="true" />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="an-empty-cell">Nobody is on the site right now.</p>
              )}
            </Card>
          </div>

          <p className="an-foot">
            {updated && <>Updated {updated.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })} · refreshes every minute · </>}
            Compared with the previous {days === 1 ? "day" : `${days} days`}.
          </p>
        </div>
      )}
    </div>
  );
}

/* ---------- pieces ---------- */

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="adm-card an-card">
      <div className="an-card-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Kpi({
  label,
  value,
  delta,
  icon: Icon,
  hint,
  lowerIsBetter = false,
}: {
  label: string;
  value: string;
  delta: number | null;
  icon: (p: { size?: number }) => JSX.Element;
  hint?: string;
  lowerIsBetter?: boolean;
}) {
  const rounded = delta === null ? null : Math.round(delta);
  const good = rounded !== null && rounded !== 0 && (rounded > 0) !== lowerIsBetter;
  const tone = rounded === null || rounded === 0 ? "is-flat" : good ? "is-up" : "is-down";
  return (
    <div className="adm-card an-kpi" title={hint}>
      <p className="an-kpi-label">
        <Icon size={15} /> {label}
      </p>
      <p className="an-kpi-value">{value}</p>
      <p className={`an-delta ${tone}`}>
        {rounded === null ? "New" : rounded === 0 ? "No change" : `${rounded > 0 ? "▲" : "▼"} ${Math.abs(rounded)}%`}
        {rounded !== 0 && <span> vs previous</span>}
      </p>
    </div>
  );
}

type BarRow = { key: string; label: React.ReactNode; value: number; extra?: string };

function BarList({
  rows,
  total,
  showShare = false,
  compact: small = false,
  limit,
  emptyText = "No data yet.",
}: {
  rows: BarRow[];
  total?: number;
  showShare?: boolean;
  compact?: boolean;
  limit?: number;
  emptyText?: string;
}) {
  const [all, setAll] = useState(false);
  if (!rows.length) return <p className="an-empty-cell">{emptyText}</p>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  const sum = total || rows.reduce((a, r) => a + r.value, 0) || 1;
  const shown = limit && !all ? rows.slice(0, limit) : rows;
  return (
    <>
      <ul className={`an-bars${small ? " is-compact" : ""}`}>
        {shown.map((r) => (
          <li key={r.key}>
            <span className="an-bar" style={{ width: `${(r.value / max) * 100}%` }} aria-hidden="true" />
            <span className="an-bar-label">{r.label}</span>
            <span className="an-bar-value">
              {r.extra && <small>{r.extra}</small>}
              {compact(r.value)}
              {showShare && <em>{Math.round((r.value / sum) * 100)}%</em>}
            </span>
          </li>
        ))}
      </ul>
      {limit && rows.length > limit && (
        <button type="button" className="an-more" onClick={() => setAll((v) => !v)}>
          {all ? "Show fewer" : `Show all ${rows.length}`}
        </button>
      )}
    </>
  );
}

function Split({ rows }: { rows: { label: string; value: number }[] }) {
  const total = rows.reduce((a, r) => a + r.value, 0);
  if (!total) return <p className="an-empty-cell">No data yet.</p>;
  const tones = ["is-1", "is-2", "is-3"];
  return (
    <div className="an-split">
      <div className="an-split-bar" role="img" aria-label={rows.map((r) => `${r.label} ${Math.round((r.value / total) * 100)}%`).join(", ")}>
        {rows.map((r, i) => (
          <span key={r.label} className={tones[i % 3]} style={{ width: `${(r.value / total) * 100}%` }} />
        ))}
      </div>
      <ul>
        {rows.map((r, i) => (
          <li key={r.label}>
            <span className={`an-dot ${tones[i % 3]}`} aria-hidden="true" />
            {r.label}
            <strong>{Math.round((r.value / total) * 100)}%</strong>
            <small>{num(r.value)}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Columns({ values, labels, tick }: { values: number[]; labels: string[]; tick: (i: number) => boolean }) {
  const max = Math.max(...values, 1);
  const peak = values.indexOf(Math.max(...values));
  return (
    <div className="an-columns" style={{ gridTemplateColumns: `repeat(${values.length}, 1fr)` }}>
      {values.map((v, i) => (
        <div key={i} className="an-col" title={`${labels[i]}: ${num(v)} views`}>
          <span className={`an-col-bar${i === peak && v ? " is-peak" : ""}`} style={{ height: `${Math.max(v ? 4 : 2, (v / max) * 100)}%` }} />
          <small>{tick(i) ? labels[i] : ""}</small>
        </div>
      ))}
    </div>
  );
}

/** Area (views) + line (visitors) chart in plain SVG, with a hover readout. */
function TrafficChart({ series, hourly }: { series: Report["series"]; hourly: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const W = 1000;
  const H = 260;
  const pad = { top: 22, right: 6, bottom: 28, left: 0 };
  const max = Math.max(...series.map((d) => d.views), 4);
  const step = niceStep(max / 4);
  const top = Math.ceil(max / step) * step;
  const x = (i: number) => pad.left + (series.length > 1 ? (i / (series.length - 1)) * (W - pad.left - pad.right) : (W - pad.left - pad.right) / 2);
  const y = (v: number) => pad.top + (1 - v / top) * (H - pad.top - pad.bottom);
  const line = (key: "views" | "visitors") => series.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(" ");
  const area = `${line("views")} L${x(series.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const label = (s: string, long = false) =>
    hourly ? s : new Date(`${s}T12:00:00`).toLocaleDateString(undefined, long ? { weekday: "short", day: "numeric", month: "short" } : { day: "numeric", month: "short" });
  const every = Math.max(1, Math.ceil(series.length / 8));

  function onMove(e: React.MouseEvent) {
    const rect = box.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - pad.left) / (W - pad.left - pad.right)) * (series.length - 1));
    setHover(Math.min(series.length - 1, Math.max(0, i)));
  }

  const point = hover !== null ? series[hover] : null;
  return (
    <div className="an-chart" ref={box} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Page views and visitors over time">
        {Array.from({ length: Math.round(top / step) + 1 }, (_, k) => k * step).map((v) => (
          <g key={v}>
            <line className="an-grid-line" x1={pad.left} x2={W - pad.right} y1={y(v)} y2={y(v)} />
          </g>
        ))}
        <path className="an-area" d={area} />
        <path className="an-line is-views" d={line("views")} vectorEffect="non-scaling-stroke" />
        <path className="an-line is-visitors" d={line("visitors")} vectorEffect="non-scaling-stroke" />
        {hover !== null && <line className="an-cursor" x1={x(hover)} x2={x(hover)} y1={pad.top} y2={H - pad.bottom} vectorEffect="non-scaling-stroke" />}
      </svg>
      {/* Axis labels as HTML so they don't stretch with the SVG. */}
      <div className="an-y-axis" aria-hidden="true">
        {Array.from({ length: Math.round(top / step) + 1 }, (_, k) => k * step).map((v) => (
          <span key={v} style={{ top: `${(y(v) / H) * 100}%` }}>
            {compact(v)}
          </span>
        ))}
      </div>
      <div className="an-x-axis" aria-hidden="true">
        {series.map((d, i) =>
          i % every === 0 ? (
            <span key={d.label} style={{ left: `${(x(i) / W) * 100}%` }}>
              {label(d.label)}
            </span>
          ) : null,
        )}
      </div>
      {point && hover !== null && (
        <div className={`an-tip${x(hover) > W * 0.7 ? " is-left" : ""}`} style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(point.views) / H) * 100}%` }}>
          <strong>{label(point.label, true)}</strong>
          <span className="an-key is-views">{num(point.views)} views</span>
          <span className="an-key is-visitors">{num(point.visitors)} visitors</span>
        </div>
      )}
    </div>
  );
}

function niceStep(raw: number) {
  const power = 10 ** Math.floor(Math.log10(Math.max(raw, 1)));
  const n = raw / power;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * power;
}

function RelativeTime({ iso }: { iso: string }) {
  const date = new Date(iso);
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  const text =
    minutes < 1
      ? "just now"
      : minutes < 60
        ? `${minutes} min ago`
        : minutes < 24 * 60
          ? `${Math.round(minutes / 60)} h ago`
          : date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  return <time dateTime={iso} title={date.toLocaleString()}>{text}</time>;
}

function EmptyState() {
  return (
    <div className="adm-card an-empty">
      <Globe size={22} />
      <div>
        <h2>No visits recorded yet</h2>
        <p>
          Visits appear here a few seconds after someone opens the site. If the site is live and this stays empty, check that{" "}
          <code>ANALYTICS_KEY</code> is set to the same value on the backend and on Vercel, then redeploy both.
        </p>
      </div>
    </div>
  );
}

function SkeletonDashboard() {
  return (
    <div className="an-body" aria-busy="true" aria-label="Loading analytics">
      <div className="an-kpis">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="adm-card an-kpi">
            <span className="adm-skel" style={{ width: "60%", height: 12 }} />
            <span className="adm-skel" style={{ width: "40%", height: 28, marginTop: 12 }} />
          </div>
        ))}
      </div>
      <div className="adm-card an-card">
        <span className="adm-skel" style={{ width: "100%", height: 260 }} />
      </div>
    </div>
  );
}
