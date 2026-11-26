"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import ShareProject from "@/components/site/ShareProject";
import { track } from "@/lib/analytics";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Check,
  Clock,
  Code,
  Globe,
  GraduationCap,
  Layers,
  Search,
  Server,
  UserIcon,
  Zap,
} from "@/components/ui/Icons";
import {
  BookingInfo,
  type MeetingType,
  BookingResult,
  dayKey,
  formatDay,
  formatTime,
  zoneOffset,
} from "@/lib/api/booking";

type Owner = { name: string; title: string; photo: string | null };
type Step = "type" | "pick" | "details" | "done";
type Errors = Partial<Record<"name" | "email" | "company" | "notes" | "form", string>>;

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}

function allTimeZones(fallback: string): string[] {
  const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
  const zones = intl.supportedValuesOf?.("timeZone") ?? [];
  return zones.includes(fallback) ? zones : [fallback, ...zones];
}

/** Calendar month the visitor is looking at, as plain numbers (month is 0-based). */
type Month = { year: number; month: number };

function monthOf(key: string): Month {
  const [year, month] = key.split("-").map(Number);
  return { year, month: month - 1 };
}

function shiftMonth({ year, month }: Month, delta: number): Month {
  const d = new Date(Date.UTC(year, month + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** An icon that hints at what a meeting type is for, from its name. */
function TypeIcon({ type }: { type: MeetingType }) {
  const key = `${type.slug} ${type.title}`.toLowerCase();
  const props = { size: 20 };
  if (/technical interview|coding/.test(key)) return <Code {...props} />;
  if (/interview|job|hiring/.test(key)) return <Briefcase {...props} />;
  if (/review|audit/.test(key)) return <Search {...props} />;
  if (/technical|architecture/.test(key)) return <Server {...props} />;
  if (/project|consult|freelance/.test(key)) return <Layers {...props} />;
  if (/mentor|coach/.test(key)) return <GraduationCap {...props} />;
  if (/quick|question/.test(key)) return <Zap {...props} />;
  if (/collab|speak|workshop|talk/.test(key)) return <Globe {...props} />;
  if (/intro|chat|call/.test(key)) return <UserIcon {...props} />;
  return <Clock {...props} />;
}

type Props = {
  apiUrl: string;
  info: BookingInfo;
  owner: Owner;
  /** Meeting type to open with, from /book?type=<slug> (e.g. a shared link). */
  initialType?: string;
  /** Public site address, for the share link; falls back to the current page. */
  siteUrl?: string;
};

export default function BookingFlow({ apiUrl, info, owner, initialType, siteUrl }: Props) {
  const api = apiUrl.replace(/\/$/, "");
  const [typeSlug, setTypeSlug] = useState(
    info.meeting_types.find((t) => t.slug === initialType)?.slug ?? info.meeting_types[0]?.slug ?? "",
  );
  const [tz, setTz] = useState(info.timezone);
  const [hour12, setHour12] = useState(false);
  const [month, setMonth] = useState<Month>(() => monthOf(dayKey(new Date(), info.timezone)));
  const [slots, setSlots] = useState<string[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  // Open on the list of meeting types, unless a shared link already names one (or there's only one).
  const [step, setStep] = useState<Step>(
    info.meeting_types.length > 1 && !info.meeting_types.some((t) => t.slug === initialType) ? "type" : "pick",
  );
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<BookingResult | null>(null);
  const [notice, setNotice] = useState("");

  const type = info.meeting_types.find((t) => t.slug === typeSlug) ?? info.meeting_types[0];
  const zones = useMemo(() => allTimeZones(tz), [tz]);

  // The visitor's own time zone and clock style, known only in the browser.
  useEffect(() => {
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (browserTz) {
      setTz(browserTz);
      setMonth(monthOf(dayKey(new Date(), browserTz)));
    }
    setHour12(Boolean(new Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions().hour12));
  }, []);

  const load = useCallback(async () => {
    if (!type) return;
    setSlots(null);
    setLoadError("");
    // A day either side of the month, so every local day in it is covered whatever the time zone.
    const start = new Date(Math.max(Date.now(), Date.UTC(month.year, month.month, 1) - 864e5));
    const end = new Date(Date.UTC(month.year, month.month + 1, 1) + 864e5);
    if (end <= start) return setSlots([]);
    const params = new URLSearchParams({ type: type.slug, start: start.toISOString(), end: end.toISOString() });
    try {
      const res = await fetch(`${api}/api/booking/slots/?${params}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "Times couldn't be loaded.");
      setSlots(data.slots as string[]);
    } catch (e) {
      setLoadError((e as Error).message || "Times couldn't be loaded.");
      setSlots([]);
    }
  }, [api, type, month]);

  const choosingType = step === "type";
  useEffect(() => {
    if (!choosingType) load();
  }, [load, choosingType]);

  // Slots grouped by the visitor's local day.
  const byDay = useMemo(() => {
    const groups = new Map<string, string[]>();
    for (const iso of slots ?? []) {
      const key = dayKey(new Date(iso), tz);
      groups.set(key, [...(groups.get(key) ?? []), iso]);
    }
    return groups;
  }, [slots, tz]);

  const monthPrefix = `${month.year}-${pad(month.month + 1)}`;
  const daysThisMonth = [...byDay.keys()].filter((k) => k.startsWith(monthPrefix)).sort();

  // Open the first free day of the month, unless the visitor already picked one in it.
  useEffect(() => {
    if (slots === null) return;
    if (!day || !day.startsWith(monthPrefix) || !byDay.has(day)) setDay(daysThisMonth[0] ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots, tz, monthPrefix]);

  const todayKey = dayKey(new Date(), tz);
  const thisMonth = monthOf(todayKey);
  const lastBookable = new Date(Date.now() + info.max_days_ahead * 864e5);
  const lastMonth = monthOf(dayKey(lastBookable, tz));
  const canPrev = month.year > thisMonth.year || (month.year === thisMonth.year && month.month > thisMonth.month);
  const canNext = month.year < lastMonth.year || (month.year === lastMonth.year && month.month < lastMonth.month);

  const firstWeekday = (new Date(Date.UTC(month.year, month.month, 1)).getUTCDay() + 6) % 7; // Monday first
  const daysInMonth = new Date(Date.UTC(month.year, month.month + 1, 0)).getUTCDate();
  const monthLabel = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(month.year, month.month, 1)),
  );

  function setTypeParam(slug: string | null) {
    // Keep the address bar on the chosen type, so copying it shares the same meeting.
    const url = new URL(window.location.href);
    if (slug) url.searchParams.set("type", slug);
    else url.searchParams.delete("type");
    window.history.replaceState(null, "", url);
  }

  function scrollToCard() {
    document.getElementById("booking")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function chooseType(slug: string) {
    setTypeSlug(slug);
    setSlot(null);
    setNotice("");
    setStep("pick");
    setTypeParam(slug);
    scrollToCard();
  }

  function changeType() {
    setSlot(null);
    setStep("type");
    setTypeParam(null);
    scrollToCard();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!slot || !type) return;
    const form = Object.fromEntries(new FormData(event.currentTarget).entries());
    setSending(true);
    setErrors({});
    try {
      const res = await fetch(`${api}/api/booking/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, type: type.slug, start: slot, timezone: tz }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setResult(data as BookingResult);
        track("booking");
        setStep("done");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (res.status === 409) {
        setNotice("Sorry, that time was just taken. Please choose another.");
        setSlot(null);
        setStep("pick");
        load();
        return;
      }
      if (res.status === 429) return setErrors({ form: "Too many bookings from this connection. Please try again later." });
      const next: Errors = {};
      for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
        const text = Array.isArray(value) ? value.join(" ") : String(value);
        if (key in { name: 1, email: 1, company: 1, notes: 1 }) next[key as keyof Errors] = text;
        else next.form = text;
      }
      setErrors(Object.keys(next).length ? next : { form: "The booking wasn't made. Please check the form and try again." });
    } catch {
      setErrors({ form: "The booking couldn't reach the server. Please try again." });
    } finally {
      setSending(false);
    }
  }

  if (!type) return null;
  const shareUrl = siteUrl ? `${siteUrl.replace(/\/$/, "")}/book?type=${type.slug}` : undefined;
  const chosen = slot ? new Date(slot) : null;
  const chosenEnd = chosen ? new Date(chosen.getTime() + type.duration_minutes * 60000) : null;

  const host = (
    <div className="bk-host">
      {owner.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={owner.photo} alt="" className="bk-avatar" />
      ) : (
        <span className="bk-avatar" aria-hidden="true">
          {initials(owner.name)}
        </span>
      )}
      <div>
        <p className="bk-host-name">{owner.name}</p>
        <p className="bk-host-title">{owner.title}</p>
      </div>
    </div>
  );

  if (step === "type") {
    return (
      <div id="booking" className="bk-card bk-card-types">
        <div className="bk-types-head">
          {host}
          <ShareProject
            className="bk-share bk-share-inline"
            url={siteUrl ? `${siteUrl.replace(/\/$/, "")}/book` : undefined}
            title={`Book a call with ${owner.name}`}
            text="Pick a meeting type and a time that suits you:"
            label="Share"
            noun="booking"
          />
        </div>
        <div className="bk-types-intro">
          <h2>What would you like to talk about?</h2>
          <p className="bk-muted">
            Choose a meeting type. Every call is a video call, and times are shown in your own time zone.
          </p>
        </div>
        <ul className="bk-type-grid">
          {info.meeting_types.map((t) => (
            <li key={t.slug}>
              <button type="button" className="bk-type-card" onClick={() => chooseType(t.slug)}>
                <span className="bk-type-icon" aria-hidden="true">
                  <TypeIcon type={t} />
                </span>
                <span className="bk-type-body">
                  <strong>{t.title}</strong>
                  {t.description && <span className="bk-type-text">{t.description}</span>}
                </span>
                <span className="bk-type-meta">
                  <Clock size={14} /> {t.duration_minutes} min
                  <ArrowRight size={16} className="bk-type-arrow" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div id="booking" className={`bk-card${step === "done" ? " is-done" : ""}`}>
      {/* ---------- Summary panel ---------- */}
      <aside className="bk-side">
        {host}

        <div className="bk-type-heading">
          <span className="bk-type-icon" aria-hidden="true">
            <TypeIcon type={type} />
          </span>
          <h2 className="bk-type-title">{type.title}</h2>
        </div>
        {info.meeting_types.length > 1 && step === "pick" && (
          <button type="button" className="bk-change" onClick={changeType}>
            <ArrowLeft size={14} /> Change meeting type
          </button>
        )}
        <ul className="bk-facts">
          <li>
            <Clock size={16} /> {type.duration_minutes} minutes
          </li>
          <li>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m22 8-6 4 6 4V8Z" />
              <rect x="2" y="6" width="14" height="12" rx="2" />
            </svg>
            Video call, link in your invitation
          </li>
          {chosen && chosenEnd && (
            <li className="bk-fact-strong">
              <Check size={16} /> {formatDay(chosen, tz)}, {formatTime(chosen, tz, hour12)} – {formatTime(chosenEnd, tz, hour12)}
            </li>
          )}
          <li>
            <Globe size={16} /> {tz.replace(/_/g, " ")} ({zoneOffset(tz)})
          </li>
        </ul>
        {type.description && <p className="bk-type-desc">{type.description}</p>}

        {step === "pick" && (
          <ShareProject
            key={type.slug}
            className="bk-share"
            url={shareUrl}
            title={`Book a ${type.title.toLowerCase()} with ${owner.name}`}
            text={`${type.duration_minutes}-minute video call. Pick a time that suits you:`}
            label="Share booking link"
            noun="booking"
          />
        )}

      </aside>

      {/* ---------- Main panel ---------- */}
      <div className="bk-main">
        {step === "pick" && (
          <>
            <div className="bk-main-head">
              <h3>Select a date &amp; time</h3>
              {notice && (
                <p className="bk-notice" role="alert">
                  {notice}
                </p>
              )}
            </div>

            <div className="bk-picker">
              <div className="bk-calendar">
                <div className="bk-month">
                  <button type="button" className="bk-nav" onClick={() => setMonth((m) => shiftMonth(m, -1))} disabled={!canPrev} aria-label="Previous month">
                    <ArrowLeft size={16} />
                  </button>
                  <span aria-live="polite">{monthLabel}</span>
                  <button type="button" className="bk-nav" onClick={() => setMonth((m) => shiftMonth(m, 1))} disabled={!canNext} aria-label="Next month">
                    <ArrowRight size={16} />
                  </button>
                </div>
                <div className="bk-grid" role="grid" aria-label={monthLabel} aria-busy={slots === null}>
                  {WEEKDAYS.map((w) => (
                    <span key={w} className="bk-weekday" role="columnheader">
                      {w}
                    </span>
                  ))}
                  {Array.from({ length: firstWeekday }, (_, i) => (
                    <span key={`blank-${i}`} />
                  ))}
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const key = `${monthPrefix}-${pad(i + 1)}`;
                    const free = byDay.has(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        role="gridcell"
                        className={`bk-day${free ? " is-free" : ""}${key === day ? " is-selected" : ""}${key === todayKey ? " is-today" : ""}`}
                        disabled={!free}
                        aria-pressed={key === day}
                        aria-label={`${i + 1} ${monthLabel}${free ? `, ${byDay.get(key)!.length} times available` : ", unavailable"}`}
                        onClick={() => {
                          setDay(key);
                          setSlot(null);
                          setNotice("");
                        }}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>

                <div className="bk-zone">
                  <label htmlFor="bk-tz">
                    <Globe size={14} /> Time zone
                  </label>
                  <select id="bk-tz" value={tz} onChange={(e) => setTz(e.target.value)}>
                    {zones.map((z) => (
                      <option key={z} value={z}>
                        {z.replace(/_/g, " ")} ({zoneOffset(z)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bk-times">
                <div className="bk-times-head">
                  <p>
                    {day
                      ? new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(
                          new Date(`${day}T12:00:00Z`),
                        )
                      : "Times"}
                  </p>
                  <div className="bk-clock" role="group" aria-label="Clock format">
                    <button type="button" aria-pressed={hour12} onClick={() => setHour12(true)}>
                      12h
                    </button>
                    <button type="button" aria-pressed={!hour12} onClick={() => setHour12(false)}>
                      24h
                    </button>
                  </div>
                </div>
                {slots === null && (
                  <ul className="bk-slot-list" aria-hidden="true">
                    {Array.from({ length: 6 }, (_, i) => (
                      <li key={i} className="bk-skeleton" />
                    ))}
                  </ul>
                )}
                {slots !== null && loadError && (
                  <div className="bk-empty">
                    <p>{loadError}</p>
                    <button type="button" className="button button-secondary button-sm" onClick={load}>
                      Try again
                    </button>
                  </div>
                )}
                {slots !== null && !loadError && !day && (
                  <div className="bk-empty">
                    <p>No free times in {monthLabel}.</p>
                    {canNext && (
                      <button type="button" className="button button-secondary button-sm" onClick={() => setMonth((m) => shiftMonth(m, 1))}>
                        Check next month <ArrowRight size={14} />
                      </button>
                    )}
                  </div>
                )}
                {slots !== null && day && (
                  <ul className="bk-slot-list">
                    {(byDay.get(day) ?? []).map((iso) => (
                      <li key={iso} className={`bk-slot${iso === slot ? " is-selected" : ""}`}>
                        <button type="button" className="bk-slot-time" aria-pressed={iso === slot} onClick={() => setSlot(iso)}>
                          {formatTime(new Date(iso), tz, hour12)}
                        </button>
                        {iso === slot && (
                          <button type="button" className="bk-slot-next" onClick={() => setStep("details")}>
                            Next
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}

        {step === "details" && chosen && (
          <form className="form bk-form" onSubmit={submit}>
            <div className="bk-main-head">
              <button type="button" className="bk-back" onClick={() => setStep("pick")}>
                <ArrowLeft size={16} /> Change time
              </button>
              <h3>Your details</h3>
              <p className="bk-muted">The invitation goes to the email you enter, and to my calendar.</p>
            </div>
            <div className="form-row">
              <div className="field">
                <label htmlFor="bk-name">Name</label>
                <input id="bk-name" name="name" autoComplete="name" required maxLength={120} aria-invalid={!!errors.name} />
                {errors.name && <span className="field-error">{errors.name}</span>}
              </div>
              <div className="field">
                <label htmlFor="bk-email">Email</label>
                <input id="bk-email" name="email" type="email" autoComplete="email" required aria-invalid={!!errors.email} />
                {errors.email && <span className="field-error">{errors.email}</span>}
              </div>
            </div>
            <div className="field">
              <label htmlFor="bk-company">
                Company <span className="bk-optional">optional</span>
              </label>
              <input id="bk-company" name="company" autoComplete="organization" maxLength={120} />
            </div>
            <div className="field">
              <label htmlFor="bk-notes">
                What would you like to discuss? <span className="bk-optional">optional</span>
              </label>
              <textarea id="bk-notes" name="notes" maxLength={2000} placeholder="A role, a project, or anything I can prepare for." />
            </div>
            <div className="honeypot" aria-hidden="true">
              <label htmlFor="bk-website">Leave this empty</label>
              <input id="bk-website" name="website" tabIndex={-1} autoComplete="off" />
            </div>
            {errors.form && (
              <p className="form-status" role="alert">
                {errors.form}
              </p>
            )}
            <button type="submit" className="button button-primary button-lg" disabled={sending}>
              {sending ? "Booking…" : "Confirm booking"}
            </button>
          </form>
        )}

        {step === "done" && result && (
          <Confirmation result={result} tz={tz} hour12={hour12} owner={owner.name} />
        )}
      </div>
    </div>
  );
}

function Confirmation({ result, tz, hour12, owner }: { result: BookingResult; tz: string; hour12: boolean; owner: string }) {
  const start = new Date(result.start);
  const end = new Date(result.end);
  return (
    <div className="bk-done" role="status">
      <svg className="success-check" viewBox="0 0 52 52" aria-hidden="true">
        <circle cx="26" cy="26" r="24" />
        <path d="M15 27l7 7 15-16" />
      </svg>
      <h3>You&apos;re booked, {result.name.split(" ")[0]}</h3>
      <p className="bk-muted">
        It&apos;s in your calendar: an invitation was sent to <strong>{result.email}</strong>.
      </p>
      <dl className="bk-done-details">
        <div>
          <dt>What</dt>
          <dd>
            {result.title} with {owner}
          </dd>
        </div>
        <div>
          <dt>When</dt>
          <dd>
            {formatDay(start, tz)}
            <br />
            {formatTime(start, tz, hour12)} – {formatTime(end, tz, hour12)} ({zoneOffset(tz, start)})
          </dd>
        </div>
        <div>
          <dt>Where</dt>
          <dd>{result.meeting_link ? <a href={result.meeting_link}>{result.meeting_link.replace(/^https?:\/\//, "")}</a> : "Video call, link in your invitation"}</dd>
        </div>
      </dl>
      <p className="bk-muted bk-small">
        Need to cancel? <Link href={`/book/manage/${result.manage_token}`}>Manage this booking</Link>. The link is in your email too.
      </p>
    </div>
  );
}
