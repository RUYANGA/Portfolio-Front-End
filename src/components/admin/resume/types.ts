/** CV content as the API stores it (see the backend's resume_pdf.py), and section metadata. */

export type Basics = {
  name: string;
  title: string;
  location: string;
  phone: string;
  email: string;
  website: string;
  github: string;
  linkedin: string;
};
export type Skill = { group: string; items: string };
export type Job = { role: string; company: string; location: string; period: string; bullets: string[] };
export type ProjectEntry = { name: string; subtitle: string; link: string; bullets: string[]; tech: string };
export type School = { degree: string; school: string; period: string; coursework: string };
export type Cert = { name: string; issuer: string; year: string };
export type Extra = { title: string; bullets: string[] };

export type SectionKey = "summary" | "competencies" | "skills" | "experience" | "projects" | "education" | "certifications" | "extra";
export type TitledKey = Exclude<SectionKey, "extra">;

export type CvContent = {
  basics: Basics;
  summary: string;
  competencies: string[];
  skills: Skill[];
  experience: Job[];
  projects: ProjectEntry[];
  education: School[];
  certifications: Cert[];
  extra: Extra[];
  order: SectionKey[];
  hidden: SectionKey[];
  titles: Partial<Record<TitledKey, string>>;
};

export type Version = { number: number; note: string; created_at: string; url: string; live: boolean };
export type CvState = {
  content: CvContent;
  saved_at: string | null;
  unpublished: boolean;
  live: { source: "builder" | "upload" | "none"; version: number | null; url: string | null };
  versions: Version[];
};

export const SECTION_META: Record<SectionKey, { title: string; hint: string }> = {
  summary: { title: "Professional summary", hint: "A short paragraph at the top: who you are and what you do best." },
  competencies: { title: "Core competencies", hint: "Your strongest areas, one per bullet." },
  skills: { title: "Technical skills", hint: "Grouped skills, shown as “Group: item, item”." },
  experience: { title: "Professional experience", hint: "Most recent first. Start bullets with a verb and show impact." },
  projects: { title: "Key projects", hint: "Name — subtitle (link), bullets, then the stack." },
  education: { title: "Education", hint: "Degree, school and relevant coursework." },
  certifications: { title: "Certifications", hint: "Shown as bullets: name, issuer (year)." },
  extra: { title: "Extra sections", hint: "Sections of your own, e.g. Engineering approach, Awards, Volunteering." },
};

export const EMPTY = {
  skills: (): Skill => ({ group: "", items: "" }),
  experience: (): Job => ({ role: "", company: "", location: "", period: "", bullets: [""] }),
  projects: (): ProjectEntry => ({ name: "", subtitle: "", link: "", bullets: [""], tech: "" }),
  education: (): School => ({ degree: "", school: "", period: "", coursework: "" }),
  certifications: (): Cert => ({ name: "", issuer: "", year: "" }),
  extra: (): Extra => ({ title: "", bullets: [""] }),
};
