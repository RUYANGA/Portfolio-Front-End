"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Pencil, Plus, Trash, XIcon } from "@/components/ui/Icons";
import { adminFetch, ApiError } from "@/lib/admin/client";
import { useFeedback } from "./Feedback";

type Subject = { id: number; label: string; is_active: boolean; order: number };

const ENDPOINT = "contact-subjects";

/** Contact form subjects: quick add, edit in a dialog, show/hide, reorder, delete and a live preview. */
export default function SubjectManager() {
  const { toast, confirm } = useFeedback();
  const [items, setItems] = useState<Subject[] | null>(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<{ item: Subject; label: string; active: boolean; error?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const editDialog = useRef<HTMLDialogElement>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const addInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    adminFetch<Subject[]>(`${ENDPOINT}/`)
      .then(setItems)
      .catch((e: ApiError) => setError(e.message));
  }, []);

  const active = useMemo(() => (items ?? []).filter((s) => s.is_active), [items]);
  const exists = (label: string, exceptId?: number) =>
    (items ?? []).some((s) => s.id !== exceptId && s.label.trim().toLowerCase() === label.trim().toLowerCase());

  async function add(e: FormEvent) {
    e.preventDefault();
    const label = draft.trim();
    if (!label) return setAddError("Type a subject first.");
    if (exists(label)) return setAddError("That subject is already in the list.");
    setAdding(true);
    setAddError("");
    try {
      const created = await adminFetch<Subject>(`${ENDPOINT}/`, { method: "POST", body: { label, is_active: true } });
      setItems((list) => [...(list ?? []), created]);
      setDraft("");
      toast(`Added “${label}”.`);
      addInput.current?.focus();
    } catch (err) {
      const apiErr = err as ApiError;
      setAddError(apiErr.fields?.label || apiErr.message);
    } finally {
      setAdding(false);
    }
  }

  async function patch(item: Subject, body: Partial<Subject>, success: string) {
    setBusyId(item.id);
    try {
      const saved = await adminFetch<Subject>(`${ENDPOINT}/${item.id}/`, { method: "PATCH", body });
      setItems((list) => list?.map((s) => (s.id === item.id ? saved : s)) ?? null);
      toast(success);
      return true;
    } catch (err) {
      const apiErr = err as ApiError;
      toast(apiErr.fields?.label || apiErr.message, "error");
      return false;
    } finally {
      setBusyId(null);
    }
  }

  function openEdit(item: Subject) {
    setEditing({ item, label: item.label, active: item.is_active });
    requestAnimationFrame(() => editDialog.current?.showModal());
  }

  function closeEdit() {
    editDialog.current?.close();
    setEditing(null);
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const { item } = editing;
    const label = editing.label.trim();
    if (!label) return setEditing({ ...editing, error: "The subject can't be empty." });
    if (exists(label, item.id)) return setEditing({ ...editing, error: "That subject is already in the list." });
    const body: Partial<Subject> = {};
    if (label !== item.label) body.label = label;
    if (editing.active !== item.is_active) body.is_active = editing.active;
    if (!Object.keys(body).length) return closeEdit();
    setSaving(true);
    try {
      const saved = await adminFetch<Subject>(`${ENDPOINT}/${item.id}/`, { method: "PATCH", body });
      setItems((list) => list?.map((s) => (s.id === item.id ? saved : s)) ?? null);
      toast("Subject updated.");
      closeEdit();
    } catch (err) {
      const apiErr = err as ApiError;
      setEditing({ ...editing, error: apiErr.fields?.label || apiErr.message });
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: Subject) {
    const ok = await confirm({
      title: `Delete “${item.label}”?`,
      message: "Visitors won't be able to choose it any more. Messages already sent with this subject keep it.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await adminFetch(`${ENDPOINT}/${item.id}/`, { method: "DELETE" });
      setItems((list) => list?.filter((s) => s.id !== item.id) ?? null);
      toast(`Deleted “${item.label}”.`);
    } catch (err) {
      toast((err as ApiError).message, "error");
    }
  }

  async function move(index: number, dir: -1 | 1) {
    if (!items) return;
    const next = [...items];
    [next[index], next[index + dir]] = [next[index + dir], next[index]];
    const previous = items;
    setItems(next);
    try {
      setItems(await adminFetch<Subject[]>(`${ENDPOINT}/reorder/`, { method: "POST", body: { ids: next.map((s) => s.id) } }));
    } catch (err) {
      setItems(previous);
      toast((err as ApiError).message, "error");
    }
  }

  return (
    <div className="adm-subjects">
      <section className="adm-card adm-list">
        <form className="adm-subject-add" onSubmit={add} noValidate>
          <label htmlFor="new-subject" className="visually-hidden">
            New subject
          </label>
          <input
            id="new-subject"
            ref={addInput}
            value={draft}
            maxLength={120}
            placeholder="New subject"
            onChange={(e) => (setDraft(e.target.value), setAddError(""))}
            aria-invalid={!!addError}
            aria-describedby={addError ? "new-subject-error" : undefined}
          />
          <button type="submit" className="button button-primary button-sm" disabled={adding}>
            <Plus size={16} /> {adding ? "Adding…" : "Add subject"}
          </button>
          {addError && (
            <p id="new-subject-error" className="adm-error adm-subject-add-error">
              {addError}
            </p>
          )}
        </form>

        {error && <div className="adm-alert is-error">{error}</div>}
        {!items && !error && <div className="adm-loading">Loading subjects…</div>}
        {items && items.length === 0 && (
          <div className="adm-empty">
            <p>No subjects yet. Until you add some, visitors type their own subject.</p>
          </div>
        )}

        {items && items.length > 0 && (
          <ul className="adm-rows">
            {items.map((item, index) => {
              return (
                <li key={item.id} className={`adm-row adm-subject-row${item.is_active ? "" : " is-hidden"}`}>
                  <div className="adm-order" aria-label="Change order">
                    <button type="button" className="adm-icon-btn" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Move “${item.label}” up`}>
                      <ChevronUp size={15} />
                    </button>
                    <button type="button" className="adm-icon-btn" disabled={index === items.length - 1} onClick={() => move(index, 1)} aria-label={`Move “${item.label}” down`}>
                      <ChevronDown size={15} />
                    </button>
                  </div>

                  <button type="button" className="adm-subject-label" onClick={() => openEdit(item)} title="Edit subject">
                    {item.label}
                  </button>

                  <label className="adm-switch adm-subject-switch" title={item.is_active ? "Shown in the contact form" : "Hidden from the contact form"}>
                    <input
                      type="checkbox"
                      checked={item.is_active}
                      disabled={busyId === item.id}
                      onChange={(e) => patch(item, { is_active: e.target.checked }, e.target.checked ? `“${item.label}” is shown.` : `“${item.label}” is hidden.`)}
                      aria-label={`Show “${item.label}” in the contact form`}
                    />
                    <span className="adm-switch-track" aria-hidden="true" />
                    <span className="adm-subject-state">{item.is_active ? "Shown" : "Hidden"}</span>
                  </label>

                  <div className="adm-row-actions">
                    <button type="button" className="adm-icon-btn" onClick={() => openEdit(item)} aria-label={`Edit “${item.label}”`} title="Edit">
                      <Pencil size={15} />
                    </button>
                    <button type="button" className="adm-icon-btn is-danger" onClick={() => remove(item)} aria-label={`Delete “${item.label}”`} title="Delete">
                      <Trash size={15} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <aside className="adm-card adm-panel adm-subject-preview">
        <header className="adm-panel-head">
          <div>
            <h2>Preview</h2>
            <p>
              {active.length} of {items?.length ?? 0} subjects shown in the contact form.
            </p>
          </div>
        </header>
        <label htmlFor="subject-preview" className="adm-label">
          Subject
        </label>
        <select id="subject-preview" defaultValue="">
          <option value="" disabled>
            Choose a subject
          </option>
          {active.map((s) => (
            <option key={s.id}>{s.label}</option>
          ))}
        </select>
        <p className="adm-help">This is the dropdown visitors see. Changes apply to the site straight away.</p>
      </aside>
      <dialog
        ref={editDialog}
        className="adm-dialog adm-subject-dialog"
        onCancel={(e) => (e.preventDefault(), closeEdit())}
        onClick={(e) => e.target === e.currentTarget && closeEdit()}
        aria-labelledby="subject-dialog-title"
      >
        {editing && (
          <form onSubmit={saveEdit} noValidate>
            <header className="adm-subject-dialog-head">
              <div>
                <p className="adm-preview-kicker">Contact subject</p>
                <h2 id="subject-dialog-title">Edit subject</h2>
              </div>
              <button type="button" className="adm-icon-btn" onClick={closeEdit} aria-label="Close">
                <XIcon size={16} />
              </button>
            </header>
            <div className="adm-subject-dialog-body">
              <div className="adm-field">
                <label htmlFor="subject-label" className="adm-label">
                  Subject <span className="adm-required">*</span>
                </label>
                <input
                  id="subject-label"
                  autoFocus
                  value={editing.label}
                  maxLength={120}
                  onChange={(e) => setEditing({ ...editing, label: e.target.value, error: undefined })}
                  aria-invalid={!!editing.error}
                  aria-describedby={editing.error ? "subject-label-error" : "subject-label-help"}
                />
                {editing.error ? (
                  <p id="subject-label-error" className="adm-error">
                    {editing.error}
                  </p>
                ) : (
                  <p id="subject-label-help" className="adm-help">
                    Shown to visitors in the contact form. Messages already sent keep their subject.
                  </p>
                )}
              </div>
              <label className="adm-switch adm-subject-dialog-switch">
                <input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
                <span className="adm-switch-track" aria-hidden="true" />
                <span className="adm-switch-text">
                  <span className="adm-label">Show in the contact form</span>
                  <span className="adm-help">Hidden subjects stay in this list but aren&apos;t offered to visitors.</span>
                </span>
              </label>
            </div>
            <footer className="adm-dialog-foot">
              <button type="button" className="button button-secondary button-sm adm-text-danger adm-subject-dialog-delete" onClick={() => { const item = editing.item; closeEdit(); remove(item); }}>
                <Trash size={14} /> Delete
              </button>
              <span className="adm-preview-spacer" />
              <button type="button" className="button button-secondary button-sm" onClick={closeEdit}>
                Cancel
              </button>
              <button type="submit" className="button button-primary button-sm" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </button>
            </footer>
          </form>
        )}
      </dialog>
    </div>
  );
}
