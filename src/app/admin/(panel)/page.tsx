import Link from "next/link";
import { AlertCircle, ArrowRight, Award, Briefcase, Check, Code, Folder, GraduationCap, InboxIcon, Plus } from "@/components/ui/Icons";
import { djangoAdmin } from "@/lib/admin/session";

export const metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

type Overview = {
  counts: Record<string, number>;
  profile: { name: string; available_for_work: boolean; updated_at: string | null; has_cv: boolean; has_photo: boolean };
  recent_messages: { id: number; name: string; subject: string; message: string; is_read: boolean; created_at: string }[];
};
type Project = { id: number; title: string; featured: boolean; cover_image: string | null; problem: string; approach: string; stack: string[] };
type Profile = { meta_description: string };

async function load<T>(path: string): Promise<T | null> {
  try {
    const res = await djangoAdmin(path);
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

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
  const firstName = overview.profile.name.split(" ")[0] || "there";

  // Gaps worth fixing, each linking straight to the place to fix it.
  const issues: { text: string; href: string }[] = [];
  for (const p of projects ?? []) {
    if (p.featured && (!p.problem || !p.approach)) issues.push({ text: `“${p.title}” is featured but its case study has no ${!p.problem ? "problem" : "approach"} text`, href: `/admin/projects/${p.id}` });
    if (!p.cover_image) issues.push({ text: `“${p.title}” has no cover image`, href: `/admin/projects/${p.id}` });
    if (!p.stack?.length) issues.push({ text: `“${p.title}” has no tech stack`, href: `/admin/projects/${p.id}` });
  }
  if (!overview.profile.has_cv) issues.push({ text: "No résumé uploaded, so the Résumé buttons use the bundled copy", href: "/admin/profile" });
  if (!overview.profile.has_photo) issues.push({ text: "No profile photo", href: "/admin/profile" });
  if (profile && !profile.meta_description) issues.push({ text: "No search-engine description", href: "/admin/profile" });

  const stats = [
    { label: "Projects", value: counts.projects, note: `${counts.featured_projects} featured`, href: "/admin/projects", icon: Folder },
    { label: "Experience", value: counts.experiences, note: "roles", href: "/admin/experience", icon: Briefcase },
    { label: "Skill groups", value: counts.skill_groups, note: "in the toolkit", href: "/admin/skills", icon: Code },
    { label: "Certifications", value: counts.certifications, note: "with pictures", href: "/admin/certifications", icon: Award },
    { label: "Education", value: counts.education, note: "degrees", href: "/admin/education", icon: GraduationCap },
    { label: "Messages", value: counts.messages, note: `${counts.unread_messages} unread`, href: "/admin/messages", icon: InboxIcon },
  ];

  return (
    <>
      <header className="adm-page-head">
        <div>
          <h1>Welcome back, {firstName}</h1>
          <p>
            Everything on your portfolio is edited here. Changes go live on the site as soon as you save.
            {overview.profile.updated_at && <> Profile last updated {new Date(overview.profile.updated_at).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}.</>}
          </p>
        </div>
        <div className="adm-page-actions">
          <Link href="/admin/projects/new" className="button button-primary button-sm">
            <Plus size={16} /> New project
          </Link>
        </div>
      </header>

      <div className="adm-stats">
        {stats.map(({ label, value, note, href, icon: Icon }) => (
          <Link key={label} href={href} className="adm-card adm-stat">
            <span className="adm-stat-icon">
              <Icon size={18} />
            </span>
            <span className="adm-stat-label">{label}</span>
            <strong>{value}</strong>
            <span className="adm-stat-note">{note}</span>
          </Link>
        ))}
      </div>

      <div className="adm-overview-grid">
        <section className="adm-card adm-section">
          <header className="adm-section-head adm-section-head-row">
            <div>
              <h2>Content health</h2>
              <p>{issues.length ? `${issues.length} thing${issues.length > 1 ? "s" : ""} worth improving.` : "Everything looks complete."}</p>
            </div>
          </header>
          {issues.length ? (
            <ul className="adm-issues">
              {issues.map((issue) => (
                <li key={issue.text}>
                  <Link href={issue.href}>
                    <AlertCircle size={16} />
                    <span>{issue.text}</span>
                    <ArrowRight size={14} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="adm-all-good">
              <Check size={18} /> All projects have images, stacks and case studies.
            </p>
          )}
        </section>

        <section className="adm-card adm-section">
          <header className="adm-section-head adm-section-head-row">
            <div>
              <h2>Recent messages</h2>
              <p>{counts.unread_messages ? `${counts.unread_messages} unread` : "You're all caught up."}</p>
            </div>
            <Link href="/admin/messages" className="adm-link">
              Open inbox <ArrowRight size={14} />
            </Link>
          </header>
          {overview.recent_messages.length ? (
            <ul className="adm-recent">
              {overview.recent_messages.map((m) => (
                <li key={m.id} className={m.is_read ? "" : "is-unread"}>
                  <Link href="/admin/messages">
                    <span className="adm-recent-top">
                      <strong>{m.name}</strong>
                      <time dateTime={m.created_at}>{new Date(m.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</time>
                    </span>
                    <span className="adm-recent-text">{m.subject || m.message}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="adm-muted">No messages yet. They appear here when someone uses the contact form.</p>
          )}
        </section>
      </div>
    </>
  );
}
