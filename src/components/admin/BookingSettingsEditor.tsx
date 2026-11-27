"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowUpRight, Check, Clock, Plus, Trash } from "@/components/ui/Icons";
import { adminFetch, ApiError } from "@/lib/admin/client";
import type { Field } from "@/lib/admin/resources";
import { FieldControl } from "./Fields";
import { useFeedback } from "./Feedback";

type Range = [string, string];
type Hours = Record<string, Range[]>;
type Feed = { label: string; ok: boolean | null; error: string; busy_blocks: number; checked_at: string | null };
type Calendars = { configured: number; feeds: Feed[] };
type Settings = {
  is_enabled: boolean;
  timezone: string;
  weekly_hours: Hours;
  min_notice_hours: number;
  max_days_ahead: number;
  buffer_minutes: number;
  slot_step_minutes: number;
  daily_limit: number;
  calendar_emails: string[];
  meeting_link: string;
  reminder_minutes: number[];
  remind_guest: boolean;
  calendars?: Calendars;
};

const DAYS: [string, string][] = [
  ["mon", "Monday"],
  ["tue", "Tuesday"],
  ["wed", "Wednesday"],
  ["thu", "Thursday"],
  ["fri", "Friday"],
  ["sat", "Saturday"],
  ["sun", "Sunday"],
];

/** Reminder times offered, in minutes before the meeting. */
const REMINDER_OPTIONS: [number, string][] = [
  [2880, "2 days"],
  [1440, "1 day"],
  [180, "3 hours"],
  [60, "1 hour"],
  [30, "30 minutes"],
  [15, "15 minutes"],
  [10, "10 minutes"],
];
const MAX_REMINDERS = 5;

const STEP_OPTIONS = [10, 15, 20, 30, 60].map((m) => ({ value: String(m), label: `Every ${m} minutes` }));

const FIELDS: Record<string, Field> = {
  is_enabled: { name: "is_enabled", label: "Accept bookings", type: "checkbox", help: "When off, the booking page shows the contact options instead." },
  calendar_emails: {
    name: "calendar_emails",
    label: "Send invitations to",
    type: "tags",
    placeholder: "Add an address and press Enter",
    help: "Every booking is added to each of these calendars, e.g. your Gmail and your Outlook work address.",
  },
  remind_guest: { name: "remind_guest", label: "Remind the guest too", type: "checkbox", help: "They get the same reminder emails, in their own time zone." },
  meeting_link: { name: "meeting_link", label: "Video call link", type: "url", placeholder: "https://meet.google.com/…", help: "Added to every invitation. Leave empty to send a link yourself." },
  min_notice_hours: { name: "min_notice_hours", label: "Minimum notice (hours)", type: "number", help: "How soon a meeting can start." },
  max_days_ahead: { name: "max_days_ahead", label: "Book up to (days ahead)", type: "number" },
  buffer_minutes: { name: "buffer_minutes", label: "Buffer around meetings (minutes)", type: "number", help: "Free time kept before and after every meeting and calendar event." },
  daily_limit: { name: "daily_limit", label: "Most bookings per day", type: "number", help: "0 means no limit." },
};

function zones(current: string) {
  const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
  const list = intl.supportedValuesOf?.("timeZone") ?? [];
  return (list.includes(current) ? list : [current, ...list]).map((z) => ({ value: z, label: z.replace(/_/g, " ") }));
}

const timeAgo = (iso: string | null) => {
  if (!iso) return "not checked yet";
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return minutes < 1 ? "just now" : minutes < 60 ? `${minutes} min ago` : `${Math.round(minutes / 60)} h ago`;
};

