export type SocialLink = { label: string; url: string };

export type Profile = {
  name: string;
  title: string;
  headline: string;
  summary: string;
  about: string;
  location: string;
  email: string;
  secondary_email?: string;
  phone: string;
  photo: string | null;
  cv_file: string | null;
  available_for_work: boolean;
  socials: SocialLink[];
  updated_at?: string | null;
  /* Editable in the admin; optional so an older API or the bundled fallback still type-checks. */
  years_experience?: number | null;
  availability_text?: string;
  about_heading?: string;
  experience_intro?: string;
  projects_intro?: string;
  skills_intro?: string;
  contact_heading?: string;
  contact_intro?: string;
  meta_description?: string;
};

export type SkillGroup = { name: string; skills: string[] };

export type Experience = {
  role: string;
  company: string;
  location: string;
  period: string;
  is_current: boolean;
  summary: string;
  highlights: string[];
  technologies: string[];
};

export type ProjectStatus = "production" | "completed" | "in_progress";

export type Project = {
  title: string;
  slug: string;
  tagline: string;
  description: string;
  problem: string;
  approach: string;
  url: string;
  repo_url: string;
  cover_image: string | null;
  status: ProjectStatus;
  status_label: string;
  stack: string[];
  featured: boolean;
};

export type Lab = {
  title: string;
  category: string;
  provider: string;
  summary: string;
  highlights: string[];
  services: string[];
  repo_url: string;
  diagram: string | null;
  completed: string;
};

export type Education = { degree: string; institution: string; period: string; coursework: string };

export type Certification = {
  name: string;
  issuer: string;
  year: string;
  credential_url: string;
  image: string | null;
};

export type Portfolio = {
  profile: Profile;
  skill_groups: SkillGroup[];
  experiences: Experience[];
  projects: Project[];
  /** Hands-on cloud labs; optional so an older API without them still works. */
  labs?: Lab[];
  education: Education[];
  certifications: Certification[];
  /** Subjects offered in the contact form (managed in the admin). */
  contact_subjects?: string[];
};
