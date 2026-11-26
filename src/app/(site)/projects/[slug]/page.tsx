import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BackToTop from "@/components/site/BackToTop";
import Footer from "@/components/site/Footer";
import Header from "@/components/site/Header";
import { ArrowLeft, ArrowRight, ArrowUpRight, GitHub } from "@/components/ui/Icons";
import ProjectVisual from "@/components/site/ProjectVisual";
import ShareButtons from "@/components/site/ShareButtons";
import ZoomableImage from "@/components/site/ZoomableImage";
import { TechTags } from "@/components/ui/TechIcon";
import { DEFAULT_CV_PATH, getPortfolio, getProject } from "@/lib/api";

type Params = { params: { slug: string } };

export async function generateStaticParams() {
  const { projects } = await getPortfolio();
  return projects.map((p) => ({ slug: p.slug }));
}

// Projects added later in the admin get their page on first visit.
export const dynamicParams = true;

// Re-render at most once a minute (and instantly after an admin save). Declared here rather
// than relying on the data fetch, so it holds even if the API was unreachable at build time.
export const revalidate = 60;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const project = await getProject(params.slug);
  if (!project) return { title: "Project not found", robots: { index: false } };
  const description = `${project.tagline} ${project.description}`.slice(0, 300);
  return {
    title: project.title,
    description,
    keywords: [project.title, ...project.stack, "case study"],
    alternates: { canonical: `/projects/${project.slug}` },
    openGraph: { type: "article", url: `/projects/${project.slug}`, title: project.title, description: project.tagline },
    twitter: { card: "summary_large_image", title: project.title, description: project.tagline },
  };
}

export default async function ProjectPage({ params }: Params) {
  const [{ profile, projects }, project] = await Promise.all([getPortfolio(), getProject(params.slug)]);
  if (!project) notFound();

  const index = projects.findIndex((p) => p.slug === project.slug);
  const next = projects.length > 1 ? projects[(index + 1) % projects.length] : null;

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.title,
    headline: project.tagline,
    description: project.description,
    url: `${siteUrl}/projects/${project.slug}`,
    image: project.cover_image || `${siteUrl}/opengraph-image`,
    keywords: project.stack.join(", "),
    author: { "@type": "Person", name: profile.name, url: siteUrl },
    ...(project.url ? { sameAs: project.url } : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Header name={profile.name} cvUrl={profile.cv_file || DEFAULT_CV_PATH} />
      <main id="main" className="project-page">
        <article className="wrap">
          <Link className="back-link" href="/#projects">
            <ArrowLeft size={16} />
            All projects
          </Link>

          <header className="project-header">
            <span className={`badge${project.status === "production" ? " badge-live" : ""} hero-enter`}>
              {project.status === "production" && <span className="live-dot is-pulsing" aria-hidden="true" />}
              {project.status_label}
            </span>
            <h1 className="hero-enter" style={{ "--d": "60ms" } as React.CSSProperties}>
              {project.title}
            </h1>
            <p className="project-lede hero-enter" style={{ "--d": "120ms" } as React.CSSProperties}>
              {project.tagline}
            </p>
            {(project.url || project.repo_url) && (
              <div className="actions hero-enter" style={{ "--d": "180ms" } as React.CSSProperties}>
                {project.url && (
                  <a className="button button-primary" href={project.url} target="_blank" rel="noreferrer">
                    Visit live site
                    <ArrowUpRight size={16} />
                  </a>
                )}
                {project.repo_url && (
                  <a className="button button-secondary" href={project.repo_url} target="_blank" rel="noreferrer">
                    <GitHub size={16} />
                    Source code
                  </a>
                )}
              </div>
            )}
          </header>

          <div className="project-visual" data-reveal>
            {project.cover_image ? (
              <ZoomableImage src={project.cover_image} alt={`${project.title} screenshot`} title={project.title}>
                <ProjectVisual project={project} />
              </ZoomableImage>
            ) : (
              <ProjectVisual project={project} />
            )}
          </div>

          <div className="project-body">
            <aside className="card project-facts" data-reveal>
              <dl>
                <div>
                  <dt>Status</dt>
                  <dd>{project.status_label}</dd>
                </div>
                {project.url && (
                  <div>
                    <dt>Live site</dt>
                    <dd>
                      <a href={project.url} target="_blank" rel="noreferrer">
                        {project.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                      </a>
                    </dd>
                  </div>
                )}
                <div>
                  <dt>Stack</dt>
                  <dd>
                    <TechTags items={project.stack} />
                  </dd>
                </div>
              </dl>
            </aside>

            <div className="project-story" data-reveal>
              <section>
                <h2>Overview</h2>
                <p>{project.description}</p>
              </section>
              {project.problem && (
                <section>
                  <h2>The problem</h2>
                  <p>{project.problem}</p>
                </section>
              )}
              {project.approach && (
                <section>
                  <h2>How I built it</h2>
                  <p>{project.approach}</p>
                </section>
              )}
              <div className="project-cta card">
                <div>
                  <strong>Need a system like this?</strong>
                  <p>I design and build backends that institutions rely on every day.</p>
                </div>
                <Link className="button button-primary" href="/#contact">
                  Get in touch
                  <ArrowRight size={16} />
                </Link>
              </div>
              <ShareButtons
                heading="Share this case study"
                url={siteUrl ? `${siteUrl}/projects/${project.slug}` : undefined}
                title={`${project.title} by ${profile.name}`}
                text={project.tagline}
              />
            </div>
          </div>

          {next && next.slug !== project.slug && (
            <Link href={`/projects/${next.slug}`} className="card card-link next-project" data-reveal>
              <span>
                <span className="card-label">Next project</span>
                <strong>{next.title}</strong>
                <span className="mini-desc">{next.tagline}</span>
              </span>
              <ArrowRight size={22} />
            </Link>
          )}
        </article>
      </main>
      <Footer profile={profile} />
      <BackToTop />
    </>
  );
}
