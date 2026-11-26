"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowUpRight, Award, Clock, Download, Eye, Globe, Mail, UserIcon, XIcon, Zap } from "@/components/ui/Icons";
import { adminFetch, ApiError } from "@/lib/admin/client";
import Journeys from "./analytics/Journeys";
import { BarList, Card, Funnel, Heatmap, Kpi, Split, Tabs, TrafficChart } from "./analytics/parts";
import {
  change,
  countryName,
  downloadCsv,
  duration,
  FILTER_LABELS,
  flag,
  languageName,
  num,
  pageName,
  pct,
  SECTION_NAMES,
  sourceName,
  type FilterKey,
  type Filters,
  type PageRow,
  type Report,
} from "./analytics/format";

const RANGES: [number, string][] = [
  [1, "Today"],
  [7, "7 days"],
  [30, "30 days"],
  [90, "90 days"],
  [365, "12 months"],
];

const GOALS: { name: string; label: string; hint: string; icon: (p: { size?: number }) => JSX.Element }[] = [
  { name: "cv_download", label: "Résumé opened", hint: "previewed or downloaded", icon: Download },
  { name: "booking", label: "Meetings booked", hint: "through the booking page", icon: Clock },
  { name: "contact", label: "Messages sent", hint: "from the contact form", icon: Mail },
  { name: "lab_open", label: "Cloud labs viewed", hint: "opened a lab's details", icon: Eye },
];

type PageTab = "top" | "entry" | "exit";
const PAGE_TABS: [PageTab, string][] = [
  ["top", "Top pages"],
  ["entry", "Landing"],
  ["exit", "Exit"],
];

const REFRESH_MS = 60_000;

function readFilters(): Filters {
  const params = new URLSearchParams(window.location.search);
  const filters: Filters = {};
  (Object.keys(FILTER_LABELS) as FilterKey[]).forEach((key) => {
    const value = params.get(key);
    if (value) filters[key] = value;
  });
  return filters;
}

function filterText(key: FilterKey, value: string) {
  if (key === "country") return `${flag(value)} ${countryName(value)}`;
  if (key === "language") return languageName(value);
  if (key === "page") return pageName(value);
  if (key === "source") return sourceName(value);
  return value;
}

