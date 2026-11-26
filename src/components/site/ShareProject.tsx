"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "@/components/ui/Icons";
import { ShareIcon, copyText, shareTargets } from "./ShareButtons";

type Props = { url?: string; title: string; text?: string };

/**
 * "Share" button for the project page header. One click copies the project's link and opens a small
 * panel with the link and one-tap sharing (LinkedIn, X, WhatsApp, Facebook, email, or the phone's
 * share sheet).
 */
export default function ShareProject({ url, title, text }: Props) {
  const [link, setLink] = useState(url ?? "");
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!url) setLink(window.location.href.split("#")[0]);
    setCanShare(typeof navigator.share === "function");
  }, [url]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => wrap.current && !wrap.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    await copyText(link);
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2500);
  }

  async function onClick() {
    if (open) return setOpen(false);
    await copy();
    setOpen(true);
  }

  return (
    <div className="share-project" ref={wrap}>
      <button
        type="button"
        className={`button button-secondary share-project-btn${copied ? " is-copied" : ""}`}
        onClick={onClick}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        {copied ? <Check size={16} /> : <ShareIcon />}
        {copied ? "Link copied" : "Share project"}
      </button>
      <span className="visually-hidden" aria-live="polite">
        {copied ? "Project link copied to the clipboard" : ""}
      </span>

      {open && (
        <div className="share-pop" role="dialog" aria-label="Share this project">
          <p className="share-pop-title">
            <Check size={15} /> Link copied. Paste it anywhere, or share it directly:
          </p>
          <div className="share-pop-link">
            <input value={link} readOnly aria-label="Project link" onFocus={(e) => e.currentTarget.select()} />
            <button type="button" onClick={copy} aria-label="Copy link again" title="Copy">
              {copied ? <Check size={15} /> : <Copy size={15} />}
            </button>
          </div>
          <div className="share-pop-targets">
            {shareTargets(link, title, text).map((t) => (
              <a key={t.label} href={t.href} target={t.label === "Email" ? undefined : "_blank"} rel="noopener noreferrer" className="share-pop-target">
                <span className="share-pop-icon">{t.icon}</span>
                {t.label}
              </a>
            ))}
            {canShare && (
              <button type="button" className="share-pop-target" onClick={() => navigator.share({ title, text: text || title, url: link }).catch(() => undefined)}>
                <span className="share-pop-icon">
                  <ShareIcon />
                </span>
                More…
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
