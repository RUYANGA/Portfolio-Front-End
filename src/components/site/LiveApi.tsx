"use client";

import { useEffect, useState } from "react";

type Token = { cls: "k" | "s" | "l" | "p" | "t"; text: string };
type Line = Token[];

type State =
  | { kind: "loading"; path: string }
  | { kind: "ok"; path: string; ms: number; lines: Line[] }
  | { kind: "offline"; path: string; lines: Line[] };

/**
 * Real endpoints of the Django API, requested in turn: each "Send again" calls the next one,
 * and several return a random record, so every response is fresh data from the database.
 */
const ENDPOINTS = [
  "/api/profile/",
  "/api/projects/random/",
  "/api/labs/random/",
  "/api/experience/current/",
  "/api/skills/random/",
  "/api/certifications/random/",
  "/api/stats/",
];
const FALLBACK_PATH = ENDPOINTS[0];

/** Turns a JSON value into coloured lines, so each line can animate in on its own. */
function toLines(value: unknown): Line[] {
  const lines: Line[] = [];

  function scalar(v: unknown): Token {
    if (typeof v === "string") return { cls: "s", text: JSON.stringify(v) };
    return { cls: "l", text: String(v) };
  }

  function walk(v: unknown, depth: number, prefix: Token[], trailing: string) {
    const pad: Token = { cls: "t", text: "  ".repeat(depth) };
    const close = (text: string) => lines.push([pad, { cls: "p", text: text + trailing }]);

    if (Array.isArray(v)) {
      const inline = v.every((x) => typeof x !== "object") && JSON.stringify(v).length <= 32;
      if (inline) {
        const tokens: Token[] = [pad, ...prefix, { cls: "p", text: "[" }];
        v.forEach((x, i) => {
          tokens.push(scalar(x));
          if (i < v.length - 1) tokens.push({ cls: "p", text: ", " });
        });
        tokens.push({ cls: "p", text: "]" + trailing });
        lines.push(tokens);
        return;
      }
      lines.push([pad, ...prefix, { cls: "p", text: "[" }]);
      v.forEach((x, i) => walk(x, depth + 1, [], i < v.length - 1 ? "," : ""));
      close("]");
      return;
    }
    if (v && typeof v === "object") {
      const entries = Object.entries(v as Record<string, unknown>);
      lines.push([pad, ...prefix, { cls: "p", text: "{" }]);
      entries.forEach(([k, x], i) =>
        walk(x, depth + 1, [{ cls: "k", text: JSON.stringify(k) }, { cls: "p", text: ": " }], i < entries.length - 1 ? "," : ""),
      );
      close("}");
      return;
    }
    lines.push([pad, ...prefix, scalar(v), { cls: "p", text: trailing }]);
  }

  walk(value, 0, [], "");
  return lines;
}

export default function LiveApi({ apiUrl, fallback }: { apiUrl: string; fallback: unknown }) {
  const [run, setRun] = useState(0);
  const path = ENDPOINTS[run % ENDPOINTS.length];
  const nextPath = ENDPOINTS[(run + 1) % ENDPOINTS.length];
  const [state, setState] = useState<State>({ kind: "loading", path });

  useEffect(() => {
    // Each run owns its request; a newer run or unmounting makes older results ignored.
    let current = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const started = performance.now();
    setState({ kind: "loading", path });

    fetch(`${apiUrl.replace(/\/$/, "")}${path}`, { signal: controller.signal, cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (current) setState({ kind: "ok", path, ms: Math.round(performance.now() - started), lines: toLines(data) });
      })
      .catch(() => {
        // Unreachable API (or an endpoint it doesn't have yet): show the saved profile response.
        if (current) setState({ kind: "offline", path: FALLBACK_PATH, lines: toLines(fallback) });
      })
      .finally(() => clearTimeout(timer));

    return () => {
      current = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [apiUrl, fallback, path, run]);

  const lines = state.kind === "loading" ? [] : state.lines;

  return (
    <figure className="api-panel" aria-label="Live response from this site's Django API">
      <div className="api-bar">
        <span className="api-lights" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="api-method">GET</span>
        <span className="api-path">{state.path}</span>
        <span className="api-status" data-state={state.kind} aria-live="polite">
          {state.kind === "loading" && (
            <span className="api-pending">
              Requesting<span className="dots" aria-hidden="true" />
            </span>
          )}
          {state.kind === "ok" && (
            <>
              <span className="api-ok">200 OK</span>
              <span>{state.ms} ms</span>
            </>
          )}
          {state.kind === "offline" && "Saved copy"}
        </span>
      </div>

      <pre className="api-body" key={run}>
        <code>
          {lines.map((line, i) => (
            <span className="api-line" key={i} style={{ "--i": i } as React.CSSProperties}>
              {line.map((t, j) => (
                <span key={j} className={t.cls === "t" ? undefined : t.cls}>
                  {t.text}
                </span>
              ))}
            </span>
          ))}
          {state.kind !== "loading" && (
            <span className="api-caret" style={{ "--i": lines.length } as React.CSSProperties} aria-hidden="true" />
          )}
        </code>
      </pre>

      <figcaption className="api-foot">
        <span>
          {state.kind === "offline"
            ? "The API didn't answer just now, so this is the last saved response."
            : "Served live from the database by the Django REST API behind this portfolio."}
          <span className="api-next">
            Next: <code>GET {nextPath}</code>
          </span>
        </span>
        <button
          type="button"
          className="api-replay"
          onClick={() => setRun((n) => n + 1)}
          disabled={state.kind === "loading"}
          aria-label={`Send the next request: GET ${nextPath}`}
        >
          Send again
        </button>
      </figcaption>
    </figure>
  );
}
