import Link from "next/link";
import type { Profile } from "@/lib/api/types";
import { SocialIcon } from "@/components/ui/Icons";

const NAV = [
  { href: "/#about", label: "About" },
  { href: "/#experience", label: "Experience" },
  { href: "/#projects", label: "Projects" },
  { href: "/#skills", label: "Skills" },
  { href: "/#contact", label: "Contact" },
];

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export default function Footer({ profile }: { profile: Profile }) {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="wrap footer-grid">
        <div className="footer-brand">
          <Link href="/" className="brand">
            <span className="brand-mark" aria-hidden="true">{initials(profile.name)}</span>
            <span>{profile.name}</span>
          </Link>
          <p>
            {profile.title} based in {profile.location}. Building reliable backend systems for institutions and teams.
          </p>
        </div>
        <nav className="footer-nav" aria-label="Footer">
          <p className="footer-heading">Navigate</p>
          <ul>
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href}>{n.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="footer-nav">
          <p className="footer-heading">Connect</p>
          <ul>
            {profile.socials.map((s) => (
              <li key={s.label}>
                <a href={s.url} target={s.url.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                  <SocialIcon label={s.label} url={s.url} size={15} />
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="wrap footer-base">
        <span>
          © {year} {profile.name}. All rights reserved.
        </span>
        <span>Built with Next.js and Django REST Framework.</span>
      </div>
    </footer>
  );
}
