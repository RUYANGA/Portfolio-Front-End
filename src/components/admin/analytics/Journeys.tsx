"use client";

import { useState } from "react";
import { ChevronDown } from "@/components/ui/Icons";
import { ago, clock, countryName, duration, EVENT_NAMES, flag, pageName, SECTION_NAMES, sourceName, type Journey, type Step } from "./format";

function describe(step: Step): { title: string; detail: string; tone: string } {
  if (step.type === "view") {
    const detail = [step.duration ? `${duration(step.duration)} on page` : "", step.scroll ? `${step.scroll}% read` : ""].filter(Boolean).join(" · ");
    return { title: `Viewed ${pageName(step.path)}`, detail, tone: "is-view" };
  }
  if (step.name === "section") return { title: `Reached ${SECTION_NAMES[step.target] || step.target}`, detail: "", tone: "is-section" };
  if (step.name === "outbound") {
    const target = step.target === "email" ? "your email" : step.target === "phone" ? "your phone number" : step.target;
    return { title: `Clicked ${target}`, detail: "left the site", tone: "is-out" };
  }
  const goal = ["cv_download", "contact", "booking"].includes(step.name);
  return { title: EVENT_NAMES[step.name] || step.name, detail: pageName(step.path), tone: goal ? "is-goal" : "is-event" };
}

/** The latest visits, each expandable into a timeline of the pages and actions in that visit. */
export default function Journeys({ sessions }: { sessions: Journey[] }) {
  const [open, setOpen] = useState<number | null>(0);
  if (!sessions.length) return <p className="an-empty-cell">No visits in this period.</p>;
  return (
    <ul className="an-journeys">
      {sessions.map((s, i) => {
        const isOpen = open === i;
        const goals = s.steps.filter((st) => ["cv_download", "contact", "booking"].includes(st.name)).length;
        return (
          <li key={`${s.started}-${i}`} className={isOpen ? "is-open" : undefined}>
            <button type="button" className="an-journey-head" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : i)}>
              <span className="an-flag" title={countryName(s.country)} aria-hidden="true">
                {flag(s.country)}
              </span>
              <span className="an-journey-main">
                <strong>
                  {s.city || countryName(s.country)} · {s.device}
                </strong>
                <span>
                  {sourceName(s.source)} · {s.pages} {s.pages === 1 ? "page" : "pages"} · {duration(s.time)} · {s.browser} on {s.os}
                </span>
              </span>
              <span className="an-journey-tags">
                {goals > 0 && <span className="an-tag is-goal">{goals === 1 ? "1 goal" : `${goals} goals`}</span>}
                {s.returning ? <span className="an-tag">Returning</span> : <span className="an-tag is-new">New</span>}
                {!s.engaged && <span className="an-tag is-muted">Bounced</span>}
              </span>
              <time className="an-journey-time" dateTime={s.started} title={new Date(s.started).toLocaleString()}>
                {ago(s.started)}
              </time>
              <ChevronDown size={16} />
            </button>
            {isOpen && (
              <ol className="an-timeline">
                {s.steps.map((step, j) => {
                  const { title, detail, tone } = describe(step);
                  return (
                    <li key={j} className={tone}>
                      <time dateTime={step.at}>{clock(step.at)}</time>
                      <span className="an-timeline-dot" aria-hidden="true" />
                      <span className="an-timeline-text">
                        <strong>{title}</strong>
                        {detail && <small>{detail}</small>}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </li>
        );
      })}
    </ul>
  );
}
