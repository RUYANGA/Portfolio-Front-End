"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertCircle, Check, Clock, Trash, XIcon } from "@/components/ui/Icons";

type Tone = "success" | "error" | "info";
type Toast = { id: number; message: string; tone: Tone };
type ConfirmOptions = { title: string; message?: string; confirmLabel?: string; danger?: boolean };

type FeedbackApi = {
  toast: (message: string, tone?: Tone) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  /** Forms call this while they have unsaved changes; links then ask before leaving. */
  setUnsavedChanges: (dirty: boolean) => void;
  /** Ask before an action that would lose unsaved changes. Resolves true when it's fine to go. */
  confirmLeave: () => Promise<boolean>;
};

/** Fired by the API client when the session has expired or been revoked. */
export const SESSION_EXPIRED_EVENT = "admin:session-expired";

const FeedbackContext = createContext<FeedbackApi | null>(null);

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error("useFeedback must be used inside <FeedbackProvider>");
  return ctx;
}

/** Toast notifications and a promise-based confirm dialog for the whole dashboard. */
export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pending, setPending] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const nextId = useRef(1);
  const unsaved = useRef(false);
  const router = useRouter();
  const [sessionExpired, setSessionExpired] = useState(false);
  const expiredDialog = useRef<HTMLDialogElement>(null);

  const expiredRef = useRef(false);

  const toast = useCallback((message: string, tone: Tone = "success") => {
    if (expiredRef.current) return; // the session dialog already explains what happened
    const id = nextId.current++;
    setToasts((list) => [...list, { id, message, tone }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), tone === "error" ? 7000 : 3500);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    setPending(options);
    requestAnimationFrame(() => dialog.current?.showModal());
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const setUnsavedChanges = useCallback((dirty: boolean) => {
    unsaved.current = dirty;
  }, []);

  const confirmLeave = useCallback(async () => {
    if (!unsaved.current) return true;
    const ok = await confirm({
      title: "Discard unsaved changes?",
      message: "You have changes on this page that haven't been saved. Leaving now will lose them.",
      confirmLabel: "Discard changes",
      danger: true,
    });
    if (ok) unsaved.current = false;
    return ok;
  }, [confirm]);

  // Intercept in-app links while a form has unsaved changes.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!unsaved.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as HTMLElement).closest("a");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      e.preventDefault();
      confirmLeave().then((ok) => ok && router.push(url.pathname + url.search));
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [confirmLeave, router]);

  // Session expired: explain, then send to sign-in (and back here afterwards).
  useEffect(() => {
    const onExpired = () => {
      expiredRef.current = true; // set synchronously, before callers try to toast the 401
      setSessionExpired(true);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  useEffect(() => {
    if (sessionExpired) expiredDialog.current?.showModal();
  }, [sessionExpired]);

  const settle = (ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    dialog.current?.close();
    setPending(null);
  };

  return (
    <FeedbackContext.Provider value={{ toast, confirm, setUnsavedChanges, confirmLeave }}>
      {children}

      <div className="adm-toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`adm-toast is-${t.tone}`}>
            {t.tone === "error" ? <AlertCircle size={18} /> : <Check size={18} />}
            <span>{t.message}</span>
            <button type="button" onClick={() => setToasts((l) => l.filter((x) => x.id !== t.id))} aria-label="Dismiss">
              <XIcon size={14} />
            </button>
          </div>
        ))}
      </div>

      <dialog ref={dialog} className="adm-dialog" onCancel={(e) => (e.preventDefault(), settle(false))} aria-labelledby="adm-confirm-title" aria-describedby="adm-confirm-text">
        {pending && (
          <>
            <div className="adm-dialog-body adm-confirm">
              <span className={`adm-dialog-icon${pending.danger ? " is-danger" : ""}`} aria-hidden="true">
                {pending.danger ? <Trash size={19} /> : <AlertCircle size={20} />}
              </span>
              <div>
                <h2 id="adm-confirm-title">{pending.title}</h2>
                {pending.message && <p id="adm-confirm-text">{pending.message}</p>}
              </div>
              <button type="button" className="adm-icon-btn adm-dialog-close" onClick={() => settle(false)} aria-label="Close">
                <XIcon size={16} />
              </button>
            </div>
            <div className="adm-dialog-foot">
              <button type="button" className="button button-secondary button-sm" onClick={() => settle(false)}>
                Cancel
              </button>
              <button
                type="button"
                className={`button button-sm ${pending.danger ? "adm-button-danger" : "button-primary"}`}
                onClick={() => settle(true)}
                autoFocus
              >
                {pending.confirmLabel || "Confirm"}
              </button>
            </div>
          </>
        )}
      </dialog>
      <dialog ref={expiredDialog} className="adm-dialog" onCancel={(e) => e.preventDefault()} aria-labelledby="session-expired-title">
        {sessionExpired && (
          <div className="adm-dialog-body">
            <span className="adm-dialog-icon">
              <Clock size={20} />
            </span>
            <h2 id="session-expired-title">Your session has ended</h2>
            <p>For security, sign-ins expire after a while. Sign in again to continue; you&apos;ll come back to this page.</p>
            <div className="adm-dialog-actions">
              <a className="button button-primary button-sm" href={`/admin/login?next=${encodeURIComponent(typeof window === "undefined" ? "/admin" : window.location.pathname)}`}>
                Sign in again
              </a>
            </div>
          </div>
        )}
      </dialog>
    </FeedbackContext.Provider>
  );
}
