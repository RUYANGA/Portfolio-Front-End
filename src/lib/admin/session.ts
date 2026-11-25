import "server-only";
import { cookies } from "next/headers";

/** httpOnly cookie holding the Django admin token. Browser JavaScript can never read it. */
export const SESSION_COOKIE = "pf_admin";

export const DJANGO_URL = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

export function getToken(): string | undefined {
  return cookies().get(SESSION_COOKIE)?.value;
}

export type AdminUser = { username: string; email: string; name: string };

/** Server-side call to the Django admin API with the signed-in user's token. */
export async function djangoAdmin(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const url = `${DJANGO_URL}/api/admin/${path.replace(/^\//, "")}`;
  return fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Token ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
}

/** The signed-in admin, or null when the session is missing, expired or revoked. */
export async function currentAdmin(): Promise<AdminUser | null> {
  if (!getToken()) return null;
  try {
    const res = await djangoAdmin("auth/me/");
    return res.ok ? ((await res.json()) as AdminUser) : null;
  } catch {
    return null;
  }
}
