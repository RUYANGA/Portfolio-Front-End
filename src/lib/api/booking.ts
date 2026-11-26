/** Meeting booking: types and helpers shared by the /book pages. */

export type MeetingType = { slug: string; title: string; duration_minutes: number; description: string };

export type BookingInfo = {
  enabled: boolean;
  timezone: string;
  max_days_ahead: number;
  min_notice_hours: number;
  meeting_types: MeetingType[];
};

export type BookingResult = {
  title: string;
  start: string;
  end: string;
  name: string;
  email: string;
  status: "confirmed" | "cancelled";
  visitor_timezone: string;
  meeting_link: string;
  can_cancel: boolean;
  manage_token: string;
};

const SERVER_API = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

/** Booking rules and meeting types, fetched on the server. `null` if the API can't be reached. */
export async function getBookingInfo(): Promise<BookingInfo | null> {
  try {
    const res = await fetch(`${SERVER_API}/api/booking/`, { next: { revalidate: 60 }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    return (await res.json()) as BookingInfo;
  } catch {
    return null;
  }
}

/** "2026-12-01" for an instant, as seen in `timeZone`. */
export function dayKey(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function formatTime(date: Date, timeZone: string, hour12: boolean) {
  return new Intl.DateTimeFormat(undefined, { timeZone, hour: "numeric", minute: "2-digit", hour12 }).format(date);
}

export function formatDay(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat(undefined, { timeZone, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date);
}

/** "GMT+2" style label for a time zone at a given instant. */
export function zoneOffset(timeZone: string, at = new Date()) {
  const part = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "shortOffset" })
    .formatToParts(at)
    .find((p) => p.type === "timeZoneName");
  return part?.value.replace("GMT", "UTC") || "";
}

/** Google and Outlook "add to calendar" links, for the confirmation screen. */
export function calendarLinks(title: string, start: Date, end: Date, details: string, location: string) {
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const google = new URL("https://calendar.google.com/calendar/render");
  google.search = new URLSearchParams({ action: "TEMPLATE", text: title, dates: `${stamp(start)}/${stamp(end)}`, details, location }).toString();
  const outlook = new URL("https://outlook.live.com/calendar/0/deeplink/compose");
  outlook.search = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: title,
    startdt: start.toISOString(),
    enddt: end.toISOString(),
    body: details,
    location,
  }).toString();
  return { google: google.toString(), outlook: outlook.toString() };
}
