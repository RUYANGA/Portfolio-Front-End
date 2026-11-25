"use client";

import { useEffect, useId, useRef } from "react";
import { XIcon } from "./Icons";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl";
  /** Extra actions shown in the footer, right-aligned. */
  footer?: React.ReactNode;
  /** Body without padding (for images and documents). */
  flush?: boolean;
  children: React.ReactNode;
};

/**
 * Accessible modal built on <dialog>: focus is trapped, Esc and the backdrop close it,
 * page scroll is locked while open, and focus returns to the trigger afterwards.
 */
export default function Modal({ open, onClose, title, description, size = "md", footer, flush, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      document.documentElement.classList.add("has-modal");
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const handleClose = () => {
      document.documentElement.classList.remove("has-modal");
      onClose();
    };
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  // Never leave the page scroll-locked if the component unmounts while open.
  useEffect(() => () => document.documentElement.classList.remove("has-modal"), []);

  return (
    <dialog
      ref={ref}
      className={`modal modal-${size}`}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
    >
      {open && (
        <div className="modal-panel">
          <header className="modal-head">
            <div>
              <h2 id={titleId}>{title}</h2>
              {description && <p id={descId}>{description}</p>}
            </div>
            <button type="button" className="modal-close" onClick={() => ref.current?.close()} aria-label="Close">
              <XIcon size={18} />
            </button>
          </header>
          <div className={`modal-body${flush ? " is-flush" : ""}`}>{children}</div>
          {footer && <footer className="modal-foot">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}
