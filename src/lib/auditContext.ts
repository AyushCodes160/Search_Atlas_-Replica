// Compact, agent-friendly summary of the user's most recent site audit.
// Persisted to localStorage so Atlas Agent can answer questions in context
// without any backend storage or auth.

export type StoredAudit = {
  url: string;
  sourceType: "web" | "api";
  ranAt: number;
  scores?: { performance: number; seo: number; accessibility: number; bestPractices: number };
  vitals?: { lcp: string; cls: string; fcp: string; tbt: string; speedIndex: string };
  onPage?: {
    words: number;
    flesch: number;
    grade: number;
    h1Count: number;
    h2Count: number;
    h3Count: number;
    headingIssues: string[];
    imagesTotal: number;
    imagesMissingAlt: number;
    internalLinks: number;
    externalLinks: number;
    schemaTypes: string[];
    titleLength: number;
    descriptionLength: number;
  };
  topFixes?: string[];
};

export const LAST_AUDIT_KEY = "seo-engine:last-audit";
export const AUDIT_HISTORY_KEY = "seo-engine:audit-history";
export const HISTORY_LIMIT = 10;

export function saveLastAudit(a: StoredAudit) {
  try {
    localStorage.setItem(LAST_AUDIT_KEY, JSON.stringify(a));
    pushToHistory(a);
  } catch {
    /* ignore quota or private-mode errors */
  }
}

export function readLastAudit(): StoredAudit | null {
  try {
    const raw = localStorage.getItem(LAST_AUDIT_KEY);
    return raw ? (JSON.parse(raw) as StoredAudit) : null;
  } catch {
    return null;
  }
}

export function clearLastAudit() {
  try {
    localStorage.removeItem(LAST_AUDIT_KEY);
  } catch {
    /* ignore */
  }
}

export function pushToHistory(a: StoredAudit) {
  try {
    const existing = readHistory();
    // Dedupe by URL — replace older entry with the newest run for the same URL.
    const filtered = existing.filter((e) => e.url !== a.url);
    const next = [a, ...filtered].slice(0, HISTORY_LIMIT);
    localStorage.setItem(AUDIT_HISTORY_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function readHistory(): StoredAudit[] {
  try {
    const raw = localStorage.getItem(AUDIT_HISTORY_KEY);
    return raw ? (JSON.parse(raw) as StoredAudit[]) : [];
  } catch {
    return [];
  }
}

export function clearHistory() {
  try {
    localStorage.removeItem(AUDIT_HISTORY_KEY);
  } catch {
    /* ignore */
  }
}

export function deleteFromHistory(url: string, ranAt: number) {
  try {
    const next = readHistory().filter((e) => !(e.url === url && e.ranAt === ranAt));
    localStorage.setItem(AUDIT_HISTORY_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

// Render as a compact text block we can hand to the LLM as system context.
export function summariseForAgent(a: StoredAudit): string {
  const lines: string[] = [];
  const ago = Math.round((Date.now() - a.ranAt) / 60_000);
  lines.push(`USER'S LAST AUDIT (run ${ago} minute${ago === 1 ? "" : "s"} ago)`);
  lines.push(`URL: ${a.url}`);
  lines.push(`Source: ${a.sourceType === "api" ? "JSON API" : "web page"}`);
  if (a.scores) {
    lines.push(
      `Lighthouse scores — performance ${a.scores.performance}, seo ${a.scores.seo}, a11y ${a.scores.accessibility}, best practices ${a.scores.bestPractices}`,
    );
  }
  if (a.vitals) {
    lines.push(
      `Core Web Vitals — LCP ${a.vitals.lcp}, CLS ${a.vitals.cls}, FCP ${a.vitals.fcp}, TBT ${a.vitals.tbt}, Speed Index ${a.vitals.speedIndex}`,
    );
  }
  if (a.onPage) {
    const p = a.onPage;
    lines.push(
      `On-page — ${p.words} words, Flesch ${p.flesch} (grade ${p.grade}), H1 count ${p.h1Count}, H2 count ${p.h2Count}, H3 count ${p.h3Count}`,
    );
    lines.push(
      `Images — ${p.imagesMissingAlt}/${p.imagesTotal} missing alt. Links — ${p.internalLinks} internal, ${p.externalLinks} external.`,
    );
    lines.push(
      `Schema types — ${p.schemaTypes.length > 0 ? p.schemaTypes.join(", ") : "(none detected)"}`,
    );
    lines.push(
      `Meta — title ${p.titleLength} chars, description ${p.descriptionLength} chars.`,
    );
    if (p.headingIssues.length > 0) {
      lines.push(`Heading issues — ${p.headingIssues.join("; ")}`);
    }
  }
  if (a.topFixes && a.topFixes.length > 0) {
    lines.push(`Top Lighthouse opportunities — ${a.topFixes.slice(0, 6).join("; ")}`);
  }
  return lines.join("\n");
}
