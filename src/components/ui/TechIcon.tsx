/**
 * Logo for a technology name, rendered on the server as inline SVG.
 * Brand logos come from Simple Icons; concepts that aren't brands (RBAC, SOLID…) get a generic line icon.
 * Skills typed in the admin that aren't listed here fall back to the code icon.
 */
import type { SimpleIcon } from "simple-icons";
import {
  siAmazonwebservices,
  siApachekafka,
  siCplusplus,
  siDart,
  siDjango,
  siDocker,
  siExpress,
  siFastapi,
  siFirebase,
  siFlutter,
  siGit,
  siGithub,
  siGraphql,
  siHono,
  siJavascript,
  siJsonwebtokens,
  siKubernetes,
  siLinux,
  siMongodb,
  siMysql,
  siNestjs,
  siNextdotjs,
  siNginx,
  siNodedotjs,
  siOpenjdk,
  siPostgresql,
  siPostman,
  siPrisma,
  siPython,
  siRabbitmq,
  siReact,
  siRedis,
  siSwagger,
  siTailwindcss,
  siTypescript,
  siVercel,
} from "simple-icons";

type Generic = "cloud" | "server" | "api" | "spark" | "event" | "pipeline" | "shield" | "check" | "alert" | "layers" | "cycle" | "code";

const BRANDS: Record<string, SimpleIcon> = {
  python: siPython,
  django: siDjango,
  "django rest framework": siDjango,
  fastapi: siFastapi,
  "node.js": siNodedotjs,
  nodejs: siNodedotjs,
  nestjs: siNestjs,
  express: siExpress,
  "express.js": siExpress,
  hono: siHono,
  graphql: siGraphql,
  "apache kafka": siApachekafka,
  kafka: siApachekafka,
  rabbitmq: siRabbitmq,
  postgresql: siPostgresql,
  postgres: siPostgresql,
  mysql: siMysql,
  mongodb: siMongodb,
  redis: siRedis,
  "prisma orm": siPrisma,
  prisma: siPrisma,
  firebase: siFirebase,
  typescript: siTypescript,
  javascript: siJavascript,
  java: siOpenjdk,
  dart: siDart,
  "c++": siCplusplus,
  aws: siAmazonwebservices,
  "amazon web services": siAmazonwebservices,
  docker: siDocker,
  kubernetes: siKubernetes,
  nginx: siNginx,
  linux: siLinux,
  git: siGit,
  github: siGithub,
  vercel: siVercel,
  react: siReact,
  "react native": siReact,
  "next.js": siNextdotjs,
  nextjs: siNextdotjs,
  "tailwind css": siTailwindcss,
  tailwind: siTailwindcss,
  flutter: siFlutter,
  jwt: siJsonwebtokens,
  swagger: siSwagger,
  postman: siPostman,
};

const GENERIC_RULES: [RegExp, Generic][] = [
  [/azure|cloud/, "cloud"],
  [/coolify|server|hosting/, "server"],
  [/\bai\b|llm|machine learning|\bml\b/, "spark"],
  [/rest|api/, "api"],
  [/event|stream|microservice|queue/, "event"],
  [/ci\/cd|pipeline|deploy/, "pipeline"],
  [/rbac|auth|security|oauth/, "shield"],
  [/validation|test/, "check"],
  [/error|monitor|logging/, "alert"],
  [/solid|architecture|design pattern|clean/, "layers"],
  [/agile|scrum|kanban/, "cycle"],
];

const GENERIC_PATHS: Record<Generic, React.ReactNode> = {
  cloud: <path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9z" />,
  server: (
    <>
      <rect x="2" y="3" width="20" height="7" rx="2" />
      <rect x="2" y="14" width="20" height="7" rx="2" />
      <path d="M6 6.5h.01M6 17.5h.01" />
    </>
  ),
  api: <path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1M16 3h1a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2 2 2 0 0 0-2 2v5a2 2 0 0 1-2 2h-1" />,
  spark: <path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3zM19 3v4M21 5h-4" />,
  event: <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />,
  pipeline: (
    <>
      <circle cx="6" cy="6" r="3" />
      <circle cx="18" cy="18" r="3" />
      <path d="M6 9v3a3 3 0 0 0 3 3h6" />
    </>
  ),
  shield: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  alert: (
    <>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  layers: (
    <>
      <path d="m12 2 10 5-10 5L2 7l10-5z" />
      <path d="m2 17 10 5 10-5M2 12l10 5 10-5" />
    </>
  ),
  cycle: (
    <>
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5M3 21v-5h5" />
    </>
  ),
  code: <path d="m16 18 6-6-6-6M8 6l-6 6 6 6" />,
};

/** Near-black logos (Next.js, JWT…) would vanish in dark mode, so they follow the text colour instead. */
function brandColor(hex: string) {
  const n = parseInt(hex, 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance < 0.035 ? "currentColor" : `#${hex}`;
}

export default function TechIcon({ name, size = 14 }: { name: string; size?: number }) {
  const key = name.trim().toLowerCase();
  const brand = BRANDS[key];

  if (brand) {
    return (
      <svg
        className="tech-icon"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={brandColor(brand.hex)}
        aria-hidden="true"
        focusable="false"
      >
        <path d={brand.path} />
      </svg>
    );
  }

  const generic = GENERIC_RULES.find(([re]) => re.test(key))?.[1] ?? "code";
  return (
    <svg
      className="tech-icon tech-icon-generic"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {GENERIC_PATHS[generic]}
    </svg>
  );
}

/** A list of technology chips, each with its logo. */
export function TechTags({ items, label, size }: { items: string[]; label?: string; size?: number }) {
  return (
    <ul className="tags tags-tech" aria-label={label}>
      {items.map((t) => (
        <li key={t}>
          <TechIcon name={t} size={size} />
          {t}
        </li>
      ))}
    </ul>
  );
}
