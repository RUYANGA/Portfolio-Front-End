"use client";

import { useEffect, useId, useRef, useState } from "react";
import Modal from "@/components/ui/Modal";
import { ChevronDown, ChevronUp, FileText, Plus, Upload, XIcon } from "@/components/ui/Icons";
import TechIcon from "@/components/ui/TechIcon";
import type { Field } from "@/lib/admin/resources";
import { useFeedback } from "./Feedback";

/** Uploads pass through Vercel, which caps request bodies at 4.5 MB. */
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_IMAGE_SIDE = 2400;

/** Shrink large photos in the browser (max 2400px, JPEG) so they fit the upload limit. */
async function prepareUpload(file: File, isImage: boolean): Promise<File> {
  const resizable = isImage && /^image\/(jpeg|png|webp)$/.test(file.type);
  if (resizable && file.size > 1.5 * 1024 * 1024) {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff"; // JPEG has no transparency
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (blob && blob.size < file.size) {
      file = new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
    }
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    throw new Error(`This file is ${mb} MB. The limit is 4 MB${isImage ? "" : ", so compress the PDF first"}.`);
  }
  return file;
}

type FieldProps = {
  field: Field;
  value: unknown;
  error?: string;
  onChange: (value: unknown) => void;
};

/** One form control, chosen by the field's type, with its label, help text and error. */
export function FieldControl({ field, value, error, onChange }: FieldProps) {
  const id = useId();
  const describedBy = [field.help && `${id}-help`, error && `${id}-err`].filter(Boolean).join(" ") || undefined;
  const common = {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
  } as const;

  let control: React.ReactNode;
  switch (field.type) {
    case "textarea":
      control = (
        <textarea
          {...common}
          rows={field.rows || 4}
          value={(value as string) ?? ""}
          placeholder={field.placeholder}
          required={field.required}
          onChange={(e) => onChange(e.target.value)}
        />
      );
      break;
    case "checkbox":
      return (
        <div className={`adm-field adm-field-check${field.half ? " is-half" : ""}`}>
          <label className="adm-switch" htmlFor={id}>
            <input {...common} type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
            <span className="adm-switch-track" aria-hidden="true" />
            <span className="adm-switch-text">
              <span className="adm-label">{field.label}</span>
              {field.help && (
                <span id={`${id}-help`} className="adm-help">
                  {field.help}
                </span>
              )}
            </span>
          </label>
          {error && <span id={`${id}-err`} className="adm-error">{error}</span>}
        </div>
      );
    case "select":
      control = (
        <select {...common} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)}>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
      break;
    case "number":
      control = (
        <input
          {...common}
          type="number"
          min={0}
          value={value === null || value === undefined ? "" : String(value)}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
      );
      break;
    case "tags":
      control = <TagsInput {...common} value={(value as string[]) || []} onChange={onChange} placeholder={field.placeholder} techIcons={field.techIcons} />;
      break;
    case "lines":
      control = <LinesInput value={(value as string[]) || []} onChange={onChange} label={field.label} />;
      break;
    case "image":
    case "file":
      control = <FileInput field={field} value={value as string | File | null} onChange={onChange} inputId={id} />;
      break;
    default:
      control = (
        <input
          {...common}
          type={field.type === "url" ? "url" : field.type === "email" ? "email" : "text"}
          value={(value as string) ?? ""}
          placeholder={field.placeholder}
          required={field.required}
          spellCheck={field.type === "slug" || field.type === "url" || field.type === "email" ? false : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }

  return (
    <div className={`adm-field${field.half ? " is-half" : ""}`}>
      <label className="adm-label" htmlFor={id}>
        {field.label}
        {field.required && <span className="adm-required" aria-hidden="true"> *</span>}
      </label>
      {control}
      {field.help && (
        <span id={`${id}-help`} className="adm-help">
          {field.help}
        </span>
      )}
      {error && (
        <span id={`${id}-err`} className="adm-error">
          {error}
        </span>
      )}
    </div>
  );
}

/* ---------- Tags: chips with an inline input ---------- */
function TagsInput({
  value,
  onChange,
  placeholder,
  techIcons,
  ...rest
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  techIcons?: boolean;
  id: string;
}) {
  const [draft, setDraft] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const add = (raw: string) => {
    const items = raw.split(",").map((s) => s.trim()).filter(Boolean);
    const next = [...value];
    for (const item of items) if (!next.some((v) => v.toLowerCase() === item.toLowerCase())) next.push(item);
    onChange(next);
    setDraft("");
  };

  return (
    <div className="adm-tags" onClick={() => input.current?.focus()}>
      {value.map((tag, i) => (
        <span key={tag} className="adm-tag">
          {techIcons && <TechIcon name={tag} size={13} />}
          {tag}
          <button
            type="button"
            aria-label={`Remove ${tag}`}
            onClick={(e) => {
              e.stopPropagation();
              onChange(value.filter((_, j) => j !== i));
            }}
          >
            <XIcon size={12} />
          </button>
        </span>
      ))}
      <input
        {...rest}
        ref={input}
        value={draft}
        placeholder={value.length ? "" : placeholder || "Type and press Enter"}
        onChange={(e) => (e.target.value.includes(",") ? add(e.target.value) : setDraft(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (draft.trim()) add(draft);
          } else if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => draft.trim() && add(draft)}
      />
    </div>
  );
}

/* ---------- Lines: an ordered list of short texts ---------- */
function LinesInput({ value, onChange, label }: { value: string[]; onChange: (v: string[]) => void; label: string }) {
  const set = (i: number, text: string) => onChange(value.map((v, j) => (j === i ? text : v)));
  const move = (i: number, dir: -1 | 1) => {
    const next = [...value];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    onChange(next);
  };
  return (
    <div className="adm-lines">
      {value.map((line, i) => (
        <div key={i} className="adm-line">
          <span className="adm-line-num" aria-hidden="true">
            {i + 1}
          </span>
          <textarea rows={2} value={line} onChange={(e) => set(i, e.target.value)} aria-label={`${label} ${i + 1}`} />
          <div className="adm-line-actions">
            <button type="button" className="adm-icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">
              <ChevronUp size={15} />
            </button>
            <button type="button" className="adm-icon-btn" onClick={() => move(i, 1)} disabled={i === value.length - 1} aria-label="Move down">
              <ChevronDown size={15} />
            </button>
            <button type="button" className="adm-icon-btn is-danger" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remove">
              <XIcon size={15} />
            </button>
          </div>
        </div>
      ))}
      <button type="button" className="button button-secondary button-sm" onClick={() => onChange([...value, ""])}>
        <Plus size={15} /> Add item
      </button>
    </div>
  );
}

/* ---------- Image / file upload with preview ---------- */
function FileInput({
  field,
  value,
  onChange,
  inputId,
}: {
  field: Field;
  value: string | File | null;
  onChange: (v: File | null) => void;
  inputId: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const { toast } = useFeedback();
  const isImage = field.type === "image";

  async function choose(file: File) {
    setPreparing(true);
    try {
      onChange(await prepareUpload(file, isImage));
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setPreparing(false);
    }
  }

  useEffect(() => {
    if (value instanceof File && isImage) {
      const url = URL.createObjectURL(value);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreview(typeof value === "string" ? value : null);
  }, [value, isImage]);

  const name = value instanceof File ? value.name : typeof value === "string" ? decodeURIComponent(value.split("/").pop() || "") : "";

  return (
    <div
      className={`adm-file${isImage ? " is-image" : ""}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) choose(file);
      }}
    >
      {value ? (
        <div className="adm-file-current">
          {isImage && preview ? (
            <button type="button" className="adm-file-zoom" onClick={() => setZoomed(true)} aria-label="Enlarge image">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="" />
            </button>
          ) : (
            <span className="adm-file-icon">
              <FileText size={22} />
            </span>
          )}
          <div className="adm-file-meta">
            {typeof value === "string" ? (
              <a href={value} target="_blank" rel="noreferrer">
                {name}
              </a>
            ) : (
              <strong>{name}</strong>
            )}
            <span>
              {preparing
                ? "Preparing…"
                : value instanceof File
                  ? `Ready to upload when you save (${(value.size / 1024).toFixed(0)} KB)`
                  : "Current file"}
            </span>
            <div className="adm-file-actions">
              <button type="button" className="button button-secondary button-sm" onClick={() => input.current?.click()}>
                <Upload size={14} /> Replace
              </button>
              <button type="button" className="button button-secondary button-sm adm-text-danger" onClick={() => onChange(null)}>
                <XIcon size={14} /> Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button type="button" className="adm-dropzone" onClick={() => input.current?.click()}>
          <Upload size={20} />
          <span>
            <strong>Choose a file</strong> or drag it here
          </span>
          <small>
            {preparing ? "Preparing…" : `${isImage ? "JPG, PNG or WebP. Large photos are resized" : field.accept === "application/pdf" ? "PDF" : "Any file"}, up to 4 MB`}
          </small>
        </button>
      )}
      {isImage && preview && (
        <Modal open={zoomed} onClose={() => setZoomed(false)} title={field.label} description={name} size="xl" flush>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="zoomable-full" src={preview} alt="" />
        </Modal>
      )}
      <input
        ref={input}
        id={inputId}
        type="file"
        hidden
        accept={field.accept || (isImage ? "image/*" : undefined)}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) choose(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
