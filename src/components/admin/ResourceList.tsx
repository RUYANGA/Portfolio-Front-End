"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, ChevronDown, ChevronUp, Eye, Pencil, Plus, Search, Trash, XIcon } from "@/components/ui/Icons";
import { adminFetch, ApiError } from "@/lib/admin/client";
import { getResource, type Field, type Record_ } from "@/lib/admin/resources";
import { useFeedback } from "./Feedback";
import ResourceDialog from "./ResourceDialog";

const PREVIEW_TYPES = new Set(["text", "textarea", "url", "email", "number", "select", "tags", "lines", "checkbox", "slug"]);

/** A record's value as display text for the preview dialog; empty values return "". */
function displayValue(field: Field, value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  if (field.type === "checkbox") return value ? "Yes" : "No";
  if (field.type === "select") return field.options?.find((o) => o.value === value)?.label ?? String(value);
  if (Array.isArray(value)) return value.join(field.type === "lines" ? "\n" : ", ");
  return String(value);
}

/** Table of a resource's records with search, reordering, preview, edit and delete. */
export default function ResourceList({ resourceKey }: { resourceKey: string }) {
  const resource = getResource(resourceKey)!;
  const { toast, confirm } = useFeedback();
  const [items, setItems] = useState<Record_[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<Record_ | null>(null);
  // Resources with `editInDialog` are created and edited in a dialog: undefined = closed, null = new.
  const [editing, setEditing] = useState<Record_ | null | undefined>(undefined);
  const inDialog = Boolean(resource.editInDialog);

  function openEditor(item: Record_ | null) {
    closePreview();
    setEditing(item);
  }

  function onSaved(saved: Record_, created: boolean) {
    setItems((list) => (created ? [...(list ?? []), saved] : list?.map((i) => (i.id === saved.id ? saved : i)) ?? null));
    setEditing(undefined);
  }

  /** A link to the editor page, or a button that opens the editor dialog. */
  function EditTrigger({ item, className, children, label }: { item: Record_ | null; className: string; children: React.ReactNode; label?: string }) {
    if (inDialog)
      return (
        <button type="button" className={className} onClick={() => openEditor(item)} aria-label={label} title={label}>
          {children}
        </button>
      );
    return (
      <Link href={`/admin/${resource.key}/${item ? item.id : "new"}`} className={className} aria-label={label} title={label}>
        {children}
      </Link>
    );
  }
  const previewDialog = useRef<HTMLDialogElement>(null);

  function openPreview(item: Record_) {
    setPreview(item);
    requestAnimationFrame(() => previewDialog.current?.showModal());
  }

  function closePreview() {
    previewDialog.current?.close();
    setPreview(null);
  }

  useEffect(() => {
    adminFetch<Record_[]>(`${resource.endpoint}/`)
      .then(setItems)
      .catch((e: ApiError) => setError(e.message));
  }, [resource.endpoint]);

  const visible = useMemo(() => {
    if (!items) return [];
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => resource.searchFields.some((f) => String(item[f] ?? "").toLowerCase().includes(q)));
  }, [items, query, resource.searchFields]);

  async function move(index: number, dir: -1 | 1) {
    if (!items) return;
    const next = [...items];
    [next[index], next[index + dir]] = [next[index + dir], next[index]];
    const previous = items;
    setItems(next); // optimistic
    try {
      setItems(await adminFetch<Record_[]>(`${resource.endpoint}/reorder/`, { method: "POST", body: { ids: next.map((i) => i.id) } }));
      toast("Order updated.");
    } catch (e) {
      setItems(previous);
      toast((e as ApiError).message, "error");
    }
  }

  async function remove(item: Record_) {
    const title = String(item[resource.titleField] || resource.singular);
    const ok = await confirm({
      title: `Delete “${title}”?`,
      message: `It will be removed from the site straight away. This can't be undone.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    closePreview();
    try {
      await adminFetch(`${resource.endpoint}/${item.id}/`, { method: "DELETE" });
      setItems((list) => list?.filter((i) => i.id !== item.id) ?? null);
      toast(`Deleted “${title}”.`);
    } catch (e) {
      toast((e as ApiError).message, "error");
    }
  }

  const canReorder = !query;

  return (
    <div className="adm-card adm-list">
      <div className="adm-list-toolbar">
        <label className="adm-search">
          <Search size={16} />
          <input
            type="search"
            placeholder={`Search ${resource.label.toLowerCase()}`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={`Search ${resource.label}`}
          />
        </label>
        <span className="adm-list-count">
          {items ? `${visible.length} of ${items.length}` : ""}
        </span>
        <EditTrigger item={null} className="button button-primary button-sm">
          <Plus size={16} /> New {resource.singular}
        </EditTrigger>
      </div>

      {error && <div className="adm-alert is-error">{error}</div>}

      {!items && !error && (
        <ul className="adm-rows" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className="adm-row is-skeleton">
              <span className="adm-skel adm-skel-thumb" />
              <span className="adm-skel adm-skel-line" />
            </li>
          ))}
        </ul>
      )}

      {items && visible.length === 0 && (
        <div className="adm-empty">
          {query ? (
            <p>No {resource.label.toLowerCase()} match “{query}”.</p>
          ) : (
            <>
              <p>No {resource.label.toLowerCase()} yet.</p>
              <EditTrigger item={null} className="button button-primary button-sm">
                <Plus size={16} /> Add the first {resource.singular}
              </EditTrigger>
            </>
          )}
        </div>
      )}

      {items && visible.length > 0 && (
        <ul className="adm-rows">
          {visible.map((item, index) => {
            const thumb = resource.thumbField ? (item[resource.thumbField] as string | null) : null;
            const publicPath = resource.publicPath?.(item);
            return (
              <li key={item.id} className="adm-row">
                {canReorder && (
                  <div className="adm-order" aria-label="Change order">
                    <button type="button" className="adm-icon-btn" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Move up">
                      <ChevronUp size={15} />
                    </button>
                    <button type="button" className="adm-icon-btn" disabled={index === visible.length - 1} onClick={() => move(index, 1)} aria-label="Move down">
                      <ChevronDown size={15} />
                    </button>
                  </div>
                )}
                {resource.thumbField && (
                  <button type="button" className="adm-thumb" onClick={() => openPreview(item)} aria-label={`Preview ${String(item[resource.titleField] || resource.singular)}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {thumb ? <img src={thumb} alt="" loading="lazy" /> : <span>No image</span>}
                  </button>
                )}
                <EditTrigger item={item} className="adm-row-main">
                  <strong>{String(item[resource.titleField] || "Untitled")}</strong>
                  {resource.subtitle && <span>{resource.subtitle(item)}</span>}
                </EditTrigger>
                <div className="adm-row-badges">
                  {resource.badges?.(item).map((b) => (
                    <span key={b.text} className={`adm-badge is-${b.tone || "muted"}`}>
                      {b.text}
                    </span>
                  ))}
                </div>
                <div className="adm-row-actions">
                  <button type="button" className="adm-icon-btn" onClick={() => openPreview(item)} aria-label="Preview" title="Preview">
                    <Eye size={16} />
                  </button>
                  {publicPath && (
                    <a className="adm-icon-btn" href={publicPath} target="_blank" rel="noreferrer" aria-label="View on site" title="View on site">
                      <ArrowUpRight size={16} />
                    </a>
                  )}
                  <EditTrigger item={item} className="adm-icon-btn" label="Edit">
                    <Pencil size={15} />
                  </EditTrigger>
                  <button type="button" className="adm-icon-btn is-danger" onClick={() => remove(item)} aria-label="Delete" title="Delete">
                    <Trash size={15} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <dialog ref={previewDialog} className="adm-dialog adm-preview" onCancel={(e) => (e.preventDefault(), closePreview())} onClick={(e) => e.target === e.currentTarget && closePreview()} aria-labelledby="adm-preview-title">
        {preview && (() => {
          const title = String(preview[resource.titleField] || "Untitled");
          const thumb = resource.thumbField ? (preview[resource.thumbField] as string | null) : null;
          const publicPath = resource.publicPath?.(preview);
          const subtitle = resource.subtitle?.(preview) || "";
          const rows = resource.sections
            .flatMap((section) => section.fields)
            .filter((f) => PREVIEW_TYPES.has(f.type) && f.name !== resource.titleField)
            .map((f) => ({ field: f, text: displayValue(f, preview[f.name]) }))
            .filter((r) => r.text && r.text !== subtitle);
          return (
            <>
              <header className="adm-preview-head">
                <div>
                  <p className="adm-preview-kicker">{resource.singular}</p>
                  <h2 id="adm-preview-title">{title}</h2>
                  {subtitle && <p className="adm-preview-sub">{subtitle}</p>}
                </div>
                <button type="button" className="adm-icon-btn" onClick={closePreview} aria-label="Close">
                  <XIcon size={16} />
                </button>
              </header>
              <div className="adm-preview-body">
                {thumb && (
                  <div className="adm-preview-media">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={thumb} alt="" />
                  </div>
                )}
                {!!resource.badges?.(preview).length && (
                  <div className="adm-row-badges adm-preview-badges">
                    {resource.badges(preview).map((b) => (
                      <span key={b.text} className={`adm-badge is-${b.tone || "muted"}`}>
                        {b.text}
                      </span>
                    ))}
                  </div>
                )}
                <dl className="adm-preview-fields">
                  {rows.map(({ field, text }) => (
                    <div key={field.name} className={field.type === "textarea" || field.type === "lines" ? "is-long" : ""}>
                      <dt>{field.label}</dt>
                      <dd>
                        {field.type === "url" ? (
                          <a href={text} target="_blank" rel="noreferrer">
                            {text.replace(/^https?:\/\//, "")}
                          </a>
                        ) : (
                          text
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
              <footer className="adm-dialog-foot adm-preview-foot">
                <button type="button" className="button button-secondary button-sm adm-text-danger" onClick={() => remove(preview)} aria-label="Delete">
                  <Trash size={14} /> <span className="adm-hide-sm">Delete</span>
                </button>
                <span className="adm-preview-spacer" />
                {publicPath && (
                  <a className="button button-secondary button-sm" href={publicPath} target="_blank" rel="noreferrer">
                    View on site <ArrowUpRight size={14} />
                  </a>
                )}
                <EditTrigger item={preview} className="button button-primary button-sm">
                  <Pencil size={14} /> Edit
                </EditTrigger>
              </footer>
            </>
          );
        })()}
      </dialog>

      {editing !== undefined && <ResourceDialog key={editing?.id ?? "new"} resource={resource} item={editing} onSaved={onSaved} onClose={() => setEditing(undefined)} />}
    </div>
  );
}
