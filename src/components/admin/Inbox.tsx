"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { InboxIcon, Mail, Reply, Trash } from "@/components/ui/Icons";
import { adminFetch, ApiError } from "@/lib/admin/client";
import { useFeedback } from "./Feedback";

type Message = { id: number; name: string; email: string; subject: string; message: string; is_read: boolean; created_at: string };

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** Contact-form messages: list on the left, the open message on the right. */
export default function Inbox() {
  const router = useRouter();
  const { toast, confirm } = useFeedback();
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [error, setError] = useState("");

  useEffect(() => {
    adminFetch<Message[]>("messages/").then(setMessages).catch((e: ApiError) => setError(e.message));
  }, []);

  const list = useMemo(() => (messages ?? []).filter((m) => filter === "all" || !m.is_read), [messages, filter]);
  const selected = messages?.find((m) => m.id === selectedId) ?? null;
  const unread = messages?.filter((m) => !m.is_read).length ?? 0;

  async function setRead(message: Message, is_read: boolean) {
    setMessages((all) => all?.map((m) => (m.id === message.id ? { ...m, is_read } : m)) ?? null);
    try {
      await adminFetch(`messages/${message.id}/`, { method: "PATCH", body: { is_read } });
      router.refresh(); // updates the unread badge in the sidebar
    } catch (e) {
      toast((e as ApiError).message, "error");
    }
  }

  function open(message: Message) {
    setSelectedId(message.id);
    if (!message.is_read) setRead(message, true);
  }

  async function remove(message: Message) {
    if (!(await confirm({ title: `Delete the message from ${message.name}?`, confirmLabel: "Delete", danger: true }))) return;
    try {
      await adminFetch(`messages/${message.id}/`, { method: "DELETE" });
      setMessages((all) => all?.filter((m) => m.id !== message.id) ?? null);
      setSelectedId(null);
      toast("Message deleted.");
      router.refresh();
    } catch (e) {
      toast((e as ApiError).message, "error");
    }
  }

  async function markAllRead() {
    try {
      await adminFetch("messages/mark-all-read/", { method: "POST" });
      setMessages((all) => all?.map((m) => ({ ...m, is_read: true })) ?? null);
      toast("All messages marked as read.");
      router.refresh();
    } catch (e) {
      toast((e as ApiError).message, "error");
    }
  }

  return (
    <>
      <header className="adm-page-head">
        <div>
          <h1>Messages</h1>
          <p>What visitors sent through the contact form.</p>
        </div>
        <div className="adm-page-actions">
          <div className="adm-segmented" role="tablist">
            <button type="button" role="tab" aria-selected={filter === "all"} onClick={() => setFilter("all")}>
              All
            </button>
            <button type="button" role="tab" aria-selected={filter === "unread"} onClick={() => setFilter("unread")}>
              Unread {unread > 0 && <span className="adm-nav-badge">{unread}</span>}
            </button>
          </div>
          <button type="button" className="button button-secondary button-sm" onClick={markAllRead} disabled={unread === 0}>
            Mark all read
          </button>
        </div>
      </header>

      {error && <div className="adm-alert is-error">{error}</div>}

      <div className="adm-card adm-inbox">
        <ul className="adm-inbox-list" aria-label="Messages">
          {!messages && !error && <li className="adm-muted adm-inbox-empty">Loading…</li>}
          {messages && list.length === 0 && (
            <li className="adm-inbox-empty">
              <InboxIcon size={28} />
              <span>{filter === "unread" ? "No unread messages." : "No messages yet."}</span>
            </li>
          )}
          {list.map((m) => (
            <li key={m.id}>
              <button type="button" className={`adm-inbox-item${m.is_read ? "" : " is-unread"}${m.id === selectedId ? " is-active" : ""}`} onClick={() => open(m)}>
                <span className="adm-inbox-top">
                  <strong>{m.name}</strong>
                  <time dateTime={m.created_at}>{new Date(m.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</time>
                </span>
                <span className="adm-inbox-subject">{m.subject || "(no subject)"}</span>
                <span className="adm-inbox-preview">{m.message}</span>
              </button>
            </li>
          ))}
        </ul>

        <article className="adm-inbox-view" aria-live="polite">
          {selected ? (
            <>
              <header>
                <h2>{selected.subject || "(no subject)"}</h2>
                <p>
                  <strong>{selected.name}</strong> &lt;
                  <a href={`mailto:${selected.email}`}>{selected.email}</a>&gt; · {formatDate(selected.created_at)}
                </p>
              </header>
              <div className="adm-inbox-body">{selected.message}</div>
              <footer>
                <a className="button button-primary button-sm" href={`mailto:${selected.email}?subject=${encodeURIComponent(`Re: ${selected.subject || "your message"}`)}`}>
                  <Reply size={15} /> Reply by email
                </a>
                <button type="button" className="button button-secondary button-sm" onClick={() => setRead(selected, !selected.is_read)}>
                  <Mail size={15} /> Mark as {selected.is_read ? "unread" : "read"}
                </button>
                <button type="button" className="button button-secondary button-sm adm-text-danger" onClick={() => remove(selected)}>
                  <Trash size={15} /> Delete
                </button>
              </footer>
            </>
          ) : (
            <div className="adm-inbox-placeholder">
              <InboxIcon size={32} />
              <p>Select a message to read it.</p>
            </div>
          )}
        </article>
      </div>
    </>
  );
}
