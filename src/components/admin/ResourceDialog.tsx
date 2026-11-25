"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { XIcon } from "@/components/ui/Icons";
import { adminFetch, ApiError, buildBody, type FormValues } from "@/lib/admin/client";
import type { Record_, Resource } from "@/lib/admin/resources";
import { useFeedback } from "./Feedback";
import { FieldControl } from "./Fields";

type Props = {
  resource: Resource;
  /** The record to edit, or null to create a new one. */
  item: Record_ | null;
  onSaved: (saved: Record_, created: boolean) => void;
  onClose: () => void;
};

const snapshot = (values: FormValues) => JSON.stringify(values);

/** Create or edit a record of a small resource (no files) in a dialog instead of a separate page. */
export default function ResourceDialog({ resource, item, onSaved, onClose }: Props) {
  const { toast, confirm } = useFeedback();
  const dialog = useRef<HTMLDialogElement>(null);
  const fields = useMemo(() => resource.sections.flatMap((s) => s.fields), [resource]);
  const initial = useMemo<FormValues>(() => {
    const base: FormValues = { ...resource.defaults };
    if (item) for (const f of fields) base[f.name] = item[f.name] as FormValues[string];
    return base;
  }, [item, fields, resource.defaults]);
  const [values, setValues] = useState<FormValues>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const dirty = snapshot(values) !== snapshot(initial);
  const isNew = !item;

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  async function requestClose() {
    if (dirty && !(await confirm({ title: "Discard changes?", message: "What you typed in this dialog hasn't been saved.", confirmLabel: "Discard", danger: true }))) return;
    dialog.current?.close();
    onClose();
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!isNew && !dirty) return requestClose();
    setSaving(true);
    setErrors({});
    setFormError("");
    try {
      const body = buildBody(values, initial, fields);
      const saved = isNew
        ? await adminFetch<Record_>(`${resource.endpoint}/`, { method: "POST", body })
        : await adminFetch<Record_>(`${resource.endpoint}/${item.id}/`, { method: "PATCH", body });
      toast(isNew ? `Added “${String(saved[resource.titleField] ?? resource.singular)}”.` : "Changes saved. The site is updated.");
      dialog.current?.close();
      onSaved(saved, isNew);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields);
        setFormError(Object.keys(err.fields).length ? "" : err.message);
      } else {
        setFormError("Something went wrong while saving.");
      }
    } finally {
      setSaving(false);
    }
  }

  const title = isNew ? `New ${resource.singular}` : `Edit ${resource.singular}`;

  return (
    <dialog
      ref={dialog}
      className="adm-dialog adm-resource-dialog"
      onCancel={(e) => (e.preventDefault(), requestClose())}
      onClick={(e) => e.target === e.currentTarget && requestClose()}
      aria-labelledby="resource-dialog-title"
    >
      <form onSubmit={submit} noValidate>
        <header className="adm-subject-dialog-head">
          <div>
            <p className="adm-preview-kicker">{resource.label}</p>
            <h2 id="resource-dialog-title">{title}</h2>
          </div>
          <button type="button" className="adm-icon-btn" onClick={requestClose} aria-label="Close">
            <XIcon size={16} />
          </button>
        </header>

        <div className="adm-resource-dialog-body">
          {formError && (
            <div className="adm-alert is-error" role="alert">
              {formError}
            </div>
          )}
          {fields.map((field) => (
            <div key={field.name} data-field={field.name}>
              <FieldControl
                field={field}
                value={values[field.name]}
                error={errors[field.name]}
                onChange={(v) => {
                  setValues((current) => ({ ...current, [field.name]: v as FormValues[string] }));
                  if (errors[field.name]) setErrors(({ [field.name]: _removed, ...rest }) => rest);
                }}
              />
            </div>
          ))}
        </div>

        <footer className="adm-dialog-foot">
          <button type="button" className="button button-secondary button-sm" onClick={requestClose}>
            Cancel
          </button>
          <button type="submit" className="button button-primary button-sm" disabled={saving || (!isNew && !dirty)}>
            {saving ? "Saving…" : isNew ? `Add ${resource.singular}` : "Save changes"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
