"use client";

import { useMemo, useState } from "react";
import type { Lab } from "@/lib/api/types";
import Modal from "@/components/ui/Modal";
import { track } from "@/lib/analytics";
import { ArrowRight, ArrowUpRight, Check, Cloud, GitHub } from "@/components/ui/Icons";

/**
 * Cloud lab cards with a topic filter. Cards stay short (title and summary);
 * "View details" opens a dialog with the diagram, every outcome, the services and the repository.
 */
export default function LabGallery({ labs }: { labs: Lab[] }) {
  const [topic, setTopic] = useState<string>("all");
  const [open, setOpen] = useState<Lab | null>(null);
  const openLab = (lab: Lab) => {
    setOpen(lab);
    track("lab_open");
  };

  const topics = useMemo(() => {
    const counts = new Map<string, number>();
    labs.forEach((l) => counts.set(l.category, (counts.get(l.category) ?? 0) + 1));
    return [...counts.entries()];
  }, [labs]);

  const shown = topic === "all" ? labs : labs.filter((l) => l.category === topic);

  return (
    <>
      {topics.length > 1 && (
        <div className="lab-filters" role="group" aria-label="Filter labs by topic" data-reveal>
          {[["all", labs.length] as const, ...topics].map(([key, count]) => (
            <button
              key={key}
              type="button"
              className={`lab-filter${topic === key ? " is-active" : ""}`}
              aria-pressed={topic === key}
              onClick={() => setTopic(key)}
            >
              {key === "all" ? "All labs" : key}
              <span className="lab-filter-count">{count}</span>
            </button>
          ))}
        </div>
      )}

      <ul className="lab-grid" aria-live="polite">
        {shown.map((lab) => (
          <li key={lab.title} className="card lab-card">
            <button type="button" className="lab-visual" onClick={() => openLab(lab)} tabIndex={-1} aria-hidden="true">
              {lab.diagram ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={lab.diagram} alt="" loading="lazy" decoding="async" />
              ) : (
                <span className="lab-visual-empty">
                  <Cloud size={30} />
                  <span>{lab.category}</span>
                </span>
              )}
            </button>

            <div className="lab-body">
              <p className="lab-meta">
                <span className="lab-provider">{lab.provider}</span>
                <span className="lab-category">{lab.category}</span>
              </p>
              <h3 className="lab-title">{lab.title}</h3>
              <p className="lab-summary is-clamped">{lab.summary}</p>
              <button type="button" className="lab-details-btn" onClick={() => openLab(lab)} aria-label={`View details: ${lab.title}`}>
                View details
                <ArrowRight size={16} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <Modal
        open={open !== null}
        onClose={() => setOpen(null)}
        title={open?.title ?? ""}
        description={open ? [open.provider, open.category, open.completed].filter(Boolean).join(" · ") : undefined}
        size="xl"
        footer={
          open?.repo_url ? (
            <a className="button button-primary" href={open.repo_url} target="_blank" rel="noreferrer">
              <GitHub size={16} />
              View templates & docs
              <ArrowUpRight size={14} />
            </a>
          ) : undefined
        }
      >
        {open && (
          <div className="lab-detail">
            {open.diagram && (
              <a className="lab-detail-diagram" href={open.diagram} target="_blank" rel="noreferrer" title="Open the diagram full size in a new tab">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={open.diagram} alt={`Architecture diagram for ${open.title}`} />
                <span className="lab-zoom">Open full size</span>
              </a>
            )}

            <p className="lab-detail-summary">{open.summary}</p>

            {open.highlights.length > 0 && (
              <section>
                <h4 className="lab-detail-heading">Key outcomes</h4>
                <ul className="lab-points">
                  {open.highlights.map((h) => (
                    <li key={h}>
                      <Check size={15} />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {open.services.length > 0 && (
              <section>
                <h4 className="lab-detail-heading">Services & tools</h4>
                <ul className="tags lab-services">
                  {open.services.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
