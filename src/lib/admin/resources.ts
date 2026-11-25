/**
 * What the dashboard can edit. Each resource maps to a Django endpoint under /api/admin/
 * and describes its form (sections → fields) and its list view. Adding a field here is
 * all it takes to make it editable, as long as the API serializer exposes it.
 */

export type FieldType =
  | "text" | "textarea" | "url" | "email" | "number" | "checkbox" | "select"
  | "tags" | "lines" | "image" | "file" | "slug";

export type Field = {
  name: string;
  label: string;
  type: FieldType;
  help?: string;
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  /** slug: field whose value the slug follows until edited by hand. */
  from?: string;
  rows?: number;
  accept?: string;
  /** Show tech logos on tag chips. */
  techIcons?: boolean;
  half?: boolean;
};

export type Section = { title: string; description?: string; fields: Field[] };

export type Record_ = { id: number; order?: number; [key: string]: unknown };

export type Resource = {
  key: string;
  endpoint: string;
  label: string;
  singular: string;
  description: string;
  sections: Section[];
  titleField: string;
  subtitle?: (item: Record_) => string;
  thumbField?: string;
  badges?: (item: Record_) => { text: string; tone?: "live" | "accent" | "muted" }[];
  searchFields: string[];
  defaults: Record<string, unknown>;
  publicPath?: (item: Record_) => string | null;
};

export const PROJECT_STATUS = [
  { value: "production", label: "In production" },
  { value: "completed", label: "Completed" },
  { value: "in_progress", label: "In progress" },
];

export const RESOURCES: Resource[] = [
  {
    key: "projects",
    endpoint: "projects",
    label: "Projects",
    singular: "project",
    description: "Case studies and smaller projects. Featured projects get a full case study on the homepage.",
    titleField: "title",
    subtitle: (p) => String(p.tagline || ""),
    thumbField: "cover_image",
    badges: (p) => [
      { text: PROJECT_STATUS.find((s) => s.value === p.status)?.label || String(p.status), tone: p.status === "production" ? "live" : "muted" },
      ...(p.featured ? [{ text: "Featured", tone: "accent" as const }] : []),
    ],
    searchFields: ["title", "tagline", "description"],
    defaults: { status: "production", featured: false, stack: [] },
    publicPath: (p) => `/projects/${p.slug}`,
    sections: [
      {
        title: "Basics",
        fields: [
          { name: "title", label: "Title", type: "text", required: true, half: true },
          { name: "slug", label: "URL slug", type: "slug", from: "title", required: true, half: true, help: "Used in the project page address." },
          { name: "tagline", label: "Tagline", type: "text", required: true, help: "One line under the title." },
          { name: "status", label: "Status", type: "select", options: PROJECT_STATUS, half: true },
          { name: "featured", label: "Featured case study", type: "checkbox", half: true, help: "Shown large on the homepage." },
        ],
      },
      {
        title: "Links",
        fields: [
          { name: "url", label: "Live site", type: "url", placeholder: "https://", half: true },
          { name: "repo_url", label: "Source code", type: "url", placeholder: "https://github.com/…", half: true },
        ],
      },
      {
        title: "Cover image",
        description: "A screenshot of the product. Wide images (about 16:10) look best.",
        fields: [{ name: "cover_image", label: "Cover image", type: "image" }],
      },
      {
        title: "Case study",
        fields: [
          { name: "description", label: "Overview", type: "textarea", required: true, rows: 4 },
          { name: "problem", label: "The problem", type: "textarea", rows: 4, help: "What problem it solved. Shown on featured projects." },
          { name: "approach", label: "How I built it", type: "textarea", rows: 5, help: "Your approach and contribution." },
          { name: "stack", label: "Tech stack", type: "tags", techIcons: true, placeholder: "Add a technology and press Enter" },
        ],
      },
    ],
  },
  {
    key: "experience",
    endpoint: "experiences",
    label: "Experience",
    singular: "role",
    description: "Jobs and internships, shown on the homepage in this order.",
    titleField: "role",
    subtitle: (e) => [e.company, e.period].filter(Boolean).join(" · "),
    badges: (e) => (e.is_current ? [{ text: "Current", tone: "live" }] : []),
    searchFields: ["role", "company", "summary"],
    defaults: { is_current: false, highlights: [], technologies: [] },
    sections: [
      {
        title: "Role",
        fields: [
          { name: "role", label: "Job title", type: "text", required: true, half: true },
          { name: "company", label: "Company", type: "text", required: true, half: true },
          { name: "location", label: "Location", type: "text", half: true },
          { name: "period", label: "Period", type: "text", required: true, half: true, placeholder: "e.g. Jan 2024 – Present" },
          { name: "is_current", label: "I currently work here", type: "checkbox" },
        ],
      },
      {
        title: "Details",
        fields: [
          { name: "summary", label: "One-line summary", type: "text" },
          { name: "highlights", label: "Achievements", type: "lines", help: "One achievement per item." },
          { name: "technologies", label: "Technologies", type: "tags", techIcons: true },
        ],
      },
    ],
  },
  {
    key: "skills",
    endpoint: "skill-groups",
    label: "Skills",
    singular: "skill group",
    description: "Groups of skills shown in the Technical toolkit section.",
    titleField: "name",
    subtitle: (g) => `${(g.skills as string[] | undefined)?.length ?? 0} skills`,
    searchFields: ["name"],
    defaults: { skills: [] },
    sections: [
      {
        title: "Skill group",
        fields: [
          { name: "name", label: "Group name", type: "text", required: true, placeholder: "e.g. Backend" },
          { name: "skills", label: "Skills", type: "tags", techIcons: true, required: true },
        ],
      },
    ],
  },
  {
    key: "education",
    endpoint: "education",
    label: "Education",
    singular: "degree",
    description: "Degrees and programmes.",
    titleField: "degree",
    subtitle: (e) => [e.institution, e.period].filter(Boolean).join(" · "),
    searchFields: ["degree", "institution"],
    defaults: {},
    sections: [
      {
        title: "Degree",
        fields: [
          { name: "degree", label: "Degree", type: "text", required: true },
          { name: "institution", label: "Institution", type: "text", required: true },
          { name: "period", label: "Period", type: "text", placeholder: "e.g. 2022 – 2026" },
          { name: "coursework", label: "Relevant coursework", type: "textarea", rows: 3 },
        ],
      },
    ],
  },
  {
    key: "contact-subjects",
    endpoint: "contact-subjects",
    label: "Contact subjects",
    singular: "subject",
    description: "The subjects visitors choose from in the contact form. Only active ones are shown on the site.",
    titleField: "label",
    badges: (s) => (s.is_active ? [{ text: "Active", tone: "live" }] : [{ text: "Hidden", tone: "muted" }]),
    searchFields: ["label"],
    defaults: { is_active: true },
    sections: [
      {
        title: "Subject",
        fields: [
          { name: "label", label: "Subject", type: "text", required: true, placeholder: "e.g. Full-time job opportunity" },
          { name: "is_active", label: "Show on the site", type: "checkbox", help: "Hidden subjects stay here but aren't offered in the form." },
        ],
      },
    ],
  },
  {
    key: "certifications",
    endpoint: "certifications",
    label: "Certifications",
    singular: "certification",
    description: "Certificates shown with their picture in the Credentials section.",
    titleField: "name",
    subtitle: (c) => [c.issuer, c.year].filter(Boolean).join(" · "),
    thumbField: "image",
    searchFields: ["name", "issuer"],
    defaults: {},
    sections: [
      {
        title: "Certificate",
        fields: [
          { name: "name", label: "Certificate name", type: "text", required: true },
          { name: "issuer", label: "Issued by", type: "text", half: true },
          { name: "year", label: "Year", type: "text", half: true, placeholder: "2026" },
          { name: "credential_url", label: "Verification link", type: "url", placeholder: "https://", help: "Shown as “Verify credential”." },
        ],
      },
      {
        title: "Picture",
        fields: [{ name: "image", label: "Certificate image", type: "image", help: "A JPG or PNG of the certificate." }],
      },
    ],
  },
];

