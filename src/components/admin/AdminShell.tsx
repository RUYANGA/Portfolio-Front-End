"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Award,
  Briefcase,
  ChevronRight,
  Cloud,
  Code,
  Folder,
  GraduationCap,
  InboxIcon,
  LayoutGrid,
  LogOut,
  Settings,
  ListIcon,
  UserIcon,
} from "@/components/ui/Icons";
import ThemeToggle from "@/components/ui/ThemeToggle";
import type { AdminUser } from "@/lib/admin/session";
import { FeedbackProvider, useFeedback } from "./Feedback";

export type NavCounts = Partial<Record<"projects" | "labs" | "experiences" | "skill_groups" | "education" | "certifications" | "unread_messages", number>>;

type NavItem = { href: string; label: string; icon: (p: { size?: number }) => JSX.Element; exact?: boolean; count?: keyof NavCounts; badge?: boolean };

const NAV: { title: string; items: NavItem[] }[] = [
  {
    title: "General",
    items: [
      { href: "/admin", label: "Overview", icon: LayoutGrid, exact: true },
      { href: "/admin/messages", label: "Messages", icon: InboxIcon, count: "unread_messages", badge: true },
      { href: "/admin/contact-subjects", label: "Contact subjects", icon: ListIcon },
    ],
  },
  {
    title: "Content",
    items: [
      { href: "/admin/profile", label: "Profile & site text", icon: UserIcon },
      { href: "/admin/projects", label: "Projects", icon: Folder, count: "projects" },
      { href: "/admin/labs", label: "Cloud labs", icon: Cloud, count: "labs" },
      { href: "/admin/experience", label: "Experience", icon: Briefcase, count: "experiences" },
      { href: "/admin/skills", label: "Skills", icon: Code, count: "skill_groups" },
      { href: "/admin/education", label: "Education", icon: GraduationCap, count: "education" },
      { href: "/admin/certifications", label: "Certifications", icon: Award, count: "certifications" },
    ],
  },
];

const LABELS: Record<string, string> = {
  profile: "Profile & site text",
  projects: "Projects",
  labs: "Cloud labs",
  experience: "Experience",
  skills: "Skills",
  education: "Education",
  certifications: "Certifications",
  messages: "Messages",
  "contact-subjects": "Contact subjects",
  account: "Account",
  new: "New",
};

/** /admin/projects/12 → Dashboard › Projects › Edit */
function breadcrumbs(pathname: string) {
  const parts = pathname.replace(/^\/admin\/?/, "").split("/").filter(Boolean);
  const crumbs = [{ href: "/admin", label: parts.length ? "Dashboard" : "Overview" }];
  parts.forEach((part, i) => {
    crumbs.push({ href: `/admin/${parts.slice(0, i + 1).join("/")}`, label: LABELS[part] || (i > 0 ? "Edit" : part) });
  });
  return crumbs;
}

export default function AdminShell(props: { user: AdminUser; owner: string; counts: NavCounts; children: React.ReactNode }) {
  return (
    <FeedbackProvider>
      <Shell {...props} />
    </FeedbackProvider>
  );
}

function Shell({ user, owner, counts, children }: { user: AdminUser; owner: string; counts: NavCounts; children: React.ReactNode }) {
  const displayName = owner || user.name;
  const initials = displayName.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "P";
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  const { confirmLeave, confirm } = useFeedback();

  async function signOut() {
    if (!(await confirmLeave())) return;
    if (!(await confirm({ title: "Sign out?", message: "You'll need your password to get back in.", confirmLabel: "Sign out" }))) return;
    setSigningOut(true);
    await fetch("/admin-api/auth/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/admin/login");
    router.refresh();
  }

  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));
  const crumbs = breadcrumbs(pathname);

  return (
    <div className={`adm-shell${open ? " is-nav-open" : ""}`}>
      <aside className="adm-sidebar" aria-label="Admin navigation">
        <Link href="/admin" className="adm-brand">
          <span className="adm-brand-mark" aria-hidden="true">
            {initials}
          </span>
          <span className="adm-brand-text">
            <strong>{owner || "Portfolio"}</strong>
            <small>Portfolio admin</small>
          </span>
        </Link>

        <nav className="adm-nav">
          {NAV.map((group) => (
            <div key={group.title} className="adm-nav-group">
              <p className="adm-nav-title">{group.title}</p>
              {group.items.map(({ href, label, icon: Icon, exact, count, badge }) => {
                const active = isActive(href, exact);
                const value = count ? counts[count] : undefined;
                return (
                  <Link key={href} href={href} className={`adm-nav-link${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined}>
                    <Icon size={17} />
                    <span>{label}</span>
                    {value !== undefined && (badge ? value > 0 && <span className="adm-nav-badge">{value}</span> : <span className="adm-nav-count">{value}</span>)}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="adm-sidebar-foot">
          <a href="/" target="_blank" rel="noreferrer" className="adm-site-link">
            <span className="adm-live-dot" aria-hidden="true" />
            <span>Live site</span>
            <ArrowUpRight size={14} />
          </a>
          <div className="adm-user">
            <span className="adm-avatar" aria-hidden="true">
              {initials}
            </span>
            <span className="adm-user-text">
              <strong>{user.name}</strong>
              <small>Administrator</small>
            </span>
            <Link href="/admin/account" className={`adm-icon-btn${isActive("/admin/account") ? " is-active" : ""}`} aria-label="Account settings" title="Account settings">
              <Settings size={16} />
            </Link>
            <button type="button" className="adm-icon-btn" onClick={signOut} disabled={signingOut} aria-label="Sign out" title="Sign out">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <div className="adm-main">
        <header className="adm-topbar">
          <button type="button" className="adm-icon-btn adm-menu-btn" onClick={() => setOpen((v) => !v)} aria-label="Toggle navigation" aria-expanded={open}>
            <span className="menu-icon" aria-hidden="true" />
          </button>
          <nav aria-label="Breadcrumb" className="adm-crumbs">
            <ol>
              {crumbs.map((c, i) => (
                <li key={c.href}>
                  {i > 0 && <ChevronRight size={14} />}
                  {i === crumbs.length - 1 ? <span aria-current="page">{c.label}</span> : <Link href={c.href}>{c.label}</Link>}
                </li>
              ))}
            </ol>
          </nav>
          <div className="adm-topbar-actions">
            <ThemeToggle />
            <a href="/" target="_blank" rel="noreferrer" className="button button-secondary button-sm adm-topbar-site">
              View site <ArrowUpRight size={14} />
            </a>
          </div>
        </header>
        <main id="main" className="adm-content">
          {children}
        </main>
      </div>
      <button type="button" className="adm-scrim" aria-label="Close navigation" onClick={() => setOpen(false)} tabIndex={-1} />
    </div>
  );
}
