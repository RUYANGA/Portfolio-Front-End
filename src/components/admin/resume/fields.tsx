"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash } from "@/components/ui/Icons";

/** Labelled single-line input. */
export function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  wide = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  wide?: boolean;
}) {
  const id = useId();
  return (
    <div className={`adm-field${wide ? " is-full" : ""}`}>
      <label className="adm-label" htmlFor={id}>
        {label}
      </label>
      <input id={id} type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/** Textarea that grows with its content. */
export function GrowingText({
  value,
  onChange,
  onKeyDown,
  placeholder,
  ariaLabel,
  id,
  rows = 1,
  inputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  ariaLabel?: string;
  id?: string;
  rows?: number;
  inputRef?: (el: HTMLTextAreaElement | null) => void;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);
  return (
    <textarea
      id={id}
      ref={(el) => {
        ref.current = el;
        inputRef?.(el);
      }}
      className="cv-grow"
      rows={rows}
      value={value}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
    />
  );
}

/**
 * Bullet points: Enter adds a bullet below, Backspace on an empty bullet removes it, and
 * pasting several lines creates one bullet per line.
 */
export function Bullets({ items, onChange, label = "Bullet points", placeholder }: { items: string[]; onChange: (v: string[]) => void; label?: string; placeholder?: string }) {
  const refs = useRef<(HTMLTextAreaElement | null)[]>([]);
  const [focus, setFocus] = useState<number | null>(null);
  const list = items.length ? items : [""];

  useEffect(() => {
    if (focus === null) return;
    const el = refs.current[focus];
    if (el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
    setFocus(null);
  }, [focus]);

  const set = (i: number, value: string) => {
    const lines = value.split("\n");
    if (lines.length > 1) {
      // Pasted or typed several lines: one bullet each.
      const next = [...list.slice(0, i), ...lines.map((l) => l.replace(/^\s*[•\-*]\s*/, "")), ...list.slice(i + 1)];
      onChange(next);
      setFocus(i + lines.length - 1);
      return;
    }
    onChange(list.map((v, j) => (j === i ? value : v)));
  };
  const remove = (i: number) => {
    const next = list.filter((_, j) => j !== i);
    onChange(next.length ? next : [""]);
    setFocus(Math.max(0, i - 1));
  };
  const move = (i: number, by: number) => {
    const j = i + by;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
    setFocus(j);
  };
  const onKey = (i: number) => (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onChange([...list.slice(0, i + 1), "", ...list.slice(i + 1)]);
      setFocus(i + 1);
    } else if (e.key === "Backspace" && !list[i] && list.length > 1) {
      e.preventDefault();
      remove(i);
    } else if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      e.preventDefault();
      move(i, e.key === "ArrowUp" ? -1 : 1);
    }
  };

  return (
    <div className="cv-bullets" role="group" aria-label={label}>
      {list.map((item, i) => (
        <div key={i} className="cv-bullet">
          <span className="cv-bullet-dot" aria-hidden="true">
            •
          </span>
          <GrowingText
            value={item}
            onChange={(v) => set(i, v)}
            onKeyDown={onKey(i)}
            placeholder={i === 0 ? placeholder : undefined}
            ariaLabel={`${label} ${i + 1}`}
            inputRef={(el) => (refs.current[i] = el)}
          />
          <span className="cv-bullet-tools">
            <button type="button" className="adm-icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move bullet up" title="Move up (Alt+↑)">
              <ChevronUp size={14} />
            </button>
            <button type="button" className="adm-icon-btn" onClick={() => move(i, 1)} disabled={i === list.length - 1} aria-label="Move bullet down" title="Move down (Alt+↓)">
              <ChevronDown size={14} />
            </button>
            <button type="button" className="adm-icon-btn is-danger" onClick={() => remove(i)} aria-label="Remove bullet" title="Remove">
              <Trash size={14} />
            </button>
          </span>
        </div>
      ))}
      <button type="button" className="cv-add-line" onClick={() => {
          onChange([...list, ""]);
          setFocus(list.length);
        }}>
        <Plus size={14} /> Add bullet
      </button>
      <p className="adm-help">Enter adds a bullet, Backspace on an empty one removes it. Pasting several lines makes several bullets.</p>
    </div>
  );
}

/** A list of entries (jobs, projects…), each collapsible, reorderable and removable. */
export function Entries<T>({
  items,
  onChange,
  make,
  summary,
  addLabel,
  render,
}: {
  items: T[];
  onChange: (v: T[]) => void;
  make: () => T;
  summary: (item: T) => { title: string; meta?: string };
  addLabel: string;
  render: (item: T, update: (patch: Partial<T>) => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState<number | null>(items.length ? null : 0);
  const update = (i: number) => (patch: Partial<T>) => onChange(items.map((item, j) => (j === i ? { ...item, ...patch } : item)));
  const move = (i: number, by: number) => {
    const j = i + by;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
    setOpen((o) => (o === i ? j : o === j ? i : o));
  };
  const remove = (i: number) => {
    onChange(items.filter((_, j) => j !== i));
    setOpen(null);
  };

  return (
    <div className="cv-entries">
      {items.map((item, i) => {
        const { title, meta } = summary(item);
        const isOpen = open === i;
        return (
          <div key={i} className={`cv-entry${isOpen ? " is-open" : ""}`}>
            <div className="cv-entry-head">
              <button type="button" className="cv-entry-toggle" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : i)}>
                <ChevronDown size={16} />
                <span>
                  <strong>{title || "Untitled"}</strong>
                  {meta && <small>{meta}</small>}
                </span>
              </button>
              <span className="cv-entry-tools">
                <button type="button" className="adm-icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" title="Move up">
                  <ChevronUp size={15} />
                </button>
                <button type="button" className="adm-icon-btn" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Move down" title="Move down">
                  <ChevronDown size={15} />
                </button>
                <button type="button" className="adm-icon-btn is-danger" onClick={() => remove(i)} aria-label={`Remove ${title || "entry"}`} title="Remove">
                  <Trash size={15} />
                </button>
              </span>
            </div>
            {isOpen && <div className="cv-entry-body">{render(item, update(i))}</div>}
          </div>
        );
      })}
      <button
        type="button"
        className="button button-secondary button-sm cv-add"
        onClick={() => {
          onChange([...items, make()]);
          setOpen(items.length);
        }}
      >
        <Plus size={15} /> {addLabel}
      </button>
    </div>
  );
}
