import type { MetadataRoute } from "next";
import { getPortfolio } from "@/lib/api";

/** Web app manifest: name, colours and icons when the site is saved to a phone's home screen. */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { profile } = await getPortfolio();
  return {
    name: `${profile.name} | ${profile.title}`,
    short_name: profile.name.split(" ")[0] || profile.name,
    description: profile.meta_description || profile.headline,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#47790e",
    icons: [
      { src: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
