/** Types for GET /api/admin/analytics/ and small formatting helpers for the analytics dashboard. */

export type Summary = {
  views: number;
  visitors: number;
  sessions: number;
  views_per_session: number;
  bounce_rate: number;
  engagement_rate: number;
  returning_rate: number;
  avg_time: number;
  avg_visit: number;
  actions: number;
};
export type Counts = { views: number; visitors: number };
export type Step = {
  at: string;
  type: "view" | "event";
  path: string;
  name: string;
  target: string;
  duration: number;
  scroll: number;
};
export type Journey = {
  started: string;
  ended: string;
  time: number;
  pages: number;
  source: string;
  returning: boolean;
  engaged: boolean;
  country: string;
  city: string;
  device: string;
  browser: string;
  os: string;
  steps: Step[];
};
export type PageRow = Counts & {
  path: string;
  avg_time: number;
  avg_scroll: number | null;
  entries: number;
  exits: number;
  exit_rate: number;
};
export type Report = {
  range: { days: number; start: string; end: string; timezone: string };
  filters: Filters;
  totals: Summary;
  previous: Summary;
  series: { label: string; views: number; visitors: number; previous: number }[];
  countries: ({ country: string } & Counts)[];
  cities: ({ city: string; country: string } & Counts)[];
  pages: PageRow[];
  sources: { source: string; sessions: number; visitors: number; engagement_rate: number }[];
  devices: ({ device: string } & Counts)[];
  browsers: ({ browser: string } & Counts)[];
  systems: ({ os: string } & Counts)[];
  languages: ({ language: string } & Counts)[];
  visitor_types: { new: number; returning: number };
  funnel: { key: string; label: string; sessions: number }[];
  sections: {
    home_visits: number;
    reached: { section: string; sessions: number }[];
    scroll_depth: { depth: number; share: number }[];
  };
  events: { name: string; count: number; visitors: number }[];
  outbound: { target: string; clicks: number; visitors: number }[];
  heatmap: number[][];
  sessions: Journey[];
  live: { visitors: number; pages: { path: string; country: string; city: string; device: string }[] };
};

export const FILTER_LABELS = {
  country: "Country",
  city: "City",
  device: "Device",
  browser: "Browser",
  os: "OS",
  language: "Language",
  source: "Source",
  page: "Page",
} as const;
export type FilterKey = keyof typeof FILTER_LABELS;
export type Filters = Partial<Record<FilterKey, string>>;

const nf = new Intl.NumberFormat();
export const num = (n: number) => nf.format(n);
export const compact = (n: number) => new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(n);
export const pct = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)}%`;

export function duration(seconds: number) {
  if (!seconds) return "0s";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h) return `${h}h ${String(m).padStart(2, "0")}m`;
  return m ? `${m}m ${String(s).padStart(2, "0")}s` : `${s}s`;
}

let regionNames: Intl.DisplayNames | null = null;
let languageNames: Intl.DisplayNames | null = null;

export function countryName(code: string) {
  if (!code) return "Unknown";
  try {
    regionNames ??= new Intl.DisplayNames(["en"], { type: "region" });
    return regionNames.of(code) || code;
  } catch {
    return code;
  }
}

export function languageName(code: string) {
  try {
    languageNames ??= new Intl.DisplayNames(["en"], { type: "language" });
    return languageNames.of(code) || code;
  } catch {
    return code;
  }
}

/** "RW" → 🇷🇼 (regional indicator letters); a globe when the country is unknown. */
export function flag(code: string) {
  if (!/^[A-Z]{2}$/.test(code)) return "🌐";
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

const PAGE_NAMES: Record<string, string> = { "/": "Home", "/book": "Book a meeting", "/book/manage": "Manage booking" };
export const pageName = (path: string) => PAGE_NAMES[path] || path;

export const SECTION_NAMES: Record<string, string> = {
  about: "About",
  experience: "Experience",
  projects: "Projects",
  labs: "Cloud labs",
  skills: "Skills",
  contact: "Contact",
};

export const EVENT_NAMES: Record<string, string> = {
  cv_download: "Opened the résumé",
  booking: "Booked a meeting",
  contact: "Sent a message",
  lab_open: "Opened a cloud lab",
  project_open: "Opened a project",
  share: "Shared a page",
  section: "Reached",
  outbound: "Clicked",
};

export const sourceName = (source: string) => (source === "Direct" ? "Direct / unknown" : source);

/** Percentage change from `before` to `now`; null when there's nothing to compare with. */
export function change(now: number, before: number) {
  if (!before) return now ? null : 0;
  return ((now - before) / before) * 100;
}

/** "3 min ago", "2 h ago", or a date. */
export function ago(iso: string) {
  const date = new Date(iso);
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 24 * 60) return `${Math.round(minutes / 60)} h ago`;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export const clock = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

/** Download rows as a CSV file (opens in Excel / Google Sheets). */
export function downloadCsv(filename: string, sections: { title: string; head: string[]; rows: (string | number)[][] }[]) {
  const cell = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const text = sections
    .map((s) => [s.title, s.head.map(cell).join(","), ...s.rows.map((r) => r.map(cell).join(","))].join("\n"))
    .join("\n\n");
  const url = URL.createObjectURL(new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
