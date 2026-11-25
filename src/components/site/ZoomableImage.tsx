"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";

/** Wraps a preview; clicking it opens the full-size image in a dialog. */
export default function ZoomableImage({ src, alt, title, children }: { src: string; alt: string; title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="zoomable" onClick={() => setOpen(true)} aria-label={`View ${alt} full size`}>
        {children}
        <span className="zoomable-hint" aria-hidden="true">
          Click to enlarge
        </span>
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={title} size="xl" flush>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="zoomable-full" src={src} alt={alt} />
      </Modal>
    </>
  );
}
