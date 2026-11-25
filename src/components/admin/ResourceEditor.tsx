"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, Trash } from "@/components/ui/Icons";
import { adminFetch, ApiError, buildBody, type FormValues } from "@/lib/admin/client";
import { getResource, type Record_ } from "@/lib/admin/resources";
import { useFeedback } from "./Feedback";
import ResourceForm from "./ResourceForm";

/** Create or edit one record of a resource. `id` is "new" for creation. */
export default function ResourceEditor({ resourceKey, id }: { resourceKey: string; id: string }) {
  const resource = getResource(resourceKey)!;
  const router = useRouter();
  const { toast, confirm } = useFeedback();
  const isNew = id === "new";
  const [record, setRecord] = useState<FormValues | null>(isNew ? { ...resource.defaults } : null);
  const [error, setError] = useState("");
  const fields = resource.sections.flatMap((s) => s.fields);

  useEffect(() => {
    if (isNew) return;
    adminFetch<FormValues>(`${resource.endpoint}/${id}/`)
      .then(setRecord)
      .catch((e: ApiError) => setError(e.status === 404 ? `This ${resource.singular} no longer exists.` : e.message));
  }, [id, isNew, resource.endpoint, resource.singular]);

  async function save(values: FormValues, original: FormValues) {
    const body = buildBody(values, original, fields);
    if (isNew) {
      const created = await adminFetch<Record_>(`${resource.endpoint}/`, { method: "POST", body });
      router.replace(`/admin/${resource.key}/${created.id}`);
      return created as FormValues;
    }
    return adminFetch<FormValues>(`${resource.endpoint}/${id}/`, { method: "PATCH", body });
  }

  async function remove() {
    const title = String(record?.[resource.titleField] || resource.singular);
    const ok = await confirm({ title: `Delete “${title}”?`, message: "It will be removed from the site straight away. This can't be undone.", confirmLabel: "Delete", danger: true });
    if (!ok) return;
    try {
      await adminFetch(`${resource.endpoint}/${id}/`, { method: "DELETE" });
      toast(`Deleted “${title}”.`);
      router.push(`/admin/${resource.key}`);
    } catch (e) {
      toast((e as ApiError).message, "error");
    }
  }

  const title = isNew ? `New ${resource.singular}` : String(record?.[resource.titleField] || "…");
  const publicPath = !isNew && record ? resource.publicPath?.(record as Record_) : null;

  return (
    <>
      <header className="adm-page-head">
        <div>
          <Link href={`/admin/${resource.key}`} className="adm-back">
            <ArrowLeft size={15} /> {resource.label}
          </Link>
          <h1>{title}</h1>
        </div>
        <div className="adm-page-actions">
          {publicPath && (
            <a className="button button-secondary button-sm" href={publicPath} target="_blank" rel="noreferrer">
              View on site <ArrowUpRight size={14} />
            </a>
          )}
          {!isNew && record && (
            <button type="button" className="button button-secondary button-sm adm-text-danger" onClick={remove}>
              <Trash size={14} /> Delete
            </button>
          )}
        </div>
      </header>

      {error && <div className="adm-alert is-error">{error}</div>}
      {!record && !error && <div className="adm-card adm-loading">Loading…</div>}
      {record && <ResourceForm key={String(record.id ?? "new")} sections={resource.sections} initial={record} onSave={save} isNew={isNew} />}
    </>
  );
}
