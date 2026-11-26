import type { MetadataRoute } from "next";
import { getPortfolio } from "@/lib/api";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const { profile, projects } = await getPortfolio();
  const lastModified = profile.updated_at ? new Date(profile.updated_at) : new Date();
  return [
    { url: `${base}/`, lastModified, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/book`, lastModified, changeFrequency: "weekly", priority: 0.7 },
    ...projects.map((p) => ({ url: `${base}/projects/${p.slug}`, lastModified, changeFrequency: "monthly" as const, priority: p.featured ? 0.8 : 0.6 })),
  ];
}
