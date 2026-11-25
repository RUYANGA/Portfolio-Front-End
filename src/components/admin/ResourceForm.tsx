"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ApiError, slugify, type FormValues } from "@/lib/admin/client";
import type { Section } from "@/lib/admin/resources";
import { useFeedback } from "./Feedback";
import { FieldControl } from "./Fields";

type Props = {
  sections: Section[];
  initial: FormValues;
  /** Persist the values; return the saved record so the form resets to it. */
  onSave: (values: FormValues, original: FormValues) => Promise<FormValues>;
  isNew?: boolean;
  saveLabel?: string;
  aside?: React.ReactNode;
};

/** Serialise for dirty-checking; Files compare by name/size so a new upload counts as a change. */
function snapshot(values: FormValues) {
  return JSON.stringify(values, (_k, v) => (v instanceof File ? `file:${v.name}:${v.size}` : v));
}

export default function ResourceForm({ sections, initial, onSave, isNew, saveLabel, aside }: Props) {
  const { toast, setUnsavedChanges } = useFeedback();
  const [values, setValues] = useState<FormValues>(initial);
  const [saved, setSaved] = useState<FormValues>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const slugTouched = useRef<Record<string, boolean>>({});
  const formId = useId();

  const fields = useMemo(() => sections.flatMap((s) => s.fields), [sections]);
  const dirty = isNew || snapshot(values) !== snapshot(saved);

  // Anything typed counts as unsaved work (on new records too), for the leave-page guard.
  const touched = snapshot(values) !== snapshot(saved);
  useEffect(() => {
    setUnsavedChanges(touched);
    return () => setUnsavedChanges(false);
  }, [touched, setUnsavedChanges]);

  // Ctrl/⌘+S saves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (dirty && !busy) (document.getElementById(formId) as HTMLFormElement | null)?.requestSubmit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dirty, busy, formId]);

  // Warn before closing the tab with unsaved changes.
  useEffect(() => {
    if (!dirty || isNew) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, isNew]);

  const update = (name: string, value: unknown) => {
    setValues((current) => {
      const next = { ...current, [name]: value };
      // Slugs follow their source field on new records until edited by hand.
      for (const f of fields) {
        if (f.type === "slug" && f.from === name && isNew && !slugTouched.current[f.name]) {
          next[f.name] = slugify(String(value || ""));
        }
      }
      return next;
    });
    if (fields.find((f) => f.name === name)?.type === "slug") slugTouched.current[name] = true;
    if (errors[name]) setErrors(({ [name]: _removed, ...rest }) => rest);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError("");
    setErrors({});
    try {
      const result = await onSave(values, saved);
      setValues(result);
      setSaved(result);
      toast(isNew ? "Created." : "Changes saved. The site is updated.");
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields);
        setFormError(err.message);
        toast(err.message, "error");
        const first = Object.keys(err.fields)[0];
        if (first) document.querySelector<HTMLElement>(`[data-field="${first}"] input, [data-field="${first}"] textarea, [data-field="${first}"] select`)?.focus();
      } else {
        setFormError("Something went wrong while saving.");
        toast("Something went wrong while saving.", "error");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="adm-form">
      <div className={`adm-form-layout${aside ? " has-aside" : ""}`}>
        <form id={formId} className="adm-form-main" onSubmit={submit} noValidate>
          {formError && (
            <div className="adm-alert is-error" role="alert">
              {formError}
            </div>
          )}
          {sections.map((section) => (
            <section key={section.title} className="adm-card adm-section">
              <header className="adm-section-head">
                <h2>{section.title}</h2>
                {section.description && <p>{section.description}</p>}
              </header>
              <div className="adm-grid">
                {section.fields.map((field) => (
                  <div key={field.name} data-field={field.name} className={field.half ? "is-half" : "is-full"}>
                    <FieldControl field={field} value={values[field.name]} error={errors[field.name]} onChange={(v) => update(field.name, v)} />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </form>
        {aside && <aside className="adm-form-aside">{aside}</aside>}
      </div>

      <div className={`adm-savebar${dirty ? " is-dirty" : ""}`}>
        <span className="adm-savebar-status">
          {isNew ? "New record" : dirty ? "You have unsaved changes" : "All changes saved"}
          <kbd className="adm-kbd" aria-hidden="true">
            Ctrl S
          </kbd>
        </span>
        <div className="adm-savebar-actions">
          {!isNew && (
            <button type="button" className="button button-secondary button-sm" disabled={!dirty || busy} onClick={() => (setValues(saved), setErrors({}), setFormError(""))}>
              Discard
            </button>
          )}
          <button type="submit" form={formId} className="button button-primary button-sm" disabled={!dirty || busy}>
            {busy ? "Saving…" : saveLabel || (isNew ? "Create" : "Save changes")}
          </button>
        </div>
      </div>
    </div>
  );
}
