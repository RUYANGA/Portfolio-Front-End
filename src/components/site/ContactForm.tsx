"use client";

import { FormEvent, useState } from "react";

type Errors = Partial<Record<"name" | "email" | "subject" | "message" | "form", string>>;

export default function ContactForm({ apiUrl, email, subjects = [] }: { apiUrl: string; email: string; subjects?: string[] }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    setSending(true);
    setErrors({});

    try {
      const res = await fetch(`${apiUrl.replace(/\/$/, "")}/api/contact/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        form.reset();
        setSent(true);
        return;
      }
      if (res.status === 429) {
        setErrors({ form: `Too many messages from this connection. Email me directly at ${email}.` });
        return;
      }
      const data = (await res.json().catch(() => ({}))) as Record<string, string[] | string>;
      const next: Errors = {};
      for (const [key, value] of Object.entries(data)) {
        const text = Array.isArray(value) ? value.join(" ") : String(value);
        if (key in { name: 1, email: 1, subject: 1, message: 1 }) next[key as keyof Errors] = text;
        else next.form = text;
      }
      setErrors(Object.keys(next).length ? next : { form: "The message wasn't sent. Check the fields and try again." });
    } catch {
      setErrors({ form: `The message couldn't reach the server. Email me directly at ${email}.` });
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="form success" role="status">
        <svg className="success-check" viewBox="0 0 52 52" aria-hidden="true">
          <circle cx="26" cy="26" r="24" />
          <path d="M15 27l7 7 15-16" />
        </svg>
        <p className="form-status" data-tone="success">
          Message sent. I'll reply to the email address you gave, usually within two working days.
        </p>
        <button type="button" className="button button-quiet" onClick={() => setSent(false)}>
          Write another message
        </button>
      </div>
    );
  }

  return (
    <form className="form" onSubmit={onSubmit} noValidate={false}>
      <div className="form-head">
        <h3>Send a message</h3>
        <p>All fields are required.</p>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="name">Name</label>
          <input id="name" name="name" autoComplete="name" required maxLength={120}
            aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-error" : undefined} />
          {errors.name && <span id="name-error" className="field-error">{errors.name}</span>}
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required
            aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} />
          {errors.email && <span id="email-error" className="field-error">{errors.email}</span>}
        </div>
      </div>
      <div className="field">
        <label htmlFor="subject">Subject</label>
        {subjects.length ? (
          <select id="subject" name="subject" required defaultValue=""
            aria-invalid={!!errors.subject} aria-describedby={errors.subject ? "subject-error" : undefined}>
            <option value="" disabled>
              Choose a subject
            </option>
            {subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        ) : (
          <input id="subject" name="subject" maxLength={160} placeholder="e.g. Backend role, project idea" />
        )}
        {errors.subject && <span id="subject-error" className="field-error">{errors.subject}</span>}
      </div>
      <div className="field">
        <label htmlFor="message">Message</label>
        <textarea id="message" name="message" required minLength={10} maxLength={5000}
          aria-invalid={!!errors.message} aria-describedby={errors.message ? "message-error" : undefined} />
        {errors.message && <span id="message-error" className="field-error">{errors.message}</span>}
      </div>
      <div className="honeypot" aria-hidden="true">
        <label htmlFor="website">Leave this empty</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {errors.form && <p className="form-status" role="alert">{errors.form}</p>}
      <div>
        <button type="submit" className="button button-primary" disabled={sending}>
          {sending ? "Sending…" : "Send message"}
          {!sending && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          )}
        </button>
      </div>
    </form>
  );
}
