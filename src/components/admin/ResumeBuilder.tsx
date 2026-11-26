"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Modal from "@/components/ui/Modal";
import { AlertCircle, ArrowUpRight, Check, ChevronDown, ChevronUp, Clock, Download, Eye, FileText, Upload } from "@/components/ui/Icons";
import { adminFetch, ApiError } from "@/lib/admin/client";
import { useFeedback } from "./Feedback";
import { Bullets, Entries, Field, GrowingText } from "./resume/fields";
import { EMPTY, SECTION_META, type CvContent, type CvState, type SectionKey, type TitledKey } from "./resume/types";

const AUTOSAVE_MS = 1200;
const PREVIEW_MS = 600;
const IMPORTABLE: SectionKey[] = ["skills", "experience", "projects", "education", "certifications"];

type SaveState = "saved" | "saving" | "dirty" | "error";

function when(iso: string) {
  return new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Edit the CV as sections, see the exact PDF update live, and publish it as the site's CV. */
export default function ResumeBuilder() {
  const { toast, confirm, setUnsavedChanges } = useFeedback();
  const [state, setState] = useState<CvState | null>(null);
  const [content, setContent] = useState<CvContent | null>(null);
  const [error, setError] = useState("");
  const [save, setSave] = useState<SaveState>("saved");
  const [saveError, setSaveError] = useState("");
  const savedJson = useRef("");

  const [preview, setPreview] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [tab, setTab] = useState<"edit" | "preview">("edit");

  const [publishOpen, setPublishOpen] = useState(false);
  const [note, setNote] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await adminFetch<CvState>("resume/");
      setState(data);
      setContent(data.content);
      savedJson.current = JSON.stringify(data.content);
      setSave("saved");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't load your CV.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const json = useMemo(() => (content ? JSON.stringify(content) : ""), [content]);
  const dirty = !!content && json !== savedJson.current;

  useEffect(() => {
    setUnsavedChanges(dirty);
    return () => setUnsavedChanges(false);
  }, [dirty, setUnsavedChanges]);

  // Autosave the draft shortly after each change. The site's CV only changes on Publish.
  useEffect(() => {
    if (!content || !dirty) return;
    setSave("dirty");
    const timer = window.setTimeout(async () => {
      setSave("saving");
      try {
        const data = await adminFetch<CvState>("resume/", { method: "PUT", body: { content } });
        savedJson.current = json;
        setState((s) => (s ? { ...data, content: s.content } : data));
        setSave("saved");
        setSaveError("");
      } catch (e) {
        setSave("error");
        setSaveError(e instanceof ApiError ? e.message : "Couldn't save the draft.");
      }
    }, AUTOSAVE_MS);
    return () => window.clearTimeout(timer);
  }, [json, content, dirty]);

  // The live preview is the real PDF, rendered by the same code that publishes it.
  useEffect(() => {
    if (!content) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setPreviewing(true);
      try {
        const res = await fetch("/admin-api/resume/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
          signal: controller.signal,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setPreviewError(data.detail || `Preview failed (${res.status}).`);
          return;
        }
        const url = URL.createObjectURL(await res.blob());
        setPreview((old) => {
          if (old) URL.revokeObjectURL(old);
          return url;
        });
        setPreviewError("");
      } catch (e) {
        if ((e as Error).name !== "AbortError") setPreviewError("Couldn't reach the server for the preview.");
      } finally {
        setPreviewing(false);
      }
    }, PREVIEW_MS);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [json, content]);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const set = <K extends keyof CvContent>(key: K, value: CvContent[K]) => setContent((c) => (c ? { ...c, [key]: value } : c));
  const basic = (key: keyof CvContent["basics"]) => (value: string) => setContent((c) => (c ? { ...c, basics: { ...c.basics, [key]: value } } : c));

  function moveSection(key: SectionKey, by: number) {
    if (!content) return;
    const order = [...content.order];
    const i = order.indexOf(key);
    const j = i + by;
    if (i < 0 || j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    set("order", order);
  }
  const toggleSection = (key: SectionKey) =>
    content && set("hidden", content.hidden.includes(key) ? content.hidden.filter((k) => k !== key) : [...content.hidden, key]);

  async function importSection(key: SectionKey) {
    if (!content) return;
    const ok = await confirm({
      title: `Replace ${SECTION_META[key].title.toLowerCase()}?`,
      message: "This section will be replaced with what's in your portfolio (Experience, Projects, Skills… pages). You can undo by restoring a version from History.",
      confirmLabel: "Replace section",
    });
    if (!ok) return;
    try {
      const data = await adminFetch<{ content: CvContent }>("resume/import/");
      set(key as keyof CvContent, data.content[key as keyof CvContent] as never);
      toast(`${SECTION_META[key].title} filled from your portfolio.`);
    } catch (e) {
      toast((e as ApiError).message, "error");
    }
  }

  async function publish() {
    if (!content) return;
    setPublishing(true);
    try {
      const data = await adminFetch<CvState>("resume/publish/", { method: "POST", body: { content, note } });
      savedJson.current = JSON.stringify(content);
      setState({ ...data, content });
      setSave("saved");
      setPublishOpen(false);
      setNote("");
      toast(`Published. Visitors now get version ${data.live.version} of your CV.`);
    } catch (e) {
      toast((e as ApiError).message, "error");
    } finally {
      setPublishing(false);
    }
  }

  async function restore(number: number) {
    const ok = await confirm({
      title: `Load version ${number} into the editor?`,
      message: "Your current draft is replaced with that version. The site keeps showing the published CV until you publish again.",
      confirmLabel: "Load version",
    });
    if (!ok) return;
    try {
      const data = await adminFetch<CvState>(`resume/versions/${number}/restore/`, { method: "POST" });
      setState(data);
      setContent(data.content);
      savedJson.current = JSON.stringify(data.content);
      setHistoryOpen(false);
      toast(`Version ${number} loaded. Review it, then publish to make it live.`);
    } catch (e) {
      toast((e as ApiError).message, "error");
    }
  }

  if (error) {
    return (
      <div className="adm-alert is-error" role="alert">
        <AlertCircle size={16} /> {error}
      </div>
    );
  }
  if (!state || !content) return <p className="adm-loading">Loading your CV…</p>;

  const unpublished = state.unpublished || dirty;
  const fileName = `${content.basics.name.replace(/[^A-Za-z0-9]+/g, "_") || "CV"}_CV.pdf`;
  const title = (key: TitledKey) => content.titles[key] ?? "";

  const sectionBody: Record<SectionKey, React.ReactNode> = {
    summary: (
      <div className="adm-field">
        <GrowingText id="cv-summary" value={content.summary} onChange={(v) => set("summary", v)} rows={5} ariaLabel="Professional summary" placeholder="Backend-focused engineer with…" />
        <p className={`adm-help cv-count${content.summary.length > 2500 ? " is-over" : ""}`}>
          {content.summary.length} / 2500 characters · about {Math.max(1, Math.round(content.summary.split(/\s+/).filter(Boolean).length))} words
        </p>
      </div>
    ),
    competencies: <Bullets items={content.competencies} onChange={(v) => set("competencies", v)} label="Competency" placeholder="Scalable Backend Architecture & API Design" />,
    skills: (
      <Entries
        items={content.skills}
        onChange={(v) => set("skills", v)}
        make={EMPTY.skills}
        addLabel="Add skill group"
        summary={(s) => ({ title: s.group, meta: s.items })}
        render={(s, update) => (
          <div className="adm-grid">
            <Field label="Group" value={s.group} onChange={(group) => update({ group })} placeholder="Backend" />
            <Field label="Skills (comma-separated)" value={s.items} onChange={(items) => update({ items })} placeholder="Python, Django, FastAPI" wide />
          </div>
        )}
      />
    ),
    experience: (
      <Entries
        items={content.experience}
        onChange={(v) => set("experience", v)}
        make={EMPTY.experience}
        addLabel="Add position"
        summary={(j) => ({ title: [j.role, j.company].filter(Boolean).join(" · "), meta: j.period })}
        render={(j, update) => (
          <>
            <div className="adm-grid">
              <Field label="Role" value={j.role} onChange={(role) => update({ role })} placeholder="Backend Engineer" />
              <Field label="Company" value={j.company} onChange={(company) => update({ company })} placeholder="AmaliTech" />
              <Field label="Location" value={j.location} onChange={(location) => update({ location })} placeholder="Kigali, Rwanda" />
              <Field label="Dates" value={j.period} onChange={(period) => update({ period })} placeholder="Sept 2025 – Present" />
            </div>
            <p className="adm-label cv-sub">Achievements</p>
            <Bullets items={j.bullets} onChange={(bullets) => update({ bullets })} label="Achievement" placeholder="Designed and built…" />
          </>
        )}
      />
    ),
    projects: (
      <Entries
        items={content.projects}
        onChange={(v) => set("projects", v)}
        make={EMPTY.projects}
        addLabel="Add project"
        summary={(p) => ({ title: p.name, meta: p.subtitle })}
        render={(p, update) => (
          <>
            <div className="adm-grid">
              <Field label="Name" value={p.name} onChange={(name) => update({ name })} placeholder="INUMA" />
              <Field label="Subtitle" value={p.subtitle} onChange={(subtitle) => update({ subtitle })} placeholder="Request Flow Management System" />
              <Field label="Link" value={p.link} onChange={(link) => update({ link })} placeholder="https://inuma.ur.ac.rw" type="url" />
              <Field label="Stack" value={p.tech} onChange={(tech) => update({ tech })} placeholder="Node.js, NestJS, PostgreSQL" />
            </div>
            <p className="adm-label cv-sub">Highlights</p>
            <Bullets items={p.bullets} onChange={(bullets) => update({ bullets })} label="Highlight" placeholder="Built a…" />
          </>
        )}
      />
    ),
    education: (
      <Entries
        items={content.education}
        onChange={(v) => set("education", v)}
        make={EMPTY.education}
        addLabel="Add education"
        summary={(e) => ({ title: e.degree, meta: e.school })}
        render={(e, update) => (
          <div className="adm-grid">
            <Field label="Degree" value={e.degree} onChange={(degree) => update({ degree })} wide />
            <Field label="School" value={e.school} onChange={(school) => update({ school })} />
            <Field label="Dates (optional)" value={e.period} onChange={(period) => update({ period })} placeholder="2021 – 2025" />
            <Field label="Relevant coursework" value={e.coursework} onChange={(coursework) => update({ coursework })} wide />
          </div>
        )}
      />
    ),
    certifications: (
      <Entries
        items={content.certifications}
        onChange={(v) => set("certifications", v)}
        make={EMPTY.certifications}
        addLabel="Add certification"
        summary={(c) => ({ title: c.name, meta: [c.issuer, c.year].filter(Boolean).join(" · ") })}
        render={(c, update) => (
          <div className="adm-grid">
            <Field label="Name" value={c.name} onChange={(name) => update({ name })} wide />
            <Field label="Issuer (optional)" value={c.issuer} onChange={(issuer) => update({ issuer })} />
            <Field label="Year (optional)" value={c.year} onChange={(year) => update({ year })} placeholder="2026" />
          </div>
        )}
      />
    ),
    extra: (
      <Entries
        items={content.extra}
        onChange={(v) => set("extra", v)}
        make={EMPTY.extra}
        addLabel="Add section"
        summary={(x) => ({ title: x.title, meta: `${x.bullets.filter(Boolean).length} bullets` })}
        render={(x, update) => (
          <>
            <Field label="Section heading" value={x.title} onChange={(t) => update({ title: t })} placeholder="Engineering approach" />
            <p className="adm-label cv-sub">Bullet points</p>
            <Bullets items={x.bullets} onChange={(bullets) => update({ bullets })} />
          </>
        )}
      />
    ),
  };

  return (
    <div className="cv-page">
      <header className="adm-page-head">
        <div>
          <p className="adm-eyebrow">Content</p>
          <h1>CV</h1>
          <p>Edit your CV section by section. The preview is the exact PDF; publish to make it the résumé visitors view and download.</p>
        </div>
        <div className="adm-page-actions">
          <button type="button" className="button button-secondary button-sm" onClick={() => setHistoryOpen(true)}>
            <Clock size={15} /> History{state.versions.length ? ` (${state.versions.length})` : ""}
          </button>
          {preview && (
            <a className="button button-secondary button-sm" href={preview} download={fileName}>
              <Download size={15} /> Download draft
            </a>
          )}
          <button type="button" className="button button-primary button-sm" onClick={() => setPublishOpen(true)} disabled={!unpublished || save === "error"}>
            <Upload size={15} /> Publish
          </button>
        </div>
      </header>

      <div className="cv-statusbar" aria-live="polite">
        <span className={`cv-live is-${state.live.source}`}>
          <span className="cv-live-dot" aria-hidden="true" />
          {state.live.source === "builder" && <>Live on the site: version {state.live.version}</>}
          {state.live.source === "upload" && <>Live on the site: a PDF uploaded under Profile</>}
          {state.live.source === "none" && <>No CV on the site yet</>}
          {state.live.url && (
            <a href={state.live.url} target="_blank" rel="noreferrer" className="cv-live-link">
              Open <ArrowUpRight size={13} />
            </a>
          )}
        </span>
        <span className="cv-badges">
          {unpublished ? <span className="adm-badge is-accent">Unpublished changes</span> : <span className="adm-badge is-live">Up to date</span>}
          <span className={`cv-save is-${save}`}>
            {save === "saving" && "Saving draft…"}
            {save === "dirty" && "Editing…"}
            {save === "saved" && (
              <>
                <Check size={13} /> Draft saved
              </>
            )}
            {save === "error" && (
              <>
                <AlertCircle size={13} /> {saveError}
              </>
            )}
          </span>
        </span>
      </div>

      <div className="cv-tabs adm-segmented" role="tablist" aria-label="View">
        <button type="button" role="tab" aria-selected={tab === "edit"} onClick={() => setTab("edit")}>
          <FileText size={15} /> Edit
        </button>
        <button type="button" role="tab" aria-selected={tab === "preview"} onClick={() => setTab("preview")}>
          <Eye size={15} /> Preview
        </button>
      </div>

      <div className={`cv-layout is-${tab}`}>
        <div className="cv-editor">
          <section className="adm-card adm-section">
            <div className="adm-section-head">
              <h2>Header</h2>
              <p>Your name, title and contact lines, centred at the top of the CV.</p>
            </div>
            <div className="adm-grid">
              <Field label="Full name" value={content.basics.name} onChange={basic("name")} />
              <Field label="Title line" value={content.basics.title} onChange={basic("title")} placeholder="Backend Engineer | Full-Stack Developer" />
              <Field label="Location" value={content.basics.location} onChange={basic("location")} />
              <Field label="Phone" value={content.basics.phone} onChange={basic("phone")} type="tel" />
              <Field label="Email" value={content.basics.email} onChange={basic("email")} type="email" />
              <Field label="Portfolio" value={content.basics.website} onChange={basic("website")} type="url" placeholder="https://ruyanga.tech" />
              <Field label="GitHub" value={content.basics.github} onChange={basic("github")} type="url" />
              <Field label="LinkedIn" value={content.basics.linkedin} onChange={basic("linkedin")} type="url" />
            </div>
          </section>

          {content.order.map((key, index) => {
            const hidden = content.hidden.includes(key);
            const meta = SECTION_META[key];
            return (
              <section key={key} className={`adm-card adm-section cv-section${hidden ? " is-hidden" : ""}`}>
                <div className="cv-section-head">
                  <div className="cv-section-title">
                    {key === "extra" ? (
                      <h2>{meta.title}</h2>
                    ) : (
                      <input
                        className="cv-heading-input"
                        value={title(key)}
                        placeholder={meta.title}
                        onChange={(e) => set("titles", { ...content.titles, [key]: e.target.value })}
                        aria-label={`Heading for ${meta.title} (shown in capitals on the CV)`}
                        title="Rename this heading"
                      />
                    )}
                    <p>{meta.hint}</p>
                  </div>
                  <div className="cv-section-tools">
                    {IMPORTABLE.includes(key) && (
                      <button type="button" className="cv-text-btn" onClick={() => importSection(key)} title="Replace with data from your portfolio">
                        Fill from portfolio
                      </button>
                    )}
                    <label className="cv-show">
                      <input type="checkbox" checked={!hidden} onChange={() => toggleSection(key)} />
                      <span>Show</span>
                    </label>
                    <button type="button" className="adm-icon-btn" onClick={() => moveSection(key, -1)} disabled={index === 0} aria-label={`Move ${meta.title} up`} title="Move section up">
                      <ChevronUp size={16} />
                    </button>
                    <button
                      type="button"
                      className="adm-icon-btn"
                      onClick={() => moveSection(key, 1)}
                      disabled={index === content.order.length - 1}
                      aria-label={`Move ${meta.title} down`}
                      title="Move section down"
                    >
                      <ChevronDown size={16} />
                    </button>
                  </div>
                </div>
                {!hidden && sectionBody[key]}
                {hidden && <p className="adm-help">Hidden from the CV. Tick “Show” to include it again.</p>}
              </section>
            );
          })}
        </div>

        <aside className="cv-preview" aria-label="PDF preview">
          <div className="cv-preview-bar">
            <strong>Preview</strong>
            <span className="cv-preview-state">
              {previewing ? "Updating…" : previewError ? <span className="cv-preview-error">{previewError}</span> : "Exactly what will be published"}
            </span>
            {preview && (
              <a href={preview} target="_blank" rel="noreferrer" className="cv-text-btn">
                Open <ArrowUpRight size={13} />
              </a>
            )}
          </div>
          <div className={`cv-paper${previewing ? " is-busy" : ""}`}>
            {preview ? <iframe src={`${preview}#toolbar=0&navpanes=0&view=FitH`} title="CV preview" /> : <p className="adm-loading">Rendering preview…</p>}
          </div>
        </aside>
      </div>

      <Modal
        open={publishOpen}
        onClose={() => !publishing && setPublishOpen(false)}
        title="Publish your CV?"
        description="Visitors get this version immediately when they view or download your résumé."
        footer={
          <>
            <button type="button" className="button button-secondary button-sm" onClick={() => setPublishOpen(false)} disabled={publishing}>
              Cancel
            </button>
            <button type="button" className="button button-primary button-sm" onClick={publish} disabled={publishing}>
              <Upload size={15} /> {publishing ? "Publishing…" : `Publish version ${(state.versions[0]?.number ?? 0) + 1}`}
            </button>
          </>
        }
      >
        <div className="adm-field">
          <label className="adm-label" htmlFor="cv-note">
            What changed? <span className="adm-muted">(optional, for your history)</span>
          </label>
          <input id="cv-note" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="Added AmaliTech role, updated summary" />
        </div>
        {state.live.source === "upload" && (
          <p className="adm-help cv-note">The PDF you uploaded under Profile is replaced on the site. It isn&apos;t deleted.</p>
        )}
      </Modal>

      <Modal open={historyOpen} onClose={() => setHistoryOpen(false)} title="Published versions" description="Every publish is kept. Open any version, or load it back into the editor." size="lg">
        {state.versions.length ? (
          <ul className="cv-history">
            {state.versions.map((v) => (
              <li key={v.number}>
                <span className="cv-history-num">v{v.number}</span>
                <span className="cv-history-main">
                  <strong>
                    {v.note || "No description"} {v.live && <span className="adm-badge is-live">Live</span>}
                  </strong>
                  <small>{when(v.created_at)}</small>
                </span>
                <a className="button button-secondary button-sm" href={v.url} target="_blank" rel="noreferrer">
                  Open PDF
                </a>
                <button type="button" className="button button-quiet button-sm" onClick={() => restore(v.number)}>
                  Load into editor
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="adm-muted">Nothing published from here yet. Your first publish becomes version 1.</p>
        )}
      </Modal>
    </div>
  );
}
