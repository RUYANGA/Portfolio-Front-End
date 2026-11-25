"use client";

import { useEffect, useState } from "react";

/** Phrases the hero cycles through, in place of the first one found in the headline. */
const PHRASES = ["backend systems", "full-stack applications", "ML solutions"];

const TYPE_MS = 65;
const DELETE_MS = 35;
const HOLD_MS = 1800;
const GAP_MS = 350;

/**
 * Hero headline with a typing effect on one phrase ("I build backend systems that…" →
 * "I build full-stack applications that…" → "I build ML solutions that…").
 *
 * - The full sentence stays in the DOM for screen readers and search engines.
 * - A hidden copy with the longest phrase reserves the space, so the layout never jumps.
 * - Visitors who prefer reduced motion see the plain headline.
 * - If the headline (edited in the admin) doesn't contain the first phrase, it renders as-is.
 */
export default function TypedHeadline({ headline, id, className, style }: { headline: string; id?: string; className?: string; style?: React.CSSProperties }) {
  const start = headline.toLowerCase().indexOf(PHRASES[0]);
  const [text, setText] = useState(PHRASES[0]);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (start < 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setAnimate(true);
    let index = 0;
    let chars = PHRASES[0].length;
    let deleting = true;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const phrase = PHRASES[index];
      if (deleting) {
        chars -= 1;
        setText(phrase.slice(0, chars));
        if (chars === 0) {
          deleting = false;
          index = (index + 1) % PHRASES.length;
          timer = setTimeout(tick, GAP_MS);
          return;
        }
        timer = setTimeout(tick, DELETE_MS);
      } else {
        const next = PHRASES[index];
        chars += 1;
        setText(next.slice(0, chars));
        if (chars === next.length) {
          deleting = true;
          timer = setTimeout(tick, HOLD_MS);
          return;
        }
        timer = setTimeout(tick, TYPE_MS);
      }
    };

    timer = setTimeout(tick, HOLD_MS + 600); // let the page-entry animation finish first
    return () => clearTimeout(timer);
  }, [start]);

  if (start < 0) {
    return (
      <h1 id={id} className={className} style={style}>
        {headline}
      </h1>
    );
  }

  const before = headline.slice(0, start);
  const after = headline.slice(start + PHRASES[0].length);
  // Only the last letter and the caret are kept together, so long phrases still wrap on phones.
  const head = text.slice(0, -1);
  const last = text.slice(-1);

  return (
    <h1 id={id} className={`${className ?? ""} typed-headline`} style={style}>
      <span className="visually-hidden">{headline}</span>
      {/* One hidden copy per phrase reserves the tallest version, so nothing below moves while typing. */}
      {PHRASES.map((phrase) => (
        <span key={phrase} className="typed-ghost" aria-hidden="true">
          {before}
          <span className="typed-phrase">{phrase}</span>
          {after}
        </span>
      ))}
      <span className="typed-live" aria-hidden="true">
        {before}
        <span className="typed-phrase">{head}</span>
        <span className="typed-word">
          <span className="typed-phrase">{last}</span>
          {animate && <span className="typed-caret" />}
        </span>
        {after}
      </span>
    </h1>
  );
}
