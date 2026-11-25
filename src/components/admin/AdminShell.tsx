"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Award,
  Briefcase,
  Code,
  Folder,
  GraduationCap,
  InboxIcon,
  LayoutGrid,
  LogOut,
  Settings,
  UserIcon,
} from "@/components/ui/Icons";
import ThemeToggle from "@/components/ui/ThemeToggle";
import type { AdminUser } from "@/lib/admin/session";
import { FeedbackProvider, useFeedback } from "./Feedback";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutGrid, exact: true },
  { href: "/admin/profile", label: "Profile & site text", icon: UserIcon },
  { href: "/admin/projects", label: "Projects", icon: Folder },
  { href: "/admin/experience", label: "Experience", icon: Briefcase },
  { href: "/admin/skills", label: "Skills", icon: Code },
  { href: "/admin/education", label: "Education", icon: GraduationCap },
  { href: "/admin/certifications", label: "Certifications", icon: Award },
  { href: "/admin/messages", label: "Messages", icon: InboxIcon, badge: true },
];

export default function AdminShell(props: { user: AdminUser; owner: string; unread: number; children: React.ReactNode }) {
  return (
    <FeedbackProvider>
      <Shell {...props} />
    </FeedbackProvider>
  );
}

function Shell({ user, owner, unread, children }: { user: AdminUser; owner: string; unread: number; children: React.ReactNode }) {
  const initials = owner.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "P";
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

  return (
    <>
      <div className={`adm-shell${open ? " is-nav-open" : ""}`}>
        <aside className="adm-sidebar" aria-label="Admin navigation">
          <Link href="/admin" className="adm-brand">
            <span className="brand-mark" aria-hidden="true">
              {initials}
            </span>
            <span>
              <strong>{owner || "Portfolio"}</strong>
              <small>Admin dashboard</small>
            </span>
          </Link>
          <nav className="adm-nav">
            {NAV.map(({ href, label, icon: Icon, exact, badge }) => (
              <Link key={href} href={href} className={`adm-nav-link${isActive(href, exact) ? " is-active" : ""}`} aria-current={isActive(href, exact) ? "page" : undefined}>
                <Icon size={18} />
                <span>{label}</span>
                {badge && unread > 0 && <span className="adm-nav-badge">{unread}</span>}
              </Link>
            ))}
          </nav>
          <div className="adm-sidebar-foot">
            <Link href="/admin/account" className={`adm-nav-link${isActive("/admin/account") ? " is-active" : ""}`}>
              <Settings size={18} />
              <span>Account</span>
            </Link>
            <button type="button" className="adm-nav-link" onClick={signOut} disabled={signingOut}>
              <LogOut size={18} />
              <span>{signingOut ? "Signing out…" : "Sign out"}</span>
            </button>
          </div>
        </aside>

        <div className="adm-main">
          <header className="adm-topbar">
            <button type="button" className="adm-icon-btn adm-menu-btn" onClick={() => setOpen((v) => !v)} aria-label="Toggle navigation" aria-expanded={open}>
              <span className="menu-icon" aria-hidden="true" />
            </button>
            <span className="adm-topbar-user">
              Signed in as <strong>{user.name}</strong>
            </span>
            <div className="adm-topbar-actions">
              <ThemeToggle />
              <a href="/" target="_blank" rel="noreferrer" className="button button-secondary button-sm">
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
    </>
  );
}
