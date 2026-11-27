"use client";

import { useEffect, useRef, useState } from "react";
import { adminFetch, ApiError } from "@/lib/admin/client";
import type { LiveEvent, Presence } from "./format";

export type LiveStatus = "connecting" | "live" | "offline";

const FEED_SIZE = 40;
const MAX_RETRY_MS = 30_000;

/**
 * The dashboard's live connection: fetches a one-minute ticket through the admin proxy (the
 * session token stays server-side), opens the analytics WebSocket, and keeps it open, reconnecting
 * with backoff, and immediately when the tab comes back or the network returns.
 *
 * `onActivity` is called for every new page view or action, so the caller can refresh totals.
 */
export function useLiveAnalytics(onActivity: () => void) {
  const [status, setStatus] = useState<LiveStatus>("connecting");
  const [presence, setPresence] = useState<Presence | null>(null);
  const [feed, setFeed] = useState<LiveEvent[]>([]);
  const activity = useRef(onActivity);
  activity.current = onActivity;

  useEffect(() => {
    let socket: WebSocket | null = null;
    let stopped = false;
    let attempt = 0;
    let retryTimer: number | undefined;

    const scheduleRetry = () => {
      if (stopped) return;
      window.clearTimeout(retryTimer);
      const delay = Math.min(MAX_RETRY_MS, 1000 * 2 ** attempt) * (0.75 + Math.random() * 0.5);
      attempt += 1;
      retryTimer = window.setTimeout(connect, delay);
    };

    async function connect() {
      if (stopped) return;
      window.clearTimeout(retryTimer);
      socket?.close();
      setStatus("connecting");
      let ticket: { ticket: string; url: string };
      try {
        ticket = await adminFetch<{ ticket: string; url: string }>("analytics/live-ticket/");
      } catch (e) {
        setStatus("offline");
        if (!(e instanceof ApiError && e.status === 401)) scheduleRetry(); // signed out: the dashboard asks to sign in
        return;
      }
      if (stopped) return;
      const ws = new WebSocket(`${ticket.url}?ticket=${encodeURIComponent(ticket.ticket)}`);
      socket = ws;
      ws.onopen = () => {
        attempt = 0;
        setStatus("live");
      };
      ws.onmessage = (message) => {
        let data: (LiveEvent | (Presence & { type: "presence" })) | null = null;
        try {
          data = JSON.parse(message.data);
        } catch {
          return;
        }
        if (!data) return;
        if (data.type === "presence") {
          setPresence({ visitors: data.visitors, pages: data.pages, at: data.at });
        } else if (data.type === "view" || data.type === "event") {
          const event = data;
          setFeed((current) => [event, ...current.filter((e) => e.id !== event.id)].slice(0, FEED_SIZE));
          activity.current();
        }
      };
      ws.onclose = () => {
        if (socket !== ws) return; // replaced by a newer connection
        setStatus("offline");
        scheduleRetry();
      };
    }

    const reconnectNow = () => {
      if (document.visibilityState === "visible" && (!socket || socket.readyState > WebSocket.OPEN)) {
        attempt = 0;
        connect();
      }
    };

    connect();
    window.addEventListener("online", reconnectNow);
    document.addEventListener("visibilitychange", reconnectNow);
    return () => {
      stopped = true;
      window.clearTimeout(retryTimer);
      window.removeEventListener("online", reconnectNow);
      document.removeEventListener("visibilitychange", reconnectNow);
      socket?.close();
    };
  }, []);

  return { status, presence, feed };
}
