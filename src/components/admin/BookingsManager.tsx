"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import { AlertCircle, Mail, Settings, XIcon } from "@/components/ui/Icons";
import { adminFetch, ApiError } from "@/lib/admin/client";
import { useFeedback } from "./Feedback";

type Booking = {
  id: number;
  title: string;
  start: string;
  end: string;
  name: string;
  email: string;
  company: string;
  notes: string;
  visitor_timezone: string;
  status: "confirmed" | "cancelled";
  cancelled_at: string | null;
  cancel_reason: string;
  meeting_link: string;
  meeting_provider: string;
  created_at: string;
};
type Period = "upcoming" | "past" | "cancelled";
type Feed = { label: string; ok: boolean | null; error: string };

const PERIODS: [Period, string][] = [
  ["upcoming", "Upcoming"],
  ["past", "Past"],
  ["cancelled", "Cancelled"],
];

const dayLabel = (iso: string, timeZone: string) => {
  const date = new Date(iso);
  const key = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone }).format(d);
  const today = key(new Date());
  const tomorrow = key(new Date(Date.now() + 864e5));
  const label = new Intl.DateTimeFormat(undefined, { timeZone, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date);
  return key(date) === today ? `Today · ${label}` : key(date) === tomorrow ? `Tomorrow · ${label}` : label;
};

