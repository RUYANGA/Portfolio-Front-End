import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon for iPhone and iPad (the SVG favicon covers browsers). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#16200f" }}>
        <svg width="132" height="132" viewBox="0 0 64 64">
          <path d="M12 44 Q22 30 32 38 T52 26" fill="none" stroke="#8ecc5a" strokeWidth="5" strokeLinecap="round" />
          <circle cx="52" cy="26" r="6" fill="#e8b931" />
        </svg>
      </div>
    ),
    size,
  );
}