export function getResource(key: string) {
  return RESOURCES.find((r) => r.key === key);
}

export const PROFILE_SECTIONS: Section[] = [
  {
    title: "Identity",
    description: "Who you are, shown in the hero and across the site.",
    fields: [
      { name: "name", label: "Full name", type: "text", required: true, half: true },
      { name: "title", label: "Job title", type: "text", required: true, half: true },
      { name: "headline", label: "Headline", type: "text", required: true, help: "The large sentence at the top of the homepage." },
      { name: "location", label: "Location", type: "text", half: true },
      { name: "email", label: "Email", type: "email", required: true, half: true },
      { name: "phone", label: "Phone", type: "text", half: true },
      { name: "years_experience", label: "Years of experience", type: "number", half: true, help: "Shown as “N+” in the stats. Leave empty to hide." },
    ],
  },
  {
    title: "About",
    fields: [
      { name: "summary", label: "Professional summary", type: "textarea", rows: 6, required: true, help: "Its first sentence also appears in the hero." },
      { name: "about", label: "Personal paragraph", type: "textarea", rows: 6 },
    ],
  },
  {
    title: "Photo and résumé",
    fields: [
      { name: "photo", label: "Profile photo", type: "image", half: true },
      { name: "cv_file", label: "Résumé (PDF)", type: "file", accept: "application/pdf", half: true, help: "Downloaded from the Résumé buttons." },
    ],
  },
  {
    title: "Availability",
    fields: [
      { name: "available_for_work", label: "Open to new roles", type: "checkbox", help: "Shows the availability badge in the hero." },
      { name: "availability_text", label: "Badge text", type: "text" },
    ],
  },
  {
    title: "Section headings",
    description: "The wording around each part of the homepage.",
    fields: [
      { name: "about_heading", label: "About heading", type: "text", required: true },
      { name: "experience_intro", label: "Experience intro", type: "text" },
      { name: "projects_intro", label: "Projects intro", type: "text" },
      { name: "skills_intro", label: "Skills intro", type: "text" },
      { name: "contact_heading", label: "Contact heading", type: "text", required: true },
      { name: "contact_intro", label: "Contact text", type: "textarea", rows: 3 },
    ],
  },
  {
    title: "Search engines",
    fields: [
      { name: "meta_description", label: "Description", type: "textarea", rows: 2, help: "Shown under your name in Google results and link previews. Aim for 150 characters." },
    ],
  },
];
