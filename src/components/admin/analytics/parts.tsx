"use client";

import { useRef, useState } from "react";
import { compact, num, pct, type Report } from "./format";

type IconType = (p: { size?: number }) => JSX.Element;

export function Card({
  title,
  subtitle,
  actions,
  className = "",
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`adm-card an-card ${className}`}>
      <div className="an-card-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function Kpi({
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
  icon: IconType;
  hint: string;
  lowerIsBetter?: boolean;
}) {
  const rounded = delta === null ? null : Math.round(delta);
  const good = rounded !== null && rounded !== 0 && rounded > 0 !== lowerIsBetter;
  const tone = rounded === null || rounded === 0 ? "is-flat" : good ? "is-up" : "is-down";
  return (
    <div className="adm-card an-kpi">
      <p className="an-kpi-label">
        <Icon size={15} /> {label}
        <span className="an-info" tabIndex={0} role="note" aria-label={hint} data-tip={hint}>
          i
        </span>
      </p>
      <p className="an-kpi-value">{value}</p>
      <p className={`an-delta ${tone}`}>
        {rounded === null ? "New" : rounded === 0 ? "No change" : `${rounded > 0 ? "▲" : "▼"} ${Math.abs(rounded)}%`}
        {rounded !== 0 && <span> vs previous</span>}
      </p>
    </div>
  );
}

export function Tabs<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="adm-segmented an-tabs" role="tablist" aria-label={label}>
      {options.map(([key, text]) => (
        <button key={key} type="button" role="tab" aria-selected={value === key} onClick={() => onChange(key)}>
          {text}
        </button>
      ))}
    </div>
  );
}

export type BarRow = { key: string; label: React.ReactNode; value: number; extra?: string; filter?: string };

/** Ranked list with proportional bars. Rows with `filter` are buttons that filter the dashboard. */
export function BarList({
  rows,
  total,
  showShare = false,
  small = false,
  limit,
  onSelect,
  active,
  emptyText = "No data yet.",
}: {
  rows: BarRow[];
  total?: number;
  showShare?: boolean;
  small?: boolean;
  limit?: number;
  onSelect?: (value: string) => void;
  active?: string;
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
        {shown.map((r) => {
          const content = (
            <>
              <span className="an-bar" style={{ width: `${(r.value / max) * 100}%` }} aria-hidden="true" />
              <span className="an-bar-label">{r.label}</span>
              <span className="an-bar-value">
                {r.extra && <small>{r.extra}</small>}
                {compact(r.value)}
                {showShare && <em>{Math.round((r.value / sum) * 100)}%</em>}
              </span>
            </>
          );
          return (
            <li key={r.key} className={active !== undefined && r.filter === active ? "is-active" : undefined}>
              {onSelect && r.filter !== undefined ? (
                <button type="button" className="an-bar-row" onClick={() => onSelect(r.filter as string)} title="Filter the dashboard by this">
                  {content}
                </button>
              ) : (
                <div className="an-bar-row">{content}</div>
              )}
            </li>
          );
        })}
      </ul>
      {limit && rows.length > limit && (
        <button type="button" className="an-more" onClick={() => setAll((v) => !v)}>
          {all ? "Show fewer" : `Show all ${rows.length}`}
        </button>
      )}
    </>
  );
}

