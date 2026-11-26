import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Award,
  Briefcase,
  Check,
  Cloud,
  Code,
  FileText,
  Folder,
  InboxIcon,
  Plus,
  Star,
  UserIcon,
} from "@/components/ui/Icons";
import { djangoAdmin } from "@/lib/admin/session";

export const metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

type Overview = {
  counts: Record<string, number>;
  profile: { name: string; available_for_work: boolean; updated_at: string | null; has_cv: boolean; has_photo: boolean };
  recent_messages: { id: number; name: string; subject: string; message: string; is_read: boolean; created_at: string }[];
};
type Project = { id: number; title: string; slug: string; status: string; featured: boolean; cover_image: string | null; problem: string; approach: string; stack: string[] };
type Profile = { meta_description: string };

const STATUS: Record<string, { label: string; tone: string }> = {
  production: { label: "In production", tone: "is-live" },
  completed: { label: "Completed", tone: "is-accent" },
  in_progress: { label: "In progress", tone: "" },
};

async function load<T>(path: string): Promise<T | null> {
  try {
    const res = await djangoAdmin(path);
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

const formatDate = (iso: string, opts: Intl.DateTimeFormatOptions) => new Date(iso).toLocaleDateString("en-GB", opts);

export default async function OverviewPage() {
  const [overview, projects, profile] = await Promise.all([
    load<Overview>("overview/"),
    load<Project[]>("projects/"),
    load<Profile>("profile/"),
  ]);

  if (!overview) {
    return <div className="adm-alert is-error">The API didn&apos;t respond. Check that the backend is running.</div>;
  }
  const { counts } = overview;
  const list = projects ?? [];
  const firstName = overview.profile.name.split(" ")[0] || "there";
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  // Completeness checklist: each item is done or links straight to the place to fix it.
  const missingCover = list.filter((p) => !p.cover_image);
  const missingStack = list.filter((p) => !p.stack?.length);
  const thinCaseStudy = list.filter((p) => p.featured && (!p.problem || !p.approach));
  const checks = [
    { label: "Profile photo", done: overview.profile.has_photo, hint: "Add a photo to your profile", href: "/admin/profile" },
    { label: "Résumé uploaded", done: overview.profile.has_cv, hint: "The Résumé buttons use the bundled copy", href: "/admin/profile" },
    { label: "Search-engine description", done: Boolean(profile?.meta_description), hint: "Shown in Google results and link previews", href: "/admin/profile" },
    {
      label: "Project cover images",
      done: !missingCover.length,
      hint: missingCover.map((p) => p.title).join(", "),
      href: missingCover[0] ? `/admin/projects/${missingCover[0].id}` : "/admin/projects",
    },
    {
      label: "Project tech stacks",
      done: !missingStack.length,
      hint: missingStack.map((p) => p.title).join(", "),
      href: missingStack[0] ? `/admin/projects/${missingStack[0].id}` : "/admin/projects",
    },
    {
      label: "Featured case studies complete",
      done: !thinCaseStudy.length,
      hint: thinCaseStudy.map((p) => `${p.title}: add the ${!p.problem ? "problem" : "approach"}`).join(", "),
      href: thinCaseStudy[0] ? `/admin/projects/${thinCaseStudy[0].id}` : "/admin/projects",
    },
  ];
  const done = checks.filter((c) => c.done).length;
  const score = Math.round((done / checks.length) * 100);

  const stats = [
    { label: "Projects", value: counts.projects, note: `${counts.featured_projects} featured`, href: "/admin/projects", icon: Folder },
    { label: "Experience", value: counts.experiences, note: counts.experiences === 1 ? "role" : "roles", href: "/admin/experience", icon: Briefcase },
    { label: "Skill groups", value: counts.skill_groups, note: "in the toolkit", href: "/admin/skills", icon: Code },
    { label: "Certifications", value: counts.certifications, note: "on the site", href: "/admin/certifications", icon: Award },
    { label: "Cloud labs", value: counts.labs ?? 0, note: "hands-on builds", href: "/admin/labs", icon: Cloud },
    { label: "Messages", value: counts.messages, note: `${counts.unread_messages} unread`, href: "/admin/messages", icon: InboxIcon, highlight: counts.unread_messages > 0 },
  ];

  const actions = [
    { label: "New project", href: "/admin/projects/new", icon: Folder },
    { label: "Add cloud lab", href: "/admin/labs/new", icon: Cloud },
    { label: "Add certification", href: "/admin/certifications/new", icon: Award },
    { label: "Add experience", href: "/admin/experience/new", icon: Briefcase },
    { label: "Edit profile", href: "/admin/profile", icon: UserIcon },
  ];

  return (
    <>
      <header className="adm-page-head">
        <div>
          <p className="adm-eyebrow">{today}</p>
          <h1>Welcome back, {firstName}</h1>
          <p>Here&apos;s what&apos;s on your portfolio. Changes go live on the site as soon as you save.</p>
        </div>
        <div className="adm-page-actions">
          <Link href="/admin/projects/new" className="button button-primary button-sm">
            <Plus size={16} /> New project
          </Link>
        </div>
      </header>

      <div className="adm-card adm-kpis">
        {stats.map(({ label, value, note, href, icon: Icon, highlight }) => (
          <Link key={label} href={href} className={`adm-kpi${highlight ? " is-highlight" : ""}`}>
            <span className="adm-kpi-label">
              <Icon size={15} />
              {label}
            </span>
            <strong>{value ?? 0}</strong>
            <span className="adm-kpi-note">{note}</span>
          </Link>
        ))}
      </div>

      <div className="adm-dash">
        <div className="adm-dash-main">
          <section className="adm-card adm-panel">
            <header className="adm-panel-head">
              <div>
                <h2>Projects</h2>
                <p>
                  {list.length} total · {counts.featured_projects} featured on the homepage
                </p>
              </div>
              <Link href="/admin/projects" className="adm-link">
                Manage <ArrowRight size={14} />
              </Link>
            </header>
            {list.length ? (
              <ul className="adm-table">
                {list.map((p) => (
                  <li key={p.id}>
                    <Link href={`/admin/projects/${p.id}`} className="adm-table-row">
                      <span className="adm-table-thumb">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {p.cover_image ? <img src={p.cover_image} alt="" loading="lazy" /> : <Folder size={16} />}
                      </span>
                      <span className="adm-table-title">
                        <strong>{p.title}</strong>
                        <small>/projects/{p.slug}</small>
                      </span>
                      <span className="adm-table-meta">
                        {p.featured && (
                          <span className="adm-featured" title="Featured on the homepage">
                            <Star size={13} /> Featured
                          </span>
                        )}
                        <span className={`adm-badge ${STATUS[p.status]?.tone ?? ""}`}>{STATUS[p.status]?.label ?? p.status}</span>
                      </span>
                      <ArrowRight size={14} className="adm-table-go" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="adm-panel-empty">
                <p>No projects yet.</p>
                <Link href="/admin/projects/new" className="button button-primary button-sm">
                  <Plus size={16} /> Add your first project
                </Link>
              </div>
            )}
          </section>

          <section className="adm-card adm-panel">
            <header className="adm-panel-head">
              <div>
                <h2>Content health</h2>
                <p>{done === checks.length ? "Everything is complete." : `${checks.length - done} of ${checks.length} checks need attention.`}</p>
              </div>
              <span className={`adm-score${score === 100 ? " is-complete" : ""}`}>{score}%</span>
            </header>
            <div className="adm-progress" role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100} aria-label="Content completeness">
              <span style={{ width: `${score}%` }} />
            </div>
            <ul className="adm-checks">
              {checks.map((c) => (
                <li key={c.label} className={c.done ? "is-done" : "is-todo"}>
                  {c.done ? (
                    <div className="adm-check">
                      <span className="adm-check-icon">
                        <Check size={13} />
                      </span>
                      <span className="adm-check-text">
                        <strong>{c.label}</strong>
                      </span>
                    </div>
                  ) : (
                    <Link href={c.href} className="adm-check">
                      <span className="adm-check-icon">
                        <AlertCircle size={14} />
                      </span>
                      <span className="adm-check-text">
                        <strong>{c.label}</strong>
                        {c.hint && <small>{c.hint}</small>}
                      </span>
                      <span className="adm-check-fix">
                        Fix <ArrowRight size={13} />
                      </span>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="adm-dash-side">
          <section className="adm-card adm-panel">
            <header className="adm-panel-head">
              <div>
                <h2>Site status</h2>
              </div>
              <Link href="/admin/profile" className="adm-link">
                Edit <ArrowRight size={14} />
              </Link>
            </header>
            <dl className="adm-status">
              <div>
                <dt>Availability</dt>
                <dd>
                  <span className={`adm-badge ${overview.profile.available_for_work ? "is-live" : ""}`}>{overview.profile.available_for_work ? "Open to work" : "Not available"}</span>
                </dd>
              </div>
              <div>
                <dt>Résumé</dt>
                <dd>
                  <FileText size={14} /> {overview.profile.has_cv ? "Uploaded" : "Bundled copy"}
                </dd>
              </div>
              <div>
                <dt>Profile photo</dt>
                <dd>{overview.profile.has_photo ? "Uploaded" : "Not set"}</dd>
              </div>
              <div>
                <dt>Last updated</dt>
                <dd>{overview.profile.updated_at ? formatDate(overview.profile.updated_at, { day: "numeric", month: "short", year: "numeric" }) : "Never"}</dd>
              </div>
            </dl>
          </section>

          <section className="adm-card adm-panel">
            <header className="adm-panel-head">
              <div>
                <h2>Quick actions</h2>
              </div>
            </header>
            <div className="adm-actions">
              {actions.map(({ label, href, icon: Icon }) => (
                <Link key={label} href={href} className="adm-action">
                  <span className="adm-action-icon">
                    <Icon size={16} />
                  </span>
                  {label}
                </Link>
              ))}
            </div>
          </section>

          <section className="adm-card adm-panel">
            <header className="adm-panel-head">
              <div>
                <h2>Recent messages</h2>
                <p>{counts.unread_messages ? `${counts.unread_messages} unread` : "You're all caught up."}</p>
              </div>
              <Link href="/admin/messages" className="adm-link">
                Inbox <ArrowRight size={14} />
              </Link>
            </header>
            {overview.recent_messages.length ? (
              <ul className="adm-recent">
                {overview.recent_messages.map((m) => (
                  <li key={m.id} className={m.is_read ? "" : "is-unread"}>
                    <Link href="/admin/messages">
                      <span className="adm-recent-top">
                        <strong>{m.name}</strong>
                        <time dateTime={m.created_at}>{formatDate(m.created_at, { day: "numeric", month: "short" })}</time>
                      </span>
                      <span className="adm-recent-text">{m.subject || m.message}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="adm-panel-empty is-quiet">
                <span className="adm-empty-icon">
                  <InboxIcon size={18} />
                </span>
                <p>No messages yet. They appear here when someone uses the contact form.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
