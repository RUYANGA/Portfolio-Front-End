import { ImageResponse } from "next/og";
import { getPortfolio } from "@/lib/api";
import { CARD_SIZE, ShareCard, cardFonts } from "@/lib/seo/card";

export const alt = "Portfolio";
export const size = CARD_SIZE;
export const contentType = "image/png";
export const revalidate = 3600;

/** The picture shown when the site link is shared (WhatsApp, LinkedIn, X, Slack…). */
export default async function OpengraphImage() {
  const { profile } = await getPortfolio();
  const domain = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  return new ImageResponse(
    (
      <ShareCard
        name={profile.name}
        kicker={profile.title}
        title={profile.headline}
        subtitle={profile.summary.split(". ")[0] + "."}
        chips={["Backend systems", "Full-stack applications", "ML solutions", profile.location]}
        footer={domain || profile.location}
      />
    ),
    { ...size, fonts: await cardFonts() },
  );
}
