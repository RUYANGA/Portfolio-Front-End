import Link from "next/link";
import BackToTop from "@/components/site/BackToTop";
import CertificateGallery from "@/components/site/CertificateGallery";
import ContactForm from "@/components/site/ContactForm";
import TypedHeadline from "@/components/site/TypedHeadline";
import CopyEmail from "@/components/site/CopyEmail";
import Footer from "@/components/site/Footer";
import Header from "@/components/site/Header";
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  Briefcase,
  Clock,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  SkillIcon,
  SocialIcon,
} from "@/components/ui/Icons";
import LiveApi from "@/components/site/LiveApi";
import ProjectVisual from "@/components/site/ProjectVisual";
import ResumeButton from "@/components/site/ResumeButton";
import { TechTags } from "@/components/ui/TechIcon";
import { DEFAULT_CV_PATH, getPortfolio } from "@/lib/api";

const PUBLIC_API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Re-render at most once a minute (and instantly after an admin save). Declared here rather
// than relying on the data fetch, so it holds even if the API was unreachable at build time.
export const revalidate = 60;

function host(url: string) {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const delay = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;

function SectionHead({ id, eyebrow, title, lede }: { id: string; eyebrow: string; title: string; lede?: string }) {
  return (
    <header className="section-head" data-reveal>
      <p className="eyebrow">{eyebrow}</p>
      <h2 id={id} className="section-title">
        {title}
      </h2>
      {lede && <p className="section-lede">{lede}</p>}
    </header>
  );
}

export default async function HomePage() {
  const { profile, experiences, projects, skill_groups, education, certifications, contact_subjects } = await getPortfolio();

  const inProduction = projects.filter((p) => p.status === "production");
  const live = inProduction.filter((p) => p.url);
  const featured = projects.filter((p) => p.featured);
  const others = projects.filter((p) => !p.featured);
  const cvUrl = profile.cv_file || DEFAULT_CV_PATH;
  const webSocials = profile.socials.filter((s) => s.url.startsWith("http"));
  const current = experiences.find((e) => e.is_current) ?? experiences[0];
  const years = profile.years_experience ?? profile.summary.match(/(\d+)\+?\s*years/i)?.[1];
  const skillCount = skill_groups.reduce((n, g) => n + g.skills.length, 0);

  const stats = [
    years && { value: `${years}+`, label: "Years building production software" },
    { value: String(inProduction.length), label: "Systems running in production" },
    { value: String(experiences.length), label: "Engineering roles" },
    { value: `${skillCount}+`, label: "Technologies in daily use" },
  ].filter(Boolean) as { value: string; label: string }[];

  // What the live panel shows if the API can't be reached from the visitor's browser.
  const apiFallback = {
    name: profile.name,
    title: profile.title,
    location: profile.location,
    available_for_work: profile.available_for_work,
    systems_in_production: inProduction.length,
    stack: skill_groups[0]?.skills.slice(0, 6) ?? [],
  };

  return (
    <>
      <Header name={profile.name} cvUrl={cvUrl} />
      <main id="main">
        {/* ---------- Hero ---------- */}
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-backdrop" aria-hidden="true" />
          <div className="wrap hero-grid">
            <div className="hero-copy">
              {profile.available_for_work && (
                <p className="badge badge-live hero-enter">
                  <span className="live-dot is-pulsing" aria-hidden="true" />
                  {profile.availability_text || "Available for new roles"}
                </p>
              )}
              <p className="hero-kicker hero-enter" style={delay(60)}>
                {profile.name} · {profile.title}
              </p>
              <TypedHeadline id="hero-title" className="hero-title hero-enter" style={delay(120)} headline={profile.headline} />
              <p className="hero-intro hero-enter" style={delay(200)}>
                {profile.summary.split(". ")[0]}.
              </p>
              <div className="actions hero-enter" style={delay(280)}>
                <a className="button button-primary button-lg" href="#contact">
                  Get in touch
                  <ArrowRight size={18} />
                </a>
                <a className="button button-secondary button-lg" href="#projects">
                  View my work
                </a>
              </div>
              <ul className="hero-meta hero-enter" style={delay(360)}>
                <li>
                  <MapPin size={16} />
                  {profile.location}
                </li>
                {current && (
                  <li>
                    <Briefcase size={16} />
                    {current.role}, {current.company}
                  </li>
                )}
                {webSocials.map((s) => (
                  <li key={s.label}>
                    <a href={s.url} target="_blank" rel="noreferrer" aria-label={s.label} className="social-link">
                      <SocialIcon label={s.label} url={s.url} size={16} />
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="hero-side hero-enter" style={delay(240)}>
              <LiveApi apiUrl={PUBLIC_API} fallback={apiFallback} />
            </div>
          </div>

          {/* ---------- Stats ---------- */}
          <div className="wrap">
            <dl className="stats hero-enter" style={delay(440)}>
              {stats.map((s) => (
                <div key={s.label} className="stat">
                  <dt>{s.label}</dt>
                  <dd>{s.value}</dd>
                </div>
              ))}
            </dl>
            {live.length > 0 && (
              <div className="running hero-enter" style={delay(520)}>
                <span className="running-title">Live in production</span>
                <ul>
                  {live.map((p) => (
                    <li key={p.slug}>
                      <a href={p.url} target="_blank" rel="noreferrer">
                        <span className="live-dot" aria-hidden="true" />
                        {host(p.url)}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* ---------- About ---------- */}
        <section id="about" className="section" aria-labelledby="about-title">
          <div className="wrap">
            <SectionHead id="about-title" eyebrow="About" title={profile.about_heading || "About me"} />
            <div className="about-grid">
              <div className="about-text" data-reveal>
                <p className="about-lead">{profile.summary}</p>
                {profile.about && <p>{profile.about}</p>}
              </div>
              <aside className="card glance" data-reveal style={delay(100)} aria-label="At a glance">
                {profile.photo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="glance-photo" src={profile.photo} alt={profile.name} />
                )}
                <p className="card-label">At a glance</p>
                <dl className="glance-list">
                  <div>
                    <dt>
                      <Briefcase size={16} /> Role
                    </dt>
                    <dd>{profile.title}</dd>
                  </div>
                  <div>
                    <dt>
                      <MapPin size={16} /> Location
                    </dt>
                    <dd>{profile.location}</dd>
                  </div>
                  {education[0] && (
                    <div>
                      <dt>
                        <GraduationCap size={16} /> Education
                      </dt>
                      <dd>{education[0].degree}</dd>
                    </div>
                  )}
                  <div>
                    <dt>
                      <Clock size={16} /> Availability
                    </dt>
                    <dd>{profile.available_for_work ? "Open to new roles" : "Not looking right now"}</dd>
                  </div>
                </dl>
                <ResumeButton url={cvUrl} label="View résumé" className="button button-secondary button-block" />
              </aside>
            </div>
          </div>
        </section>

        {/* ---------- Experience ---------- */}
        <section id="experience" className="section section-alt" aria-labelledby="experience-title">
          <div className="wrap">
            <SectionHead
              id="experience-title"
              eyebrow="Experience"
              title="Where I've worked"
              lede={profile.experience_intro}
            />
            <ol className="timeline">
              {experiences.map((job) => (
                <li className="job card" key={`${job.company}-${job.period}`} data-reveal>
                  <div className="job-head">
                    <div>
                      <h3 className="job-role">{job.role}</h3>
                      <p className="job-org">
                        {job.company}
                        {job.location && <span> · {job.location}</span>}
                      </p>
                    </div>
                    <p className="job-when">
                      {job.is_current && <span className="badge badge-live badge-sm">Current</span>}
                      {job.period}
                    </p>
                  </div>
                  {job.summary && <p className="job-summary">{job.summary}</p>}
                  {job.highlights.length > 0 && (
                    <ul className="job-points">
                      {job.highlights.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                  )}
                  {job.technologies.length > 0 && (
                    <TechTags items={job.technologies} label="Technologies" />
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------- Projects ---------- */}
        <section id="projects" className="section" aria-labelledby="projects-title">
          <div className="wrap">
            <SectionHead
              id="projects-title"
              eyebrow="Selected work"
              title="Case studies"
              lede={profile.projects_intro}
            />

            <div className="showcase">
              {featured.map((p, i) => (
                <article className={`feature card${i % 2 ? " is-flipped" : ""}`} key={p.slug} data-reveal>
                  <Link href={`/projects/${p.slug}`} className="feature-visual" tabIndex={-1} aria-hidden="true">
                    <ProjectVisual project={p} />
                  </Link>
                  <div className="feature-copy">
                    <div className="case-meta">
                      <span className={`badge${p.status === "production" ? " badge-live" : ""} badge-sm`}>
                        {p.status === "production" && <span className="live-dot" aria-hidden="true" />}
                        {p.status_label}
                      </span>
                      {p.url && (
                        <a href={p.url} target="_blank" rel="noreferrer" className="case-link">
                          {host(p.url)}
                          <ArrowUpRight size={14} />
                        </a>
                      )}
                    </div>
                    <h3 className="feature-title">
                      <Link href={`/projects/${p.slug}`}>{p.title}</Link>
                    </h3>
                    <p className="case-tagline">{p.tagline}</p>
                    <p className="feature-problem">{p.problem || p.description}</p>
                    <TechTags items={p.stack} label="Stack" />
                    <Link className="text-link" href={`/projects/${p.slug}`}>
                      Read case study
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            {others.length > 0 && (
              <div className="more-projects">
                <h3 className="subheading" data-reveal>
                  More projects
                </h3>
                <ul className="project-grid">
                  {others.map((p, i) => (
                    <li key={p.slug} data-reveal style={delay((i % 3) * 80)}>
                      <Link
                        href={`/projects/${p.slug}`}
                        className={`card card-link mini-card${p.cover_image ? " has-thumb" : ""}`}
                      >
                        {p.cover_image && (
                          <span className="mini-thumb">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={p.cover_image} alt={`${p.title} screenshot`} decoding="async" />
                          </span>
                        )}
                        <span className="mini-top">
                          <span className={`badge${p.status === "production" ? " badge-live" : ""} badge-sm`}>
                            {p.status_label}
                          </span>
                          <ArrowUpRight size={18} className="mini-arrow" />
                        </span>
                        <strong>{p.title}</strong>
                        <span className="mini-desc">{p.tagline}</span>
                        <span className="mini-stack">{p.stack.join(" · ")}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* ---------- Skills ---------- */}
        <section id="skills" className="section section-alt" aria-labelledby="skills-title">
          <div className="wrap">
            <SectionHead
              id="skills-title"
              eyebrow="Skills"
              title="Technical toolkit"
              lede={profile.skills_intro}
            />
            <ul className="skills-grid">
              {skill_groups.map((g, i) => (
                <li key={g.name} className="card skill-card" data-reveal style={delay((i % 3) * 80)}>
                  <h3>
                    <span className="skill-icon">
                      <SkillIcon name={g.name} size={18} />
                    </span>
                    {g.name}
                  </h3>
                  <TechTags items={g.skills} size={16} />
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------- Credentials ---------- */}
        <section id="credentials" className="section" aria-labelledby="cred-title">
          <div className="wrap">
            <SectionHead id="cred-title" eyebrow="Credentials" title="Education & certifications" />
            <div className="cred-grid cred-grid-single">
              <div className="card" data-reveal>
                <h3 className="card-heading">
                  <span className="skill-icon">
                    <GraduationCap size={18} />
                  </span>
                  Education
                </h3>
                <ul className="cred-list">
                  {education.map((e) => (
                    <li key={e.degree}>
                      <div>
                        <strong>{e.degree}</strong>
                        <span className="cred-sub">{e.institution}</span>
                        {e.coursework && <span className="cred-sub cred-note">Coursework: {e.coursework}</span>}
                      </div>
                      {e.period && <span className="cred-date">{e.period}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="cert-section">
              <h3 className="subheading cert-heading" data-reveal>
                <span className="skill-icon">
                  <Award size={18} />
                </span>
                Certifications
                <span className="cert-count">{certifications.length}</span>
              </h3>
              <CertificateGallery items={certifications} />
            </div>
          </div>
        </section>

        {/* ---------- Contact ---------- */}
        <section id="contact" className="section" aria-labelledby="contact-title">
          <div className="wrap">
            <div className="contact-panel" data-reveal>
              <div className="contact-intro">
                <p className="eyebrow eyebrow-inverse">Contact</p>
                <h2 id="contact-title" className="section-title">
                  {profile.contact_heading || "Get in touch"}
                </h2>
                {profile.contact_intro && <p className="section-lede">{profile.contact_intro}</p>}
                <ul className="contact-list">
                  <li>
                    <span className="contact-icon">
                      <Mail size={18} />
                    </span>
                    <span className="contact-emails">
                      <span className="contact-label">{profile.secondary_email ? "Email addresses" : "Email"}</span>
                      <CopyEmail email={profile.email} />
                      {profile.secondary_email && profile.secondary_email !== profile.email && <CopyEmail email={profile.secondary_email} />}
                    </span>
                  </li>
                  {profile.phone && (
                    <li>
                      <span className="contact-icon">
                        <Phone size={18} />
                      </span>
                      <span>
                        <span className="contact-label">Phone</span>
                        <a href={`tel:${profile.phone.replace(/\s/g, "")}`}>{profile.phone}</a>
                      </span>
                    </li>
                  )}
                  <li>
                    <span className="contact-icon">
                      <MapPin size={18} />
                    </span>
                    <span>
                      <span className="contact-label">Location</span>
                      {profile.location} · Remote across time zones
                    </span>
                  </li>
                </ul>
              </div>
              <div className="contact-form-wrap">
                <ContactForm apiUrl={PUBLIC_API} email={profile.email} subjects={contact_subjects ?? []} />
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer profile={profile} />
      <BackToTop />
    </>
  );
}
