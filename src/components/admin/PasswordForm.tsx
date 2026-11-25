"use client";

import { useState } from "react";
import { adminFetch, ApiError } from "@/lib/admin/client";
import { useFeedback } from "./Feedback";

export default function PasswordForm() {
  const { toast } = useFeedback();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const next = String(form.get("new_password"));
    if (next !== form.get("confirm_password")) {
      setErrors({ confirm_password: "The two passwords don't match." });
      return;
    }
    setBusy(true);
    setErrors({});
    try {
      await adminFetch("auth/password/", { method: "POST", body: { current_password: form.get("current_password"), new_password: next } });
      formEl.reset();
      toast("Password changed.");
    } catch (err) {
      const apiErr = err as ApiError;
      setErrors(apiErr.fields);
      toast(apiErr.message, "error");
    } finally {
      setBusy(false);
    }
  }

  const field = (name: string, label: string, auto: string, help?: string) => (
    <div className="adm-field">
      <label className="adm-label" htmlFor={name}>
        {label}
      </label>
      <input id={name} name={name} type="password" autoComplete={auto} required aria-invalid={errors[name] ? true : undefined} />
      {help && <span className="adm-help">{help}</span>}
      {errors[name] && <span className="adm-error">{errors[name]}</span>}
    </div>
  );

  return (
    <form className="adm-card adm-section adm-narrow" onSubmit={submit}>
      <header className="adm-section-head">
        <h2>Change password</h2>
        <p>You stay signed in on this device.</p>
      </header>
      <div className="adm-stack">
        {field("current_password", "Current password", "current-password")}
        {field("new_password", "New password", "new-password", "At least 10 characters.")}
        {field("confirm_password", "Repeat new password", "new-password")}
        <div>
          <button type="submit" className="button button-primary button-sm" disabled={busy}>
            {busy ? "Saving…" : "Change password"}
          </button>
        </div>
      </div>
    </form>
  );
}
