"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import type { BookingResult } from "@/lib/api/booking";
import { formatDay, formatTime, zoneOffset } from "@/lib/api/booking";

/** The visitor's booking, opened from the link in their confirmation email; lets them cancel it. */
export default function ManageBooking({ apiUrl, token, owner }: { apiUrl: string; token: string; owner: string }) {
  const api = `${apiUrl.replace(/\/$/, "")}/api/booking/manage/${encodeURIComponent(token)}/`;
  const [booking, setBooking] = useState<BookingResult | null>(null);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [tz, setTz] = useState("UTC");

  useEffect(() => {
    setTz(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
    fetch(api, { cache: "no-store" })
      .then(async (res) => {
        if (res.status === 404) throw new Error("This booking link isn't valid. Check the link in your email.");
        if (!res.ok) throw new Error("The booking couldn't be loaded. Please try again.");
        setBooking((await res.json()) as BookingResult);
      })
      .catch((e: Error) => setError(e.message));
  }, [api]);

  async function cancel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reason = String(new FormData(event.currentTarget).get("reason") || "");
    setCancelling(true);
    setError("");
    try {
      const res = await fetch(`${api}cancel/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "The booking couldn't be cancelled.");
      setBooking(data as BookingResult);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCancelling(false);
    }
  }

  if (error && !booking) {
    return (
      <div className="bk-manage">
        <h2>Booking not found</h2>
        <p className="bk-muted">{error}</p>
        <Link className="button button-primary" href="/book">
          Book a new time
        </Link>
      </div>
    );
  }
  if (!booking) return <div className="bk-manage bk-muted">Loading your booking…</div>;

  const start = new Date(booking.start);
  const end = new Date(booking.end);
  const cancelled = booking.status === "cancelled";
  return (
    <div className="bk-manage">
      <p className={`bk-status${cancelled ? " is-cancelled" : ""}`}>{cancelled ? "Cancelled" : "Confirmed"}</p>
      <h2>
        {booking.title} with {owner}
      </h2>
      <dl className="bk-done-details">
        <div>
          <dt>When</dt>
          <dd className={cancelled ? "bk-struck" : undefined}>
            {formatDay(start, tz)}
            <br />
            {formatTime(start, tz, false)} – {formatTime(end, tz, false)} ({zoneOffset(tz, start)})
          </dd>
        </div>
        <div>
          <dt>Booked by</dt>
          <dd>
            {booking.name} · {booking.email}
          </dd>
        </div>
        {!cancelled && booking.meeting_link && (
          <div>
            <dt>Where</dt>
            <dd>
              <a href={booking.meeting_link}>{booking.meeting_link.replace(/^https?:\/\//, "")}</a>
            </dd>
          </div>
        )}
      </dl>

      {cancelled ? (
        <>
          <p className="bk-muted">This meeting is cancelled and has been removed from both calendars.</p>
          <Link className="button button-primary" href="/book">
            Book another time
          </Link>
        </>
      ) : booking.can_cancel ? (
        <form className="form bk-cancel" onSubmit={cancel}>
          <div className="field">
            <label htmlFor="bk-reason">
              Reason for cancelling <span className="bk-optional">optional</span>
            </label>
            <textarea id="bk-reason" name="reason" maxLength={300} placeholder="Let me know if another time would work." />
          </div>
          {error && (
            <p className="form-status" role="alert">
              {error}
            </p>
          )}
          <div className="bk-cancel-actions">
            <button type="submit" className="button bk-danger" disabled={cancelling}>
              {cancelling ? "Cancelling…" : "Cancel meeting"}
            </button>
            <Link className="button button-secondary" href="/">
              Keep it
            </Link>
          </div>
        </form>
      ) : (
        <p className="bk-muted">This meeting has already started, so it can no longer be cancelled here. Reply to your invitation email instead.</p>
      )}
    </div>
  );
}
