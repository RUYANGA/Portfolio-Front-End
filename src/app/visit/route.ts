/**
 * Visitor analytics relay: the browser posts here, and this server adds what only it knows
 * (the visitor's IP, browser and the country/city Vercel derives from the IP), then forwards
 * it to Django with the shared ANALYTICS_KEY. The IP is only used there to build an anonymous
 * daily hash and is never stored.
 */
import { NextRequest, NextResponse } from "next/server";
import { DJANGO_URL, SESSION_COOKIE } from "@/lib/admin/session";

export const dynamic = "force-dynamic";

const FIELDS = [
  "type",
  "name",
  "target",
  "path",
  "referrer",
  "source",
  "language",
  "session",
  "id",
  "seconds",
  "scroll",
  "returning",
] as const;

function decode(value: string | null) {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function POST(req: NextRequest) {
  const key = process.env.ANALYTICS_KEY;
  const skip = new NextResponse(null, { status: 204 });
  if (!key && process.env.NODE_ENV === "production") return skip;
  if (req.cookies.get(SESSION_COOKIE)) return skip; // the owner's own visits (signed in to the dashboard)

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ detail: "Invalid body." }, { status: 400 });

  const h = req.headers;
  const payload: Record<string, unknown> = {
    ua: h.get("user-agent") ?? "",
    ip: (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "").trim(),
    country: h.get("x-vercel-ip-country") || h.get("cf-ipcountry") || "",
    region: decode(h.get("x-vercel-ip-country-region")),
    city: decode(h.get("x-vercel-ip-city")),
  };
  for (const field of FIELDS) if (field in body) payload[field] = (body as Record<string, unknown>)[field];

  try {
    const res = await fetch(`${DJANGO_URL}/api/analytics/collect/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", ...(key ? { "X-Analytics-Key": key } : {}) },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const data = res.status === 201 ? await res.json().catch(() => ({})) : {};
    return NextResponse.json({ id: data.id ?? null });
  } catch {
    return NextResponse.json({ id: null }); // analytics must never break the site
  }
}
