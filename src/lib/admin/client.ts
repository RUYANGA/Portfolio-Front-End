"use client";

import type { Field } from "./resources";

/** Error from the admin API, with per-field messages when Django sent validation errors. */
export class ApiError extends Error {
  status: number;
  fields: Record<string, string>;
  constructor(status: number, message: string, fields: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

function parseErrors(status: number, data: unknown): ApiError {
  if (data && typeof data === "object") {
    const fields: Record<string, string> = {};
    let message = "";
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const text = Array.isArray(value) ? value.join(" ") : String(value);
      if (key === "detail" || key === "non_field_errors") message = text;
      else fields[key] = text;
    }
    if (!message) message = Object.keys(fields).length ? "Some fields need attention." : `Request failed (${status}).`;
    return new ApiError(status, message, fields);
  }
  return new ApiError(status, `Request failed (${status}).`);
}

/** Call the Django admin API through the Next.js proxy (which adds the session token). */
export async function adminFetch<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const { method = "GET", body } = options;
  const init: RequestInit = { method, headers: { Accept: "application/json" }, cache: "no-store" };
  if (body instanceof FormData) init.body = body;
  else if (body !== undefined) {
    init.body = JSON.stringify(body);
    (init.headers as Record<string, string>)["Content-Type"] = "application/json";
  }

  const res = await fetch(`/admin-api/${path.replace(/^\/|\/$/g, "")}`, init);
  if (res.status === 401) {
    window.dispatchEvent(new Event("admin:session-expired")); // the dashboard shows a sign-in dialog
    throw new ApiError(401, "Your session ended. Sign in again.");
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw parseErrors(res.status, data);
  return data as T;
}

export type FormValues = Record<string, unknown>;

/**
 * Build the request body for a save. Uses JSON unless a file changed, then multipart.
 * File fields: a File uploads, null removes, an unchanged URL string is left out.
 */
export function buildBody(values: FormValues, original: FormValues, fields: Field[]): FormData | FormValues {
  const fileFields = fields.filter((f) => f.type === "image" || f.type === "file");
  const fileChanged = fileFields.some((f) => values[f.name] instanceof File);

  const payload: FormValues = {};
  for (const field of fields) {
    const value = values[field.name];
    if (field.type === "image" || field.type === "file") {
      if (value instanceof File) payload[field.name] = value;
      else if (value === null && original[field.name]) payload[field.name] = null;
      continue;
    }
    if (field.type === "number") payload[field.name] = value === "" || value === undefined ? null : Number(value);
    else payload[field.name] = value ?? (field.type === "checkbox" ? false : field.type === "tags" || field.type === "lines" ? [] : "");
  }

  if (!fileChanged) return payload;

  const form = new FormData();
  for (const [key, value] of Object.entries(payload)) {
    if (value instanceof File) form.append(key, value);
    else if (value === null) form.append(key, "");
    else if (Array.isArray(value)) form.append(key, JSON.stringify(value));
    else form.append(key, String(value));
  }
  return form;
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}
