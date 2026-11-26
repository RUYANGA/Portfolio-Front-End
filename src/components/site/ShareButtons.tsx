"use client";

import { useEffect, useState } from "react";
import { Check, Copy, LinkedIn, Mail } from "@/components/ui/Icons";

type Props = {
  /** Absolute URL to share; defaults to the current page. */
  url?: string;
  title: string;
  /** Short line that goes with the link (X, WhatsApp, email). */
  text?: string;
  heading?: string;
  compact?: boolean;
};

const svg = (d: string) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
    <path d={d} />
  </svg>
);

const XLogo = () => svg("M18.9 2H22l-7.4 8.5L23.3 22h-6.8l-5.3-6.9L5 22H1.9l7.9-9.1L1.5 2h7l4.8 6.3L18.9 2zm-1.2 18h1.9L7.4 3.9H5.4L17.7 20z");
const WhatsAppLogo = () =>
  svg(
    "M17.5 14.4c-.3-.1-1.8-.9-2-1s-.5-.1-.7.1-.8 1-1 1.2-.4.2-.7.1a8.2 8.2 0 0 1-4.1-3.6c-.3-.5.3-.5.9-1.6.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.6 3.6 0 0 0-1.1 2.7 6.3 6.3 0 0 0 1.3 3.3 14.4 14.4 0 0 0 5.5 4.9c2 .9 2.8 1 3.8.8a3.2 3.2 0 0 0 2.1-1.5 2.6 2.6 0 0 0 .2-1.5c-.1-.1-.3-.2-.6-.3zM12 21.8a9.8 9.8 0 0 1-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 1 1 12 21.8zM12 0a11.9 11.9 0 0 0-10.3 17.9L0 24l6.3-1.6A11.9 11.9 0 1 0 12 0z",
  );
const FacebookLogo = () => svg("M24 12a12 12 0 1 0-13.9 11.9v-8.4h-3V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z");
const ShareIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13" />
  </svg>
);

/** Share the page on LinkedIn, X, WhatsApp, Facebook or by email, copy the link, or use the phone's share sheet. */
export default function ShareButtons({ url, title, text, heading = "Share", compact = false }: Props) {
  const [link, setLink] = useState(url ?? "");
  const [canShare, setCanShare] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!url) setLink(window.location.href.split("#")[0]);
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, [url]);

  const message = text ? `${title}: ${text}` : title;
  const enc = encodeURIComponent;
  const targets = [
    { label: "LinkedIn", icon: <LinkedIn size={16} />, href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(link)}` },
    { label: "X", icon: <XLogo />, href: `https://twitter.com/intent/tweet?text=${enc(message)}&url=${enc(link)}` },
    { label: "WhatsApp", icon: <WhatsAppLogo />, href: `https://wa.me/?text=${enc(`${message} ${link}`)}` },
    { label: "Facebook", icon: <FacebookLogo />, href: `https://www.facebook.com/sharer/sharer.php?u=${enc(link)}` },
    { label: "Email", icon: <Mail size={16} />, href: `mailto:?subject=${enc(title)}&body=${enc(`${message}\n\n${link}`)}` },
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const input = document.createElement("textarea");
      input.value = link;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function nativeShare() {
    try {
      await navigator.share({ title, text: text || title, url: link });
    } catch {
      /* dismissed */
    }
  }

  return (
    <div className={`share${compact ? " share-compact" : ""}`}>
      <p className="share-heading">{heading}</p>
      <div className="share-actions">
        {canShare && (
          <button type="button" className="share-btn share-native" onClick={nativeShare} aria-label="Share…" title="Share…">
            <ShareIcon />
            {!compact && <span>Share</span>}
          </button>
        )}
        {targets.map((t) => (
          <a
            key={t.label}
            className="share-btn"
            href={link ? t.href : undefined}
            target={t.label === "Email" ? undefined : "_blank"}
            rel="noopener noreferrer"
            aria-label={`Share on ${t.label}`}
            title={`Share on ${t.label}`}
          >
            {t.icon}
          </a>
        ))}
        <button type="button" className={`share-btn share-copy${copied ? " is-copied" : ""}`} onClick={copy} aria-label="Copy link" title="Copy link">
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {!compact && <span aria-live="polite">{copied ? "Copied" : "Copy link"}</span>}
        </button>
      </div>
    </div>
  );
}
