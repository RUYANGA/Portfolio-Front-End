"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Eye } from "@/components/ui/Icons";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/admin-api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: form.get("username"), password: form.get("password") }),
      });
      if (res.ok) {
        const next = params.get("next");
        router.replace(next && next.startsWith("/admin") ? next : "/admin");
        router.refresh();
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(res.status === 429 ? "Too many sign-in attempts. Try again later." : data.detail || "Sign-in failed.");
    } catch {
      setError("The server is not reachable. Check that the backend is running.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="adm-login-form" onSubmit={submit}>
      {error && (
        <div className="adm-alert is-error" role="alert">
          {error}
        </div>
      )}
      <div className="adm-field">
        <label className="adm-label" htmlFor="username">
          Username
        </label>
        <input id="username" name="username" autoComplete="username" required autoFocus />
      </div>
      <div className="adm-field">
        <label className="adm-label" htmlFor="password">
          Password
        </label>
        <div className="adm-password">
          <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required />
          <button type="button" className="adm-icon-btn" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}>
            <Eye size={16} />
          </button>
        </div>
      </div>
      <button type="submit" className="button button-primary button-block" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
