import fallbackData from "./fallback.json";
import type { Portfolio, Project, ProjectStatus } from "./types";

const API_URL = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

/** Pages rebuild in the background at most once a minute, so admin edits appear without a redeploy. */
const REVALIDATE_SECONDS = 60;

const STATUS_LABELS: Record<ProjectStatus, string> = {
  production: "In production",
  completed: "Completed",
  in_progress: "In progress",
};

/** The bundled copy of the content, used when the API can't be reached (e.g. during a first build). */
function fallback(): Portfolio {
  const d = fallbackData as unknown as {
    profile: Omit<Portfolio["profile"], "photo" | "cv_file">;
    projects: Omit<Project, "status_label" | "repo_url" | "cover_image">[];
    certifications: Omit<Portfolio["certifications"][number], "image">[];
  } & Omit<Portfolio, "profile" | "projects" | "certifications">;
  return {
    ...d,
    profile: { ...d.profile, photo: null, cv_file: null },
    certifications: d.certifications.map((c) => ({ ...c, image: null })),
    projects: d.projects.map((p) => ({
      ...p,
      repo_url: "",
      cover_image: null,
      status_label: STATUS_LABELS[p.status as ProjectStatus] ?? p.status,
    })),
  };
}

export async function getPortfolio(): Promise<Portfolio> {
  try {
    const res = await fetch(`${API_URL}/api/portfolio/`, {
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`API responded ${res.status}`);
    const data = (await res.json()) as Portfolio;
    if (!data.profile) throw new Error("API has no profile yet");
    return data;
  } catch (error) {
    console.warn(`[portfolio] Using bundled content: ${(error as Error).message}`);
    return fallback();
  }
}

export async function getProject(slug: string): Promise<Project | undefined> {
  const { projects } = await getPortfolio();
  return projects.find((p) => p.slug === slug);
}

export const DEFAULT_CV_PATH = "/Merci_Ruyanga_CV.pdf";
