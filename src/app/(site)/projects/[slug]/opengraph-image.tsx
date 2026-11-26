import { ImageResponse } from "next/og";
import { getPortfolio, getProject } from "@/lib/api";
import { CARD_SIZE, ShareCard, cardFonts } from "@/lib/seo/card";

export const alt = "Project case study";
export const size = CARD_SIZE;
export const contentType = "image/png";
export const revalidate = 3600;

/** Share picture for a project page: project name, tagline and stack. */
export default async function ProjectOpengraphImage({ params }: { params: { slug: string } }) {
  const [{ profile }, project] = await Promise.all([getPortfolio(), getProject(params.slug)]);
  const domain = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  return new ImageResponse(
    (
      <ShareCard
        name={profile.name}
        kicker={project ? `Case study · ${project.status_label}` : "Project"}
        title={project?.title ?? "Project"}
        subtitle={project?.tagline}
        chips={project?.stack}
        footer={project ? `${domain}/projects/${project.slug}` : domain}
      />
    ),
    { ...size, fonts: await cardFonts() },
  );
}
