/**
 * Shared layout for the generated share images (Open Graph / X cards): 1200 × 630, brand green.
 * Rendered by next/og, so only inline styles and flexbox are available.
 */
export const CARD_SIZE = { width: 1200, height: 630 };

const COLORS = { bg: "#141d0e", ink: "#f3f6f1", dim: "#a7b39f", accent: "#8ecc5a", line: "rgba(255,255,255,0.12)" };

export function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "P";
}

export function ShareCard({
  name,
  kicker,
  title,
  subtitle,
  chips,
  footer,
}: {
  name: string;
  kicker: string;
  title: string;
  subtitle?: string;
  chips?: string[];
  footer: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px 72px",
        backgroundColor: COLORS.bg,
        backgroundImage: "radial-gradient(circle at 92% 8%, rgba(142,204,90,0.28), transparent 45%), radial-gradient(circle at 0% 100%, rgba(0,153,98,0.18), transparent 40%)",
        color: COLORS.ink,
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 64,
            height: 64,
            borderRadius: 16,
            background: COLORS.accent,
            color: COLORS.bg,
            fontSize: 26,
            fontWeight: 800,
          }}
        >
          {initials(name)}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{name}</div>
          <div style={{ fontSize: 20, color: COLORS.accent, textTransform: "uppercase", letterSpacing: 3, marginTop: 4 }}>{kicker}</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: title.length > 48 ? 58 : 70, fontWeight: 800, lineHeight: 1.08, letterSpacing: -2, maxWidth: 1000 }}>{title}</div>
        {subtitle && <div style={{ marginTop: 22, fontSize: 28, lineHeight: 1.4, color: COLORS.dim, maxWidth: 960 }}>{subtitle}</div>}
        {chips && chips.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 30 }}>
            {chips.slice(0, 6).map((c) => (
              <div key={c} style={{ display: "flex", padding: "8px 18px", borderRadius: 999, border: `1px solid ${COLORS.line}`, background: "rgba(255,255,255,0.06)", fontSize: 22 }}>
                {c}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${COLORS.line}`, paddingTop: 24, fontSize: 22, color: COLORS.dim }}>
        <div style={{ display: "flex" }}>{footer}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: COLORS.accent }}>
          <div style={{ width: 12, height: 12, borderRadius: 999, background: "#32d583" }} />
          View portfolio →
        </div>
      </div>
    </div>
  );
}

const FONT_BASE = "https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.18/files";

/** Inter (the site font) for the share images; falls back to the built-in font if it can't load. */
export async function cardFonts() {
  const load = async (weight: 500 | 800) => {
    const res = await fetch(`${FONT_BASE}/inter-latin-${weight}-normal.woff`, { cache: "force-cache" });
    if (!res.ok) throw new Error(`font ${weight}: ${res.status}`);
    return { name: "Inter", data: await res.arrayBuffer(), weight, style: "normal" as const };
  };
  try {
    return await Promise.all([load(500), load(800)]);
  } catch {
    return undefined;
  }
}
