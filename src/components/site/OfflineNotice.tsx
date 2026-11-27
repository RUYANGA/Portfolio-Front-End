"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "@/components/ui/Icons";

export default function OfflineNotice() {
  const [offline, setOffline] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const sync = () => {
      const isOffline = !navigator.onLine;
      setOffline(isOffline);
      if (!isOffline) setDismissed(false);
    };

    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline || dismissed) return null;

  return (
    <div className="offline-notice" role="alert" aria-live="assertive">
      <div className="offline-card">
        <div className="offline-icon" aria-hidden="true">
          <WifiOff size={28} />
        </div>
        <h2 className="offline-title">No internet connection</h2>
        <p className="offline-copy">
          You&apos;re currently offline. Check your network connection and try again.
        </p>
        <div className="offline-actions">
          <button type="button" className="button button-primary" onClick={() => window.location.reload()}>
            Try again
          </button>
          <button type="button" className="button button-secondary" onClick={() => setDismissed(true)}>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
