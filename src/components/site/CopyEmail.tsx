"use client";

import { useState } from "react";
import { Check, Copy } from "@/components/ui/Icons";

export default function CopyEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      window.location.href = `mailto:${email}`;
    }
  }

  return (
    <span className="copy-email">
      <a href={`mailto:${email}`}>{email}</a>
      <button
        type="button"
        className={`copy-button${copied ? " is-copied" : ""}`}
        onClick={copy}
        aria-label={copied ? "Email address copied" : "Copy email address"}
        title={copied ? "Copied" : "Copy"}
      >
        {copied ? <Check size={15} /> : <Copy size={15} />}
      </button>
      <span className={`copy-tooltip${copied ? " is-shown" : ""}`} aria-hidden="true">
        Copied to clipboard
      </span>
      <span className="visually-hidden" aria-live="polite">
        {copied ? "Email address copied" : ""}
      </span>
    </span>
  );
}
