/* eslint-disable @next/next/no-img-element */
import type { Project } from "@/lib/api/types";

type Variant = "pipeline" | "network" | "calendar" | "dashboard";

/** Picks an illustration that shows what the system does. New projects get the dashboard view. */
function variantFor(slug: string): Variant {
  if (slug.includes("inuma")) return "pipeline";
  if (slug.includes("muruhongore")) return "network";
  if (slug.includes("hitamo")) return "calendar";
  return "dashboard";
}

function host(url: string, fallback: string) {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return fallback;
  }
}

function Pipeline() {
  const steps = ["Submitted", "Head of department", "Dean", "Approved"];
  return (
    <div className="pv-pipeline">
      <div className="pv-request">
        <span className="pv-label">Travel request</span>
        <strong>Kayonza, 4 days</strong>
      </div>
      <ol className="pv-steps">
        {steps.map((s, i) => (
          <li key={s} style={{ "--i": i } as React.CSSProperties}>
            <span className="pv-step-dot" aria-hidden="true" />
            <span>{s}</span>
          </li>
        ))}
      </ol>
      <div className="pv-audit">
        <span className="pv-label">Audit trail</span>
        {[0, 1, 2].map((i) => (
          <span key={i} className="pv-audit-row" style={{ "--i": i } as React.CSSProperties} />
        ))}
      </div>
    </div>
  );
}

function Network() {
  const left = [40, 100, 160];
  const right = [55, 130];
  return (
    <svg className="pv-network" viewBox="0 0 320 222" role="img" aria-label="Innovators connected to funders">
      {left.map((y, i) =>
        right.map((ry, j) => (
          <path
            key={`${i}-${j}`}
            className="pv-link"
            d={`M66 ${y} C 160 ${y}, 160 ${ry}, 260 ${ry}`}
            style={{ "--i": i * 2 + j } as React.CSSProperties}
          />
        )),
      )}
      {left.map((y, i) => (
        <g key={`l${i}`} className="pv-node" style={{ "--i": i } as React.CSSProperties}>
          <circle cx="48" cy={y} r="18" />
          <text x="48" y={y + 4} textAnchor="middle">
            {["AI", "Agri", "Health"][i]}
          </text>
        </g>
      ))}
      {right.map((y, i) => (
        <g key={`r${i}`} className="pv-node pv-node-funder" style={{ "--i": i + 3 } as React.CSSProperties}>
          <rect x="250" y={y - 16} width="52" height="32" rx="8" />
          <text x="276" y={y + 4} textAnchor="middle">
            Fund
          </text>
        </g>
      ))}
      <text className="pv-axis" x="48" y="214" textAnchor="middle">
        Innovators
      </text>
      <text className="pv-axis" x="276" y="214" textAnchor="middle">
        Funders
      </text>
    </svg>
  );
}

function Calendar() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const booked = new Set([1, 3, 6, 8, 9, 12, 15, 17, 18]);
  return (
    <div className="pv-calendar">
      {days.map((d) => (
        <span key={d} className="pv-day">
          {d}
        </span>
      ))}
      {Array.from({ length: 20 }, (_, i) => (
        <span
          key={i}
          className={`pv-slot${booked.has(i) ? " is-booked" : ""}`}
          style={{ "--i": [...booked].indexOf(i) } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

function Dashboard() {
  const bars = [46, 72, 58, 88, 64, 94];
  return (
    <div className="pv-dashboard">
      <div className="pv-bars">
        {bars.map((h, i) => (
          <span key={i} style={{ "--h": `${h}%`, "--i": i } as React.CSSProperties} />
        ))}
      </div>
      <div className="pv-rows">
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ "--i": i } as React.CSSProperties} />
        ))}
      </div>
    </div>
  );
}

export default function ProjectVisual({ project }: { project: Project }) {
  const variant = variantFor(project.slug);
  return (
    <div className="pv" data-variant={variant} aria-hidden={project.cover_image ? undefined : true}>
      <div className="pv-bar">
        <span className="pv-lights">
          <i />
          <i />
          <i />
        </span>
        <span className="pv-address">{host(project.url, project.title.toLowerCase())}</span>
      </div>
      <div className={`pv-screen${project.cover_image ? " has-image" : ""}`}>
        {project.cover_image ? (
          <img src={project.cover_image} alt={`${project.title} screenshot`} loading="lazy" decoding="async" />
        ) : variant === "pipeline" ? (
          <Pipeline />
        ) : variant === "network" ? (
          <Network />
        ) : variant === "calendar" ? (
          <Calendar />
        ) : (
          <Dashboard />
        )}
      </div>
    </div>
  );
}
