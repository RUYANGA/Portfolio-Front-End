"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Certification } from "@/lib/api/types";
import { ArrowLeft, ArrowRight, ArrowUpRight, Award } from "@/components/ui/Icons";

/** Certificate cards with thumbnails; clicking one opens the full certificate in a dialog. */
export default function CertificateGallery({ items }: { items: Certification[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState<number | null>(null);
  const withImages = items.map((c, i) => ({ c, i })).filter(({ c }) => c.image);

  const open = (i: number) => {
    setIndex(i);
    dialogRef.current?.showModal();
  };
  const close = () => dialogRef.current?.close();

  const step = useCallback(
    (dir: 1 | -1) => {
      if (index === null || withImages.length < 2) return;
      const pos = withImages.findIndex(({ i }) => i === index);
      const next = withImages[(pos + dir + withImages.length) % withImages.length];
      setIndex(next.i);
    },
    [index, withImages],
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    const onClose = () => setIndex(null);
    dialog.addEventListener("keydown", onKey);
    dialog.addEventListener("close", onClose);
    return () => {
      dialog.removeEventListener("keydown", onKey);
      dialog.removeEventListener("close", onClose);
    };
  }, [step]);

  const current = index === null ? null : items[index];

  return (
    <>
      <ul className="cert-grid">
        {items.map((c, i) => (
          <li key={c.name} className="card cert-card" data-reveal style={{ "--d": `${(i % 4) * 70}ms` } as React.CSSProperties}>
            {c.image ? (
              <button type="button" className="cert-thumb" onClick={() => open(i)} aria-label={`View ${c.name} certificate`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.image} alt="" decoding="async" />
                <span className="cert-zoom" aria-hidden="true">
                  View certificate
                </span>
              </button>
            ) : (
              <span className="cert-thumb cert-thumb-empty" aria-hidden="true">
                <Award size={28} />
              </span>
            )}
            <div className="cert-body">
              <h4>{c.name}</h4>
              <p className="cert-meta">
                {c.issuer && <span>{c.issuer}</span>}
                {c.year && <span className="cred-date">{c.year}</span>}
              </p>
              {c.credential_url && (
                <a className="cert-verify" href={c.credential_url} target="_blank" rel="noreferrer">
                  Verify credential
                  <ArrowUpRight size={14} />
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        className="cert-dialog"
        aria-label={current ? `${current.name} certificate` : "Certificate"}
        onClick={(e) => e.target === e.currentTarget && close()}
      >
        {current?.image && (
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current.image} alt={`${current.name} certificate`} />
            <figcaption>
              <span>
                <strong>{current.name}</strong>
                {[current.issuer, current.year].filter(Boolean).join(" · ")}
              </span>
              <span className="cert-dialog-actions">
                {withImages.length > 1 && (
                  <>
                    <button type="button" className="icon-button" onClick={() => step(-1)} aria-label="Previous certificate">
                      <ArrowLeft size={16} />
                    </button>
                    <button type="button" className="icon-button" onClick={() => step(1)} aria-label="Next certificate">
                      <ArrowRight size={16} />
                    </button>
                  </>
                )}
                {current.credential_url && (
                  <a className="button button-secondary button-sm" href={current.credential_url} target="_blank" rel="noreferrer">
                    Verify
                    <ArrowUpRight size={14} />
                  </a>
                )}
                <button type="button" className="button button-primary button-sm" onClick={close} autoFocus>
                  Close
                </button>
              </span>
            </figcaption>
          </figure>
        )}
      </dialog>
    </>
  );
}
