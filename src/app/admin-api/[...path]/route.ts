/**
 * Proxy from the admin dashboard to Django's /api/admin/.
 * - Adds the token from the httpOnly session cookie, so it never reaches the browser.
 * - Handles sign-in (sets the cookie) and sign-out (clears it).
 * - After any successful change, refreshes the public site so edits show immediately.
 */
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { DJANGO_URL, SESSION_COOKIE } from "@/lib/admin/session";

export const dynamic = "force-dynamic";

type Ctx = { params: { path: string[] } };

const MUTATIONS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function djangoUrl(path: string[], search: string) {
  return `${DJANGO_URL}/api/admin/${path.map(encodeURIComponent).join("/")}/${search}`;
}

function relay(res: Response, body: ArrayBuffer | null) {
  const headers = new Headers();
  const type = res.headers.get("content-type");
  if (type) headers.set("content-type", type);
  return new NextResponse(res.status === 204 ? null : body, { status: res.status, headers });
}

async function signIn(req: NextRequest) {
  const res = await fetch(djangoUrl(["auth", "login"], ""), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: await req.text(),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json(data, { status: res.status });

  const response = NextResponse.json({ user: data.user });
  response.cookies.set(SESSION_COOKIE, data.token, {
    httpOnly: true,
    sameSite: "lax",
    // Secure (HTTPS-only) in production. ADMIN_COOKIE_SECURE=false allows plain-HTTP testing on a server.
    secure: process.env.ADMIN_COOKIE_SECURE ? process.env.ADMIN_COOKIE_SECURE === "true" : process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Number(data.expires_in) || 60 * 60 * 24 * 7,
  });
  return response;
}

async function handle(req: NextRequest, { params }: Ctx) {
  const path = params.path;
  if (req.method === "POST" && path.join("/") === "auth/login") return signIn(req);

  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ detail: "Not signed in." }, { status: 401 });

  const headers: Record<string, string> = { Authorization: `Token ${token}`, Accept: "application/json" };
  const type = req.headers.get("content-type");
  if (type) headers["Content-Type"] = type; // keeps the multipart boundary intact

  let res: Response;
  try {
    res = await fetch(djangoUrl(path, req.nextUrl.search), {
      method: req.method,
      headers,
      body: MUTATIONS.has(req.method) ? await req.arrayBuffer() : undefined,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ detail: "The API is not reachable. Check that the backend is running." }, { status: 502 });
  }

  const body = res.status === 204 ? null : await res.arrayBuffer();
  const response = relay(res, body);

  const signingOut = path.join("/") === "auth/logout";
  if (res.status === 401 || signingOut) response.cookies.delete(SESSION_COOKIE);
  if (MUTATIONS.has(req.method) && res.ok && !signingOut) revalidatePath("/", "layout");
  return response;
}

export { handle as GET, handle as POST, handle as PATCH, handle as PUT, handle as DELETE };