export default function AnalyticsDashboard() {
  const [ready, setReady] = useState(false);
  const [days, setDays] = useState(30);
  const [filters, setFilters] = useState<Filters>({});
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [updated, setUpdated] = useState<Date | null>(null);
  const [pageTab, setPageTab] = useState<PageTab>("top");
  const timeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

  // Filters and range live in the address bar, so a filtered view can be bookmarked or shared.
  useEffect(() => {
    setFilters(readFilters());
    const range = Number(new URLSearchParams(window.location.search).get("days"));
    if (RANGES.some(([d]) => d === range)) setDays(range);
    setReady(true);
  }, []);

  const query = useMemo(() => {
    const params = new URLSearchParams({ days: String(days), tz: timeZone });
    Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
    return params.toString();
  }, [days, filters, timeZone]);

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      try {
        const data = await adminFetch<Report>(`analytics/?${query}`);
        setReport(data);
        setError("");
        setUpdated(new Date());
      } catch (e) {
        if (!quiet) setError(e instanceof ApiError ? e.message : "Couldn't load analytics.");
      } finally {
        setLoading(false);
      }
    },
    [query],
  );

  useEffect(() => {
    if (!ready) return;
    const shown = new URLSearchParams(query);
    shown.delete("tz");
    if (shown.get("days") === "30") shown.delete("days");
    const search = shown.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${search ? `?${search}` : ""}`);
    load();
    const timer = window.setInterval(() => document.visibilityState === "visible" && load(true), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load, query, ready]);

  const addFilter = (key: FilterKey) => (value: string) => setFilters((f) => ({ ...f, [key]: value }));
  const removeFilter = (key: FilterKey) =>
    setFilters((f) => {
      const next = { ...f };
      delete next[key];
      return next;
    });

  const t = report?.totals;
  const p = report?.previous;
  const empty = report && report.totals.views === 0 && report.previous.views === 0 && !Object.keys(filters).length;
  const rangeLabel = RANGES.find(([d]) => d === days)?.[1] ?? "";

  const pageRows = useMemo(() => {
    if (!report) return [] as PageRow[];
    const rows = [...report.pages];
    if (pageTab === "entry") return rows.filter((r) => r.entries).sort((a, b) => b.entries - a.entries);
    if (pageTab === "exit") return rows.filter((r) => r.exits).sort((a, b) => b.exits - a.exits);
    return rows;
  }, [report, pageTab]);

  function exportCsv() {
    if (!report || !t) return;
    const filterNote = Object.entries(filters)
      .map(([k, v]) => `${FILTER_LABELS[k as FilterKey]}: ${v}`)
      .join("; ");
    const before = report.previous;
    downloadCsv(`portfolio-analytics-${new Date().toISOString().slice(0, 10)}-${days}d.csv`, [
      {
        title: `Portfolio analytics, ${rangeLabel}${filterNote ? ` (${filterNote})` : ""}`,
        head: ["Metric", "This period", "Previous period"],
        rows: [
          ["Unique visitors", t.visitors, before.visitors],
          ["Visits", t.sessions, before.sessions],
          ["Page views", t.views, before.views],
          ["Engagement rate %", t.engagement_rate, before.engagement_rate],
          ["Bounce rate %", t.bounce_rate, before.bounce_rate],
          ["Returning visitors %", t.returning_rate, before.returning_rate],
          ["Avg. visit (s)", t.avg_visit, before.avg_visit],
          ["Visits with a goal", t.actions, before.actions],
        ],
      },
      { title: "Traffic", head: ["Date", "Views", "Visitors", "Previous period views"], rows: report.series.map((s) => [s.label, s.views, s.visitors, s.previous]) },
      { title: "Countries", head: ["Country", "Visitors", "Views"], rows: report.countries.map((c) => [countryName(c.country), c.visitors, c.views]) },
      { title: "Cities", head: ["City", "Country", "Visitors", "Views"], rows: report.cities.map((c) => [c.city, countryName(c.country), c.visitors, c.views]) },
      {
        title: "Pages",
        head: ["Page", "Views", "Visitors", "Avg. time (s)", "Avg. read %", "Landings", "Exits", "Exit rate %"],
        rows: report.pages.map((r) => [r.path, r.views, r.visitors, r.avg_time, r.avg_scroll ?? "", r.entries, r.exits, r.exit_rate]),
      },
      { title: "Sources", head: ["Source", "Visits", "Visitors", "Engagement %"], rows: report.sources.map((s) => [s.source, s.sessions, s.visitors, s.engagement_rate]) },
      { title: "Funnel", head: ["Step", "Visits"], rows: report.funnel.map((f) => [f.label, f.sessions]) },
      { title: "Actions", head: ["Action", "Count", "Visitors"], rows: report.events.map((e) => [e.name, e.count, e.visitors]) },
      { title: "Outbound links", head: ["Destination", "Clicks", "Visitors"], rows: report.outbound.map((o) => [o.target, o.clicks, o.visitors]) },
    ]);
  }

  return (
    <div className="an-page">
      <header className="adm-page-head">
        <div>
          <p className="adm-eyebrow">Insights</p>
          <h1>Analytics</h1>
          <p>Who visits your portfolio, how they find it, how far they read and what they do. No cookies; your own visits while signed in aren&apos;t counted.</p>
        </div>
        <div className="adm-page-actions">
          {report && (
            <span className={`an-live${report.live.visitors ? " is-on" : ""}`} title="Visitors active in the last 5 minutes">
              <span className="an-live-dot" aria-hidden="true" />
              {report.live.visitors} {report.live.visitors === 1 ? "visitor" : "visitors"} now
            </span>
          )}
          <Tabs value={String(days)} options={RANGES.map(([d, l]) => [String(d), l])} onChange={(v) => setDays(Number(v))} label="Date range" />
          <button type="button" className="button button-secondary button-sm" onClick={exportCsv} disabled={!report}>
            <Download size={15} /> Export CSV
          </button>
        </div>
      </header>

      <div className="an-filters" aria-live="polite">
        {Object.keys(filters).length ? (
          <>
            <span className="an-filters-label">Filtered by</span>
            {(Object.entries(filters) as [FilterKey, string][]).map(([key, value]) => (
              <button key={key} type="button" className="an-chip" onClick={() => removeFilter(key)} aria-label={`Remove filter ${FILTER_LABELS[key]}: ${value}`}>
                <span>{FILTER_LABELS[key]}</span> {filterText(key, value)} <XIcon size={13} />
              </button>
            ))}
            <button type="button" className="an-clear" onClick={() => setFilters({})}>
              Clear all
            </button>
          </>
        ) : (
          <span className="an-filters-hint">Tip: click any country, city, page, source or device to filter the whole dashboard.</span>
        )}
      </div>

      {error && (
        <div className="adm-alert is-error" role="alert">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {!report && loading && <SkeletonDashboard />}

      {report && t && p && (
        <div className={`an-body${loading ? " is-loading" : ""}`} aria-busy={loading}>
          {empty && <EmptyState />}

          <section className="an-kpis" aria-label="Key figures">
            <Kpi label="Unique visitors" value={num(t.visitors)} delta={change(t.visitors, p.visitors)} icon={UserIcon} hint="Different people (counted per day, without cookies)." />
            <Kpi label="Visits" value={num(t.sessions)} delta={change(t.sessions, p.sessions)} icon={Globe} hint="Browsing sessions. One person can visit several times." />
            <Kpi label="Page views" value={num(t.views)} delta={change(t.views, p.views)} icon={Eye} hint={`${t.views_per_session.toFixed(1)} pages per visit on average.`} />
            <Kpi
              label="Engagement rate"
              value={pct(t.engagement_rate)}
              delta={change(t.engagement_rate, p.engagement_rate)}
              icon={Zap}
              hint="Visits that viewed 2+ pages, stayed 30 s+, read half a page or took an action."
            />
            <Kpi label="Avg. visit" value={duration(t.avg_visit)} delta={change(t.avg_visit, p.avg_visit)} icon={Clock} hint={`Time on site per visit. ${duration(t.avg_time)} per page.`} />
            <Kpi
              label="Bounce rate"
              value={pct(t.bounce_rate)}
              delta={change(t.bounce_rate, p.bounce_rate)}
              lowerIsBetter
              icon={ArrowUpRight}
              hint="Visits that left after one page. Lower is better."
            />
            <Kpi label="Returning" value={pct(t.returning_rate)} delta={change(t.returning_rate, p.returning_rate)} icon={UserIcon} hint="Visits from people who had been here before." />
            <Kpi label="Goal visits" value={num(t.actions)} delta={change(t.actions, p.actions)} icon={Award} hint="Visits that opened the résumé, booked a meeting or sent a message." />
          </section>

          <Card
            title="Traffic"
            subtitle={`${days === 1 ? "Today, by hour" : `Last ${rangeLabel}, by day`} · ${timeZone.replace(/_/g, " ")}`}
            actions={
              <div className="an-legend" aria-hidden="true">
                <span className="an-key is-views">Page views</span>
                <span className="an-key is-visitors">Visitors</span>
                <span className="an-key is-previous">Previous period</span>
              </div>
            }
          >
            <TrafficChart series={report.series} hourly={days === 1} />
          </Card>

          <div className="an-grid an-grid-half">
            <Card title="Conversion funnel" subtitle="How far visits get, from arriving to getting in touch">
              <Funnel steps={report.funnel} />
            </Card>
            <Card title="Home page reach" subtitle={`How far down the home page ${num(report.sections.home_visits)} visits got`}>
              <SectionReach sections={report.sections} />
            </Card>
          </div>

          <div className="an-grid an-grid-wide">
            <Card title="Countries" subtitle="Where your visitors are">
              <BarList
                rows={report.countries.map((r) => ({
                  key: r.country || "unknown",
                  filter: r.country || undefined,
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
                onSelect={addFilter("country")}
                active={filters.country}
                emptyText="No visits in this period."
              />
            </Card>
            <Card title="Cities" subtitle="Top cities">
              <BarList
                rows={report.cities.map((r) => ({
                  key: `${r.city}-${r.country}`,
                  filter: r.city,
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
                limit={10}
                onSelect={addFilter("city")}
                active={filters.city}
                emptyText="No city data yet."
              />
            </Card>
          </div>

          <div className="an-grid an-grid-wide">
            <Card title="Pages" subtitle="Click a page to see only the visits that included it" actions={<Tabs value={pageTab} options={PAGE_TABS} onChange={setPageTab} label="Page list" />}>
              <div className="an-table-wrap">
                <table className="an-table">
                  <thead>
                    <tr>
                      <th scope="col">Page</th>
                      <th scope="col">{pageTab === "entry" ? "Landings" : pageTab === "exit" ? "Exits" : "Views"}</th>
                      <th scope="col">Visitors</th>
                      <th scope="col">Avg. time</th>
                      <th scope="col">Read</th>
                      <th scope="col">Exit rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((r) => (
                      <tr key={r.path} className={filters.page === r.path ? "is-active" : undefined}>
                        <td>
                          <button type="button" className="an-page-link" title={`Filter by ${r.path}`} onClick={() => addFilter("page")(r.path)}>
                            {pageName(r.path)}
                          </button>
                        </td>
                        <td>{num(pageTab === "entry" ? r.entries : pageTab === "exit" ? r.exits : r.views)}</td>
                        <td>{num(r.visitors)}</td>
                        <td>{duration(r.avg_time)}</td>
                        <td>{r.avg_scroll === null ? "–" : <ReadMeter value={r.avg_scroll} />}</td>
                        <td>{pct(r.exit_rate)}</td>
                      </tr>
                    ))}
                    {!pageRows.length && (
                      <tr>
                        <td colSpan={6} className="an-empty-cell">
                          No page views in this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
            <Card title="Traffic sources" subtitle="Where each visit came from · engagement in brackets">
              <BarList
                rows={report.sources.map((r) => ({
                  key: r.source,
                  filter: r.source,
                  label: (
                    <>
                      <span className="an-source-mark" aria-hidden="true">
                        {r.source === "Direct" ? "→" : r.source[0]?.toUpperCase()}
                      </span>
                      {sourceName(r.source)}
                    </>
                  ),
                  value: r.sessions,
                  extra: `(${pct(r.engagement_rate)})`,
                }))}
                showShare
                onSelect={addFilter("source")}
                active={filters.source}
                emptyText="No visits in this period."
              />
            </Card>
          </div>

          <section className="an-actions" aria-label="Goals">
            {GOALS.map((goal) => {
              const event = report.events.find((e) => e.name === goal.name);
              const rate = t.visitors ? ((event?.visitors ?? 0) / t.visitors) * 100 : 0;
              const Icon = goal.icon;
              return (
                <div key={goal.name} className="adm-card an-action">
                  <span className="an-action-icon" aria-hidden="true">
                    <Icon size={18} />
                  </span>
                  <div>
                    <p className="an-action-label">{goal.label}</p>
                    <p className="an-action-value">{num(event?.count ?? 0)}</p>
                    <p className="an-action-hint">
                      {rate ? `${rate.toFixed(1)}% of visitors · ` : ""}
                      {goal.hint}
                    </p>
                  </div>
                </div>
              );
            })}
          </section>

          <div className="an-grid an-grid-4">
            <Card title="Devices">
              <Split rows={report.devices.map((r) => ({ label: r.device, value: r.visitors, filter: r.device }))} onSelect={addFilter("device")} />
            </Card>
            <Card title="New vs returning">
              <Split
                rows={[
                  { label: "New", value: report.visitor_types.new },
                  { label: "Returning", value: report.visitor_types.returning },
                ]}
              />
            </Card>
            <Card title="Browsers">
              <BarList
                rows={report.browsers.map((r) => ({ key: r.browser, filter: r.browser, label: r.browser, value: r.visitors }))}
                total={t.visitors}
                showShare
                small
                onSelect={addFilter("browser")}
                active={filters.browser}
              />
            </Card>
            <Card title="Operating systems">
              <BarList
                rows={report.systems.map((r) => ({ key: r.os, filter: r.os, label: r.os, value: r.visitors }))}
                total={t.visitors}
                showShare
                small
                onSelect={addFilter("os")}
                active={filters.os}
              />
            </Card>
          </div>

          <div className="an-grid an-grid-half">
            <Card title="Links clicked" subtitle="Where visitors went when they left the site">
              <BarList
                rows={report.outbound.map((r) => ({
                  key: r.target,
                  label: r.target === "email" ? "✉️ Email" : r.target === "phone" ? "📞 Phone" : r.target,
                  value: r.clicks,
                  extra: `${num(r.visitors)} ${r.visitors === 1 ? "visitor" : "visitors"}`,
                }))}
                emptyText="No outbound clicks recorded yet."
              />
            </Card>
            <Card title="Languages" subtitle="Browser language">
              <BarList
                rows={report.languages.map((r) => ({ key: r.language, filter: r.language, label: languageName(r.language), value: r.visitors }))}
                total={t.visitors}
                showShare
                small
                onSelect={addFilter("language")}
                active={filters.language}
              />
            </Card>
          </div>

          <Card title="When people visit" subtitle={`Page views by day and hour (${timeZone.replace(/_/g, " ")})`}>
            <Heatmap grid={report.heatmap} />
          </Card>

          <div className="an-grid an-grid-wide">
            <Card title="Visit journeys" subtitle="The latest visits, step by step. Click one to open its timeline.">
              <Journeys sessions={report.sessions} />
            </Card>
            <Card title="Right now" subtitle="Pages open in the last 5 minutes">
              {report.live.pages.length ? (
                <ul className="an-recent">
                  {[...report.live.pages].reverse().map((page, i) => (
                    <li key={i}>
                      <span className="an-flag" aria-label={countryName(page.country)}>
                        {flag(page.country)}
                      </span>
                      <div className="an-recent-main">
                        <strong>{pageName(page.path)}</strong>
                        <span>{[page.city || countryName(page.country), page.device].filter(Boolean).join(" · ")}</span>
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

function ReadMeter({ value }: { value: number }) {
  return (
    <span className="an-read" title={`Read ${value}% of the page on average`}>
      <span className="an-read-track" aria-hidden="true">
        <span style={{ width: `${value}%` }} />
      </span>
      {value}%
    </span>
  );
}

function SectionReach({ sections }: { sections: Report["sections"] }) {
  if (!sections.home_visits) return <p className="an-empty-cell">No home-page visits in this period.</p>;
  return (
    <div className="an-reach">
      <ol className="an-reach-list">
        {sections.reached.map((r) => {
          const share = (r.sessions / sections.home_visits) * 100;
          return (
            <li key={r.section}>
              <span className="an-reach-name">{SECTION_NAMES[r.section] || r.section}</span>
              <span className="an-reach-track" aria-hidden="true">
                <span style={{ width: `${share}%` }} />
              </span>
              <strong>{Math.round(share)}%</strong>
            </li>
          );
        })}
      </ol>
      <div className="an-depth" aria-label="Scroll depth on the home page">
        {sections.scroll_depth.map((d) => (
          <div key={d.depth}>
            <strong>{pct(d.share)}</strong>
            <span>read {d.depth === 100 ? "to the end" : `${d.depth}%`}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="adm-card an-empty">
      <Globe size={22} />
      <div>
        <h2>No visits recorded yet</h2>
        <p>
          Visits appear here a few seconds after someone opens the site. If the site is live and this stays empty, check that <code>ANALYTICS_KEY</code> is
          set to the same value on the backend and on Vercel, then redeploy both.
        </p>
      </div>
    </div>
  );
}

function SkeletonDashboard() {
  return (
    <div className="an-body" aria-busy="true" aria-label="Loading analytics">
      <div className="an-kpis">
        {Array.from({ length: 8 }, (_, i) => (
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
