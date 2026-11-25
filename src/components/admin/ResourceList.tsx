"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, ChevronDown, ChevronUp, Pencil, Plus, Search, Trash } from "@/components/ui/Icons";
import { adminFetch, ApiError } from "@/lib/admin/client";
import { getResource, type Record_ } from "@/lib/admin/resources";
import { useFeedback } from "./Feedback";

/** Table of a resource's records with search, reordering, edit and delete. */
export default function ResourceList({ resourceKey }: { resourceKey: string }) {
  const resource = getResource(resourceKey)!;
  const { toast, confirm } = useFeedback();
  const [items, setItems] = useState<Record_[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

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
        <Link href={`/admin/${resource.key}/new`} className="button button-primary button-sm">
          <Plus size={16} /> New {resource.singular}
        </Link>
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
              <Link href={`/admin/${resource.key}/new`} className="button button-primary button-sm">
                <Plus size={16} /> Add the first {resource.singular}
              </Link>
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
                  <span className="adm-thumb">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {thumb ? <img src={thumb} alt="" loading="lazy" /> : <span>No image</span>}
                  </span>
                )}
                <Link href={`/admin/${resource.key}/${item.id}`} className="adm-row-main">
                  <strong>{String(item[resource.titleField] || "Untitled")}</strong>
                  {resource.subtitle && <span>{resource.subtitle(item)}</span>}
                </Link>
                <div className="adm-row-badges">
                  {resource.badges?.(item).map((b) => (
                    <span key={b.text} className={`adm-badge is-${b.tone || "muted"}`}>
                      {b.text}
                    </span>
                  ))}
                </div>
                <div className="adm-row-actions">
                  {publicPath && (
                    <a className="adm-icon-btn" href={publicPath} target="_blank" rel="noreferrer" aria-label="View on site" title="View on site">
                      <ArrowUpRight size={16} />
                    </a>
                  )}
                  <Link className="adm-icon-btn" href={`/admin/${resource.key}/${item.id}`} aria-label="Edit" title="Edit">
                    <Pencil size={15} />
                  </Link>
                  <button type="button" className="adm-icon-btn is-danger" onClick={() => remove(item)} aria-label="Delete" title="Delete">
                    <Trash size={15} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