const time = (iso: string, timeZone: string) =>
  new Intl.DateTimeFormat(undefined, { timeZone, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

/** Meetings visitors booked: grouped by day, with the guest's details and cancelling. */
export default function BookingsManager() {
  const { toast } = useFeedback();
  const [period, setPeriod] = useState<Period>("upcoming");
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState("");
  const [timeZone, setTimeZone] = useState("Africa/Kigali");
  const [failing, setFailing] = useState<Feed[]>([]);
  const [cancelling, setCancelling] = useState<Booking | null>(null);
  const [deleting, setDeleting] = useState<Booking | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    adminFetch<{ timezone: string; calendars?: { feeds: Feed[] } }>("booking/settings/")
      .then((s) => {
        setTimeZone(s.timezone);
        setFailing((s.calendars?.feeds ?? []).filter((f) => f.ok === false));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let active = true;
    let first = true;
    const load = async () => {
      if (document.visibilityState !== "visible" && !first) return;
      try {
        const data = await adminFetch<Booking[]>(`booking/bookings/?when=${period}`);
        if (!active) return;
        setBookings(data);
        setError("");
      } catch (e) {
        if (active) setError((e as ApiError).message);
      } finally {
        first = false;
      }
    };
    setBookings(null);
    load();
    const id = window.setInterval(load, 15000);
    window.addEventListener("focus", load);
    document.addEventListener("visibilitychange", load);
    return () => {
      active = false;
      window.clearInterval(id);
      window.removeEventListener("focus", load);
      document.removeEventListener("visibilitychange", load);
    };
  }, [period]);

  const groups = useMemo(() => {
    const byDay = new Map<string, Booking[]>();
    for (const b of bookings ?? []) {
      const label = dayLabel(b.start, timeZone);
      byDay.set(label, [...(byDay.get(label) ?? []), b]);
    }
    return [...byDay.entries()];
  }, [bookings, timeZone]);

  async function cancel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cancelling) return;
    const reason = String(new FormData(event.currentTarget).get("reason") || "");
    setBusy(true);
    try {
      await adminFetch(`booking/bookings/${cancelling.id}/cancel/`, { method: "POST", body: { reason } });
      setBookings((list) => list?.filter((b) => b.id !== cancelling.id) ?? null);
      toast(`Cancelled. ${cancelling.name} and your calendars have been updated.`);
      setCancelling(null);
    } catch (e) {
      toast((e as ApiError).message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await adminFetch(`booking/bookings/${deleting.id}/`, { method: "DELETE" });
      setBookings((list) => list?.filter((b) => b.id !== deleting.id) ?? null);
      toast("Booking deleted.");
      setDeleting(null);
    } catch (e) {
      toast((e as ApiError).message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="adm-page-head">
        <div>
          <h1>Bookings</h1>
          <p>Meetings visitors booked through your booking page. Times are in {timeZone.replace(/_/g, " ")}.</p>
        </div>
        <div className="adm-page-actions">
          <div className="adm-segmented" role="tablist">
            {PERIODS.map(([key, label]) => (
              <button key={key} type="button" role="tab" aria-selected={period === key} onClick={() => setPeriod(key)}>
                {label}
              </button>
            ))}
          </div>
          <Link className="button button-secondary button-sm" href="/admin/booking-settings">
            <Settings size={15} /> Settings
          </Link>
        </div>
      </header>

      {failing.length > 0 && (
        <div className="adm-alert is-error">
          <strong>{failing.map((f) => f.label).join(" and ")} can&apos;t be read,</strong> so no times are offered until it works again.{" "}
          <Link href="/admin/booking-settings">Check the calendars</Link>.
        </div>
      )}
      {error && <div className="adm-alert is-error">{error}</div>}

      {!bookings && !error && <div className="adm-card adm-loading">Loading…</div>}
      {bookings && bookings.length === 0 && (
        <div className="adm-card adm-bk-empty">
          <AlertCircle size={28} />
          <p>{period === "upcoming" ? "No upcoming meetings." : period === "past" ? "No past meetings yet." : "No cancelled meetings."}</p>
          {period === "upcoming" && (
            <Link className="button button-secondary button-sm" href="/book" target="_blank">
              Open the booking page
            </Link>
          )}
        </div>
      )}

      {groups.map(([day, list]) => (
        <section key={day} className="adm-bk-day">
          <h2>{day}</h2>
          <ul className="adm-card adm-bk-list">
            {list.map((b) => (
              <li key={b.id} className={`adm-bk${b.status === "cancelled" ? " is-cancelled" : ""}`}>
                <div className="adm-bk-time">
                  <strong>{time(b.start, timeZone)}</strong>
                  <span>{time(b.end, timeZone)}</span>
                </div>
                <div className="adm-bk-body">
                  <p className="adm-bk-title">
                    <strong>{b.name}</strong>
                    <span className="adm-badge">{b.title}</span>
                  </p>
                  {b.company && <p className="adm-bk-company">{b.company}</p>}
                  <p className="adm-bk-meta">
                    <a href={`mailto:${b.email}`}>{b.email}</a>
                    {b.visitor_timezone && <span> · their time {time(b.start, b.visitor_timezone)} ({b.visitor_timezone.replace(/_/g, " ")})</span>}
                  </p>
                  {b.notes && <p className="adm-bk-notes">{b.notes}</p>}
                  {b.status === "cancelled" && (
                    <p className="adm-bk-meta">
                      Cancelled{b.cancel_reason ? `: ${b.cancel_reason}` : ""}
                    </p>
                  )}
                </div>
                <div className="adm-bk-actions">
                  {b.meeting_link && b.status === "confirmed" && (
                    <a className="button button-primary button-sm" href={b.meeting_link} target="_blank" rel="noreferrer">
                      Join call
                    </a>
                  )}
                  <a className="button button-secondary button-sm" href={`mailto:${b.email}?subject=${encodeURIComponent(`${b.title}`)}`}>
                    <Mail size={15} /> Email
                  </a>
                  {period === "upcoming" && (
                    <button type="button" className="button button-secondary button-sm adm-text-danger" onClick={() => setCancelling(b)}>
                      <XIcon size={15} /> Cancel
                    </button>
                  )}
                  {period !== "upcoming" && (
                    <button type="button" className="button button-secondary button-sm adm-text-danger" onClick={() => setDeleting(b)}>
                      Delete
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <Modal
        open={cancelling !== null}
        onClose={() => setCancelling(null)}
        title={cancelling ? `Cancel the meeting with ${cancelling.name}?` : ""}
        description="They get a cancellation email, and the event is removed from their calendar and yours."
        footer={
          <>
            <button type="button" className="button button-secondary button-sm" onClick={() => setCancelling(null)}>
              Keep it
            </button>
            <button type="submit" form="bk-cancel" className="button adm-button-danger button-sm" disabled={busy}>
              {busy ? "Cancelling…" : "Cancel meeting"}
            </button>
          </>
        }
      >
        <form id="bk-cancel" onSubmit={cancel} className="adm-field">
          <label className="adm-label" htmlFor="bk-cancel-reason">
            Message to {cancelling?.name.split(" ")[0]} <span className="adm-help">(optional)</span>
          </label>
          <textarea id="bk-cancel-reason" name="reason" rows={3} maxLength={300} placeholder="Sorry, something came up. Could we find another time?" />
        </form>
      </Modal>

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={deleting ? `Delete this booking with ${deleting.name}?` : ""}
        description="This removes the booking record from the dashboard. It does not send an email."
        footer={
          <>
            <button type="button" className="button button-secondary button-sm" onClick={() => setDeleting(null)}>
              Keep it
            </button>
            <button type="button" className="button adm-button-danger button-sm" disabled={busy} onClick={remove}>
              {busy ? "Deleting…" : "Delete booking"}
            </button>
          </>
        }
      >
        <p className="adm-help">Use this for cancelled or expired meetings you no longer need to keep.</p>
      </Modal>
    </>
  );
}
