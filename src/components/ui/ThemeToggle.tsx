"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Monitor, Moon, Sun } from "./Icons";

/** "system" follows the device setting (the default); light/dark are explicit choices. */
type Choice = "system" | "light" | "dark";

const OPTIONS: { value: Choice; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

const prefersDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

function savedChoice(): Choice {
  try {
    const t = localStorage.getItem("theme");
    if (t === "light" || t === "dark") return t;
  } catch {
    /* storage unavailable */
  }
  return "system";
}

function apply(choice: Choice) {
  const root = document.documentElement;
  if (choice === "system") delete root.dataset.theme;
  else root.dataset.theme = choice;
  try {
    if (choice === "system") localStorage.removeItem("theme");
    else localStorage.setItem("theme", choice);
  } catch {
    /* the choice still applies for this visit */
  }
}

export default function ThemeToggle() {
  const [choice, setChoice] = useState<Choice | null>(null);
  const [dark, setDark] = useState(false);
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const c = savedChoice();
    setChoice(c);
    setDark(c === "dark" || (c === "system" && prefersDark()));
    // While on "system", follow the device when it switches (e.g. automatic dark mode at night).
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (savedChoice() === "system") setDark(mq.matches);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Close on outside click or Escape.
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

  function pick(next: Choice) {
    apply(next);
    setChoice(next);
    setDark(next === "dark" || (next === "system" && prefersDark()));
    setOpen(false);
  }

  const Icon = choice === "system" ? Monitor : dark ? Moon : Sun;
  const current = OPTIONS.find((o) => o.value === choice)?.label ?? "System";

  return (
    <div className="theme-menu" ref={wrap}>
      <button
        type="button"
        className="icon-button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Theme: ${current}`}
        title={`Theme: ${current}`}
      >
        <Icon />
      </button>
      {open && (
        <div className="theme-menu-list" role="menu" aria-label="Theme">
          {OPTIONS.map(({ value, label, icon: OptionIcon }) => (
            <button
              key={value}
              type="button"
              role="menuitemradio"
              aria-checked={choice === value}
              className={`theme-menu-item${choice === value ? " is-active" : ""}`}
              onClick={() => pick(value)}
            >
              <OptionIcon size={16} />
              <span>{label}</span>
              {choice === value && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