/** One stacked bar with a legend: devices, new vs returning… */
export function Split({ rows, onSelect }: { rows: { label: string; value: number; filter?: string }[]; onSelect?: (v: string) => void }) {
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
        {rows.map((r, i) => {
          const body = (
            <>
              <span className={`an-dot ${tones[i % 3]}`} aria-hidden="true" />
              {r.label}
              <strong>{Math.round((r.value / total) * 100)}%</strong>
              <small>{num(r.value)}</small>
            </>
          );
          return (
            <li key={r.label}>
              {onSelect && r.filter ? (
                <button type="button" className="an-split-row" onClick={() => onSelect(r.filter as string)} title="Filter the dashboard by this">
                  {body}
                </button>
              ) : (
                <div className="an-split-row">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Conversion funnel: each step as a bar, with the share kept from the previous step. */
export function Funnel({ steps }: { steps: Report["funnel"] }) {
  const first = steps[0]?.sessions || 0;
  if (!first) return <p className="an-empty-cell">No visits in this period.</p>;
  return (
    <ol className="an-funnel">
      {steps.map((step, i) => {
        const previous = i ? steps[i - 1].sessions : step.sessions;
        const kept = previous ? (step.sessions / previous) * 100 : 0;
        return (
          <li key={step.key}>
            <div className="an-funnel-head">
              <span className="an-funnel-step">{i + 1}</span>
              <span className="an-funnel-label">{step.label}</span>
              <strong>{num(step.sessions)}</strong>
              <em>{pct(Math.round((step.sessions / first) * 1000) / 10)}</em>
            </div>
            <div className="an-funnel-track">
              <span style={{ width: `${(step.sessions / first) * 100}%` }} />
            </div>
            {i > 0 && (
              <p className="an-funnel-note">
                {Math.round(kept)}% continued from the previous step
                {previous - step.sessions > 0 && <> · {num(previous - step.sessions)} dropped off</>}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_NAMES = ["Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays", "Sundays"];

/** Weekday × hour grid of page views; darker means busier. */
export function Heatmap({ grid }: { grid: number[][] }) {
  const max = Math.max(1, ...grid.flat());
  const total = grid.flat().reduce((a, b) => a + b, 0);
  let best = { day: 0, hour: 0, value: 0 };
  grid.forEach((row, day) => row.forEach((value, hour) => value > best.value && (best = { day, hour, value })));
  return (
    <div className="an-heat-wrap">
      <div className="an-heat" role="table" aria-label="Page views by weekday and hour">
        <div className="an-heat-row an-heat-hours" role="row" aria-hidden="true">
          <span />
          {Array.from({ length: 24 }, (_, h) => (
            <span key={h}>{h % 3 === 0 ? String(h).padStart(2, "0") : ""}</span>
          ))}
        </div>
        {grid.map((row, day) => (
          <div key={day} className="an-heat-row" role="row">
            <span className="an-heat-day" role="rowheader">
              {DAYS[day]}
            </span>
            {row.map((value, hour) => (
              <span
                key={hour}
                role="cell"
                className="an-heat-cell"
                style={{ "--a": value ? 0.12 + (value / max) * 0.88 : 0 } as React.CSSProperties}
                title={`${DAYS[day]} ${String(hour).padStart(2, "0")}:00 – ${num(value)} views`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="an-heat-foot">
        <span>
          {total ? (
            <>
              Busiest: <strong>
                {DAY_NAMES[best.day]} around {String(best.hour).padStart(2, "0")}:00
              </strong>
            </>
          ) : (
            "No views yet."
          )}
        </span>
        <span className="an-heat-scale" aria-hidden="true">
          Less <i style={{ "--a": 0.12 } as React.CSSProperties} />
          <i style={{ "--a": 0.4 } as React.CSSProperties} />
          <i style={{ "--a": 0.7 } as React.CSSProperties} />
          <i style={{ "--a": 1 } as React.CSSProperties} /> More
        </span>
      </div>
    </div>
  );
}

/** Area (views) + line (visitors) + dashed previous period, in plain SVG, with a hover readout. */
export function TrafficChart({ series, hourly }: { series: Report["series"]; hourly: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const W = 1000;
  const H = 260;
  const pad = { top: 22, right: 6, bottom: 28, left: 0 };
  const max = Math.max(...series.map((d) => Math.max(d.views, d.previous)), 4);
  const step = niceStep(max / 4);
  const top = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, k) => k * step);
  const x = (i: number) => pad.left + (series.length > 1 ? (i / (series.length - 1)) * (W - pad.left - pad.right) : (W - pad.left - pad.right) / 2);
  const y = (v: number) => pad.top + (1 - v / top) * (H - pad.top - pad.bottom);
  const line = (key: "views" | "visitors" | "previous") => series.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(" ");
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
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Page views and visitors over time, with the previous period">
        {ticks.map((v) => (
          <line key={v} className="an-grid-line" x1={pad.left} x2={W - pad.right} y1={y(v)} y2={y(v)} />
        ))}
        <path className="an-area" d={area} />
        <path className="an-line is-previous" d={line("previous")} vectorEffect="non-scaling-stroke" />
        <path className="an-line is-views" d={line("views")} vectorEffect="non-scaling-stroke" />
        <path className="an-line is-visitors" d={line("visitors")} vectorEffect="non-scaling-stroke" />
        {hover !== null && <line className="an-cursor" x1={x(hover)} x2={x(hover)} y1={pad.top} y2={H - pad.bottom} vectorEffect="non-scaling-stroke" />}
      </svg>
      <div className="an-y-axis" aria-hidden="true">
        {ticks.map((v) => (
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
          <span className="an-key is-previous">{num(point.previous)} views, previous period</span>
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
