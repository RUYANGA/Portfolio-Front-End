"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Plus, SocialIcon, Trash } from "@/components/ui/Icons";
import { adminFetch, ApiError, buildBody, type FormValues } from "@/lib/admin/client";
import { PROFILE_SECTIONS } from "@/lib/admin/resources";
import { useFeedback } from "./Feedback";
import ResourceForm from "./ResourceForm";

type Social = { id: number; label: string; url: string; order: number };

export default function ProfileEditor() {
  const [profile, setProfile] = useState<FormValues | null>(null);
  const [error, setError] = useState("");
  const fields = PROFILE_SECTIONS.flatMap((s) => s.fields);

  useEffect(() => {
    adminFetch<FormValues>("profile/").then(setProfile).catch((e: ApiError) => setError(e.message));
  }, []);

  const save = (values: FormValues, original: FormValues) =>
    adminFetch<FormValues>("profile/", { method: "PATCH", body: buildBody(values, original, fields) });

  return (
    <>
      <header className="adm-page-head">
        <div>
          <h1>Profile &amp; site text</h1>
          <p>Your details, résumé, and the wording around each section of the homepage.</p>
        </div>
      </header>
      {error && <div className="adm-alert is-error">{error}</div>}
      {!profile && !error && <div className="adm-card adm-loading">Loading…</div>}
      {profile && <ResourceForm sections={PROFILE_SECTIONS} initial={profile} onSave={save} aside={<SocialLinks />} />}
    </>
  );
}

/** Social links, edited in place: each row saves on its own. */
function SocialLinks() {
  const { toast, confirm } = useFeedback();
  const [links, setLinks] = useState<Social[] | null>(null);
  const [draft, setDraft] = useState({ label: "", url: "" });
  const [savedLinks, setSavedLinks] = useState<Record<number, string>>({});
  const fingerprint = (l: Social) => `${l.label}\u0000${l.url}`;

  useEffect(() => {
    adminFetch<Social[]>("social-links/")
      .then((list) => {
        setLinks(list);
        setSavedLinks(Object.fromEntries(list.map((l) => [l.id, fingerprint(l)])));
      })
      .catch(() => setLinks([]));
  }, []);

  async function saveLink(link: Social) {
    if (savedLinks[link.id] === fingerprint(link)) return;
    try {
      const saved = await adminFetch<Social>(`social-links/${link.id}/`, { method: "PATCH", body: { label: link.label, url: link.url } });
      setLinks((list) => list?.map((l) => (l.id === saved.id ? saved : l)) ?? null);
      setSavedLinks((m) => ({ ...m, [saved.id]: fingerprint(saved) }));
      toast(`${saved.label} saved.`);
    } catch (e) {
      toast((e as ApiError).message, "error");
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    try {
      const created = await adminFetch<Social>("social-links/", { method: "POST", body: draft });
      setLinks((list) => [...(list ?? []), created]);
      setSavedLinks((m) => ({ ...m, [created.id]: fingerprint(created) }));
      setDraft({ label: "", url: "" });
      toast(`${created.label} added.`);
    } catch (err) {
      const e2 = err as ApiError;
      toast(Object.values(e2.fields)[0] || e2.message, "error");
    }
  }

  async function remove(link: Social) {
    if (!(await confirm({ title: `Remove ${link.label}?`, confirmLabel: "Remove", danger: true }))) return;
    try {
      await adminFetch(`social-links/${link.id}/`, { method: "DELETE" });
      setLinks((list) => list?.filter((l) => l.id !== link.id) ?? null);
      toast(`${link.label} removed.`);
    } catch (e) {
      toast((e as ApiError).message, "error");
    }
  }

  async function move(index: number, dir: -1 | 1) {
    if (!links) return;
    const next = [...links];
    [next[index], next[index + dir]] = [next[index + dir], next[index]];
    setLinks(next);
    try {
      setLinks(await adminFetch<Social[]>("social-links/reorder/", { method: "POST", body: { ids: next.map((l) => l.id) } }));
    } catch (e) {
      toast((e as ApiError).message, "error");
    }
  }

  const edit = (id: number, patch: Partial<Social>) => setLinks((list) => list?.map((l) => (l.id === id ? { ...l, ...patch } : l)) ?? null);

  return (
    <section className="adm-card adm-section">
      <header className="adm-section-head">
        <h2>Social links</h2>
        <p>Shown in the hero and footer. Use mailto: for an email link.</p>
      </header>
      {!links && <p className="adm-muted">Loading…</p>}
      <ul className="adm-socials">
        {links?.map((link, i) => (
          <li key={link.id}>
            <span className="adm-social-icon">
              <SocialIcon label={link.label} url={link.url} size={16} />
            </span>
            <div className="adm-social-fields">
              <input value={link.label} onChange={(e) => edit(link.id, { label: e.target.value })} onBlur={() => saveLink(link)} aria-label="Label" />
              <input value={link.url} onChange={(e) => edit(link.id, { url: e.target.value })} onBlur={() => saveLink(link)} aria-label="URL" spellCheck={false} />
            </div>
            <div className="adm-social-actions">
              <button type="button" className="adm-icon-btn" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
                <ChevronUp size={14} />
              </button>
              <button type="button" className="adm-icon-btn" disabled={i === links.length - 1} onClick={() => move(i, 1)} aria-label="Move down">
                <ChevronDown size={14} />
              </button>
              <button type="button" className="adm-icon-btn is-danger" onClick={() => remove(link)} aria-label={`Remove ${link.label}`}>
                <Trash size={14} />
              </button>
            </div>
          </li>
        ))}
      </ul>
      <form className="adm-social-add" onSubmit={add}>
        <input placeholder="Label, e.g. GitHub" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} required aria-label="New link label" />
        <input placeholder="https://…" value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} required aria-label="New link URL" spellCheck={false} />
        <button type="submit" className="button button-secondary button-sm">
          <Plus size={14} /> Add link
        </button>
      </form>
    </section>
  );
}