/** Booking rules, weekly hours, invitation addresses and the status of the busy calendars. */
export default function BookingSettingsEditor() {
  const { toast, setUnsavedChanges } = useFeedback();
  const [saved, setSaved] = useState<Settings | null>(null);
  const [values, setValues] = useState<Settings | null>(null);
  const [calendars, setCalendars] = useState<Calendars | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    adminFetch<Settings>("booking/settings/")
      .then(({ calendars: cals, ...data }) => {
        setSaved(data);
        setValues(data);
        setCalendars(cals ?? null);
      })
      .catch((e: ApiError) => setError(e.message));
  }, []);

  const dirty = useMemo(() => JSON.stringify(values) !== JSON.stringify(saved), [values, saved]);
  useEffect(() => {
    setUnsavedChanges(dirty);
    return () => setUnsavedChanges(false);
  }, [dirty, setUnsavedChanges]);

  const timezoneOptions = useMemo(() => zones(values?.timezone || "Africa/Kigali"), [values?.timezone]);

  if (error) return <div className="adm-alert is-error">{error}</div>;
  if (!values) return <div className="adm-card adm-loading">Loading…</div>;

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setValues((v) => (v ? { ...v, [key]: value } : v));
  const setDay = (day: string, ranges: Range[]) => set("weekly_hours", { ...values.weekly_hours, [day]: ranges });

  async function save(event?: FormEvent) {
    event?.preventDefault();
    if (!values) return;
    setBusy(true);
    setErrors({});
    try {
      const { calendars: cals, ...data } = await adminFetch<Settings>("booking/settings/", { method: "PATCH", body: values });
      setSaved(data);
      setValues(data);
      if (cals) setCalendars(cals);
      toast("Booking settings saved.");
    } catch (e) {
      const err = e as ApiError;
      setErrors(err.fields || {});
      toast(err.message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function checkCalendars() {
    setChecking(true);
    try {
      const result = await adminFetch<Calendars>("booking/calendars/check/", { method: "POST" });
      setCalendars(result);
      const failing = result.feeds.filter((f) => !f.ok).length;
      toast(failing ? `${failing} calendar${failing > 1 ? "s" : ""} couldn't be read.` : "All calendars read successfully.", failing ? "error" : "success");
    } catch (e) {
      toast((e as ApiError).message, "error");
    } finally {
      setChecking(false);
    }
  }

  const field = (name: keyof typeof FIELDS, value: unknown, onChange: (v: unknown) => void) => (
    <FieldControl field={FIELDS[name]} value={value} error={errors[name]} onChange={onChange} />
  );

  return (
    <div className="adm-form">
      <header className="adm-page-head">
        <div>
          <h1>Booking settings</h1>
          <p>When visitors can book you, which calendars block busy time, and where invitations go.</p>
        </div>
        <div className="adm-page-actions">
          <Link className="button button-secondary button-sm" href="/book" target="_blank">
            View booking page <ArrowUpRight size={14} />
          </Link>
        </div>
      </header>

      <form id="booking-settings" onSubmit={save} className="adm-stack">
        {/* Calendars */}
        <section className="adm-card adm-section">
          <div className="adm-section-head adm-section-head-row">
            <div>
              <h2>Connected calendars</h2>
              <p>Busy time in these calendars is never offered to visitors. Bookings are added to the addresses below.</p>
            </div>
            <button type="button" className="button button-secondary button-sm" onClick={checkCalendars} disabled={checking || !calendars?.configured}>
              {checking ? "Checking…" : "Check now"}
            </button>
          </div>
          {calendars && calendars.configured > 0 ? (
            <ul className="adm-cal-list">
              {calendars.feeds.map((feed, i) => (
                <li key={`${feed.label}-${i}`} className={`adm-cal${feed.ok === false ? " is-error" : feed.ok ? " is-ok" : ""}`}>
                  <span className="adm-cal-icon">{feed.ok === false ? <AlertCircle size={16} /> : <Check size={16} />}</span>
                  <span className="adm-cal-text">
                    <strong>{feed.label}</strong>
                    <span>
                      {feed.ok === null
                        ? "Not read yet. Press Check now."
                        : feed.ok
                          ? `Read ${timeAgo(feed.checked_at)} · ${feed.busy_blocks} busy ${feed.busy_blocks === 1 ? "block" : "blocks"} ahead`
                          : `Can't be read (${timeAgo(feed.checked_at)}): ${feed.error}`}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="adm-cal-empty">
              <AlertCircle size={18} />
              <div>
                <strong>No calendars connected yet</strong>
                <p>
                  Add each calendar&apos;s private iCal link to <code>BOOKING_BUSY_CALENDARS</code> in the backend&apos;s environment
                  (comma-separated), then redeploy:
                </p>
                <ol>
                  <li>
                    <b>Google Calendar:</b> Settings → your calendar → Integrate calendar → <i>Secret address in iCal format</i>.
                  </li>
                  <li>
                    <b>Outlook:</b> Settings → Calendar → Shared calendars → Publish a calendar → choose <i>Can view when I&apos;m busy</i> → copy the ICS link.
                  </li>
                </ol>
              </div>
            </div>
          )}
          <div className="adm-grid adm-cal-fields">
            <div className="is-full">{field("calendar_emails", values.calendar_emails, (v) => set("calendar_emails", v as string[]))}</div>
            <div className="is-full">{field("meeting_link", values.meeting_link, (v) => set("meeting_link", v as string))}</div>
          </div>
        </section>

        {/* Weekly hours */}
        <section className="adm-card adm-section">
          <div className="adm-section-head">
            <h2>Weekly hours</h2>
            <p>The times you can be booked, in your time zone. Busy calendar events are taken out automatically.</p>
          </div>
          {errors.weekly_hours && <p className="adm-error">{errors.weekly_hours}</p>}
          <ul className="adm-hours">
            {DAYS.map(([key, label]) => {
              const ranges = values.weekly_hours[key] ?? [];
              const on = ranges.length > 0;
              return (
                <li key={key} className={`adm-hours-day${on ? "" : " is-off"}`}>
                  <label className="adm-switch adm-hours-toggle">
                    <input type="checkbox" checked={on} onChange={(e) => setDay(key, e.target.checked ? [["09:00", "17:00"]] : [])} />
                    <span className="adm-switch-track" aria-hidden="true" />
                    <span className="adm-label">{label}</span>
                  </label>
                  <div className="adm-hours-ranges">
                    {!on && <span className="adm-muted">Unavailable</span>}
                    {ranges.map(([start, end], i) => (
                      <div key={i} className="adm-hours-range">
                        <input type="time" aria-label={`${label} from`} value={start} step={300} onChange={(e) => setDay(key, ranges.map((r, j) => (j === i ? [e.target.value, r[1]] : r)))} />
                        <span aria-hidden="true">–</span>
                        <input type="time" aria-label={`${label} until`} value={end} step={300} onChange={(e) => setDay(key, ranges.map((r, j) => (j === i ? [r[0], e.target.value] : r)))} />
                        <button type="button" className="adm-icon-btn" aria-label={`Remove ${label} ${start}–${end}`} onClick={() => setDay(key, ranges.filter((_, j) => j !== i))}>
                          <Trash size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                  {on && (
                    <button
                      type="button"
                      className="adm-icon-btn"
                      aria-label={`Add hours on ${label}`}
                      onClick={() => setDay(key, [...ranges, [ranges[ranges.length - 1]?.[1] ?? "13:00", "17:00"] as Range])}
                    >
                      <Plus size={15} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {/* Reminders */}
        <section className="adm-card adm-section">
          <div className="adm-section-head">
            <h2>Reminders</h2>
            <p>Before every meeting you get a reminder email at both invitation addresses, so it pops up on your phone.</p>
          </div>
          <p className="adm-label" id="reminder-times">
            Remind me before each meeting
          </p>
          <div className="adm-reminders" role="group" aria-labelledby="reminder-times">
            {REMINDER_OPTIONS.map(([minutes, label]) => {
              const on = (values.reminder_minutes ?? []).includes(minutes);
              const full = !on && (values.reminder_minutes ?? []).length >= MAX_REMINDERS;
              return (
                <button
                  key={minutes}
                  type="button"
                  className={`adm-reminder${on ? " is-on" : ""}`}
                  aria-pressed={on}
                  disabled={full}
                  title={full ? `Up to ${MAX_REMINDERS} reminders` : undefined}
                  onClick={() =>
                    set(
                      "reminder_minutes",
                      on ? values.reminder_minutes.filter((m) => m !== minutes) : [...(values.reminder_minutes ?? []), minutes].sort((a, b) => b - a),
                    )
                  }
                >
                  {on ? <Check size={14} /> : <Clock size={14} />} {label}
                </button>
              );
            })}
          </div>
          <p className={`adm-help${errors.reminder_minutes ? " adm-error" : ""}`}>
            {errors.reminder_minutes ||
              ((values.reminder_minutes ?? []).length
                ? "Reminders are also added to the calendar invitation."
                : "No reminders: choose at least one time to be reminded.")}
          </p>
          <div className="adm-reminder-guest">{field("remind_guest", values.remind_guest, (v) => set("remind_guest", Boolean(v)))}</div>
          <div className="adm-reminder-tip">
            <p>
              <strong>Want a pop-up from the calendar as well?</strong> Google Calendar and Outlook use their own notification settings for
              invitations, so switch them on once:
            </p>
            <ul>
              <li>
                <a href="https://calendar.google.com/calendar/r/settings" target="_blank" rel="noreferrer">
                  Google Calendar <ArrowUpRight size={12} />
                </a>{" "}
                → your calendar under “Settings for my calendars” → <em>Event notifications</em> → add e.g. 1 day and 30 minutes.
              </li>
              <li>
                <a href="https://outlook.office.com/mail/options/calendar/eventsAndInvitations" target="_blank" rel="noreferrer">
                  Outlook <ArrowUpRight size={12} />
                </a>{" "}
                → Calendar → Events and invitations → <em>Default reminder</em> → e.g. 30 minutes.
              </li>
            </ul>
          </div>
        </section>

        {/* Rules */}
        <section className="adm-card adm-section">
          <div className="adm-section-head">
            <h2>Rules</h2>
            <p>Keep enough room around meetings and control how far ahead people can book.</p>
          </div>
          <div className="adm-grid">
            <div className="is-full">{field("is_enabled", values.is_enabled, (v) => set("is_enabled", Boolean(v)))}</div>
            <div>
              <FieldControl
                field={{ name: "timezone", label: "Your time zone", type: "select", options: timezoneOptions }}
                value={values.timezone}
                error={errors.timezone}
                onChange={(v) => set("timezone", String(v))}
              />
            </div>
            <div>
              <FieldControl
                field={{ name: "slot_step_minutes", label: "Start times offered", type: "select", options: STEP_OPTIONS }}
                value={String(values.slot_step_minutes)}
                error={errors.slot_step_minutes}
                onChange={(v) => set("slot_step_minutes", Number(v))}
              />
            </div>
            <div>{field("min_notice_hours", values.min_notice_hours, (v) => set("min_notice_hours", Number(v ?? 0)))}</div>
            <div>{field("max_days_ahead", values.max_days_ahead, (v) => set("max_days_ahead", Number(v ?? 0)))}</div>
            <div>{field("buffer_minutes", values.buffer_minutes, (v) => set("buffer_minutes", Number(v ?? 0)))}</div>
            <div>{field("daily_limit", values.daily_limit, (v) => set("daily_limit", Number(v ?? 0)))}</div>
          </div>
        </section>
      </form>

      <div className={`adm-savebar${dirty ? " is-dirty" : ""}`}>
        <span className="adm-savebar-status">{dirty ? "You have unsaved changes" : "All changes saved"}</span>
        <div className="adm-savebar-actions">
          <button type="button" className="button button-secondary button-sm" disabled={!dirty || busy} onClick={() => (setValues(saved), setErrors({}))}>
            Discard
          </button>
          <button type="submit" form="booking-settings" className="button button-primary button-sm" disabled={!dirty || busy}>
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
