"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Loader2,
  Globe,
  AlertCircle,
  Download,
  Network,
  ExternalLink,
  Gauge,
  Check,
  Zap,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

type Mode = "fast" | "deep";
type ScanStatus = "queued" | "running" | "done" | "error" | "skipped";
type DeepStatus = "idle" | "running" | "done" | "error";

type FullAudit = {
  sourceType: "web" | "api";
  finalUrl?: string;
  scores?: { performance: number; seo: number; accessibility: number; bestPractices: number };
  metrics?: { lcp: string; cls: string; fcp: string; tbt: string; speedIndex: string };
  onPage?: {
    words: number;
    readingMinutes: number;
    readability: { flesch: number; grade: number; label: string };
    headings: { h1: string[]; h2Count: number; h3Count: number; h4Count: number; issues: string[] };
    images: { total: number; missingAlt: number };
    links: { internal: number; external: number; nofollow: number; dofollow: number };
    schema: { types: string[]; count: number };
    meta: { title: string | null; titleLength: number; description: string | null; descriptionLength: number; canonical: string | null; robots: string | null };
  } | null;
  issues?: { title: string; description: string; impact: string }[];
  aiSuggestions?: string;
};

type Row = {
  url: string;
  scan: ScanStatus;
  scanError?: string;
  words?: number;
  titleLength?: number;
  descriptionLength?: number;
  h1Count?: number;
  missingAlt?: number;
  internalLinks?: number;
  schemaCount?: number;
  issues?: string[];
  deep: DeepStatus;
  deepError?: string;
  performance?: number;
  seo?: number;
  accessibility?: number;
  bestPractices?: number;
  lcp?: string;
  full?: FullAudit;
  expanded?: boolean;
};

const CRAWL_STORE = "seo-engine:site-crawls";
const SCAN_CONCURRENCY = 6;
const DEEP_CONCURRENCY = 2;
const IMPACT_ORDER: Record<string, number> = { high: 0, medium: 1, info: 2 };

function scoreColor(s?: number): string {
  if (s == null) return "#8a7b5f";
  if (s >= 90) return "#6b7a3f";
  if (s >= 50) return "#d97706";
  return "#dc2626";
}
function issueColor(n: number): string {
  if (n === 0) return "#6b7a3f";
  if (n <= 2) return "#d97706";
  return "#dc2626";
}

function mdToHtml(md: string): string {
  let html = md.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");
  html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>");
  html = html.replace(/^# (.*$)/gim, "<h2>$1</h2>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/^\s*\d+\.\s+(.+)$/gim, "<oli>$1</oli>");
  html = html.replace(/(<oli>[\s\S]+?<\/oli>)/g, (m) => "<ol>" + m.replace(/<\/?oli>/g, (t) => (t === "<oli>" ? "<li>" : "</li>")) + "</ol>");
  html = html.replace(/<\/ol>\s*<ol>/g, "");
  html = html.replace(/^\s*[-*] (.+)$/gim, "<li>$1</li>");
  html = html.replace(/(<li>[\s\S]+?<\/li>)/g, "<ul>$1</ul>");
  html = html.replace(/<\/ul>\s*<ul>/g, "");
  html = html
    .split(/\n{2,}/)
    .map((b) => (/^<(h\d|ul|ol|li)/.test(b.trim()) ? b : `<p>${b}</p>`))
    .join("\n");
  return html;
}

export default function SiteCrawlPage() {
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<Mode>("fast");
  const [phase, setPhase] = useState<"idle" | "discovering" | "scanning" | "summarising" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [discovery, setDiscovery] = useState<{ total: number; capped: boolean; cap: number; source: string; origin: string } | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const cancelRef = useRef(false);
  const rowsRef = useRef<Row[]>([]);
  const { status: authStatus } = useSession();

  const busy = phase === "discovering" || phase === "scanning" || phase === "summarising";

  function setRowsBoth(next: Row[]) {
    rowsRef.current = next;
    setRows(next);
  }
  function patchRow(idx: number, patch: Partial<Row>) {
    const next = [...rowsRef.current];
    next[idx] = { ...next[idx], ...patch };
    setRowsBoth(next);
  }
  function toggleExpand(idx: number) {
    patchRow(idx, { expanded: !rowsRef.current[idx].expanded });
  }

  const scanned = rows.filter((r) => r.scan === "done");
  const deepDone = rows.filter((r) => r.deep === "done" && r.performance != null);

  const averages = useMemo(() => {
    if (deepDone.length === 0) return null;
    const avg = (sel: (r: Row) => number | undefined) =>
      Math.round(deepDone.reduce((a, r) => a + (sel(r) ?? 0), 0) / deepDone.length);
    return {
      performance: avg((r) => r.performance),
      seo: avg((r) => r.seo),
      accessibility: avg((r) => r.accessibility),
      bestPractices: avg((r) => r.bestPractices),
      pages: deepDone.length,
    };
  }, [deepDone]);

  const rollup = useMemo(() => {
    const web = scanned;
    if (web.length === 0) return [];
    const out: string[] = [];
    const noDesc = web.filter((r) => (r.descriptionLength ?? 0) === 0).length;
    const noTitle = web.filter((r) => (r.titleLength ?? 0) === 0).length;
    const noH1 = web.filter((r) => (r.h1Count ?? 0) === 0).length;
    const multiH1 = web.filter((r) => (r.h1Count ?? 0) > 1).length;
    const thin = web.filter((r) => (r.words ?? 0) < 300).length;
    const missingAlt = web.reduce((a, r) => a + (r.missingAlt ?? 0), 0);
    const noSchema = web.filter((r) => (r.schemaCount ?? 0) === 0).length;
    const totalWords = web.reduce((a, r) => a + (r.words ?? 0), 0);
    out.push(`${web.length} pages scanned, ${totalWords.toLocaleString()} total words across the site`);
    if (noTitle) out.push(`${noTitle}/${web.length} pages missing a <title>`);
    if (noDesc) out.push(`${noDesc}/${web.length} pages missing a meta description`);
    if (noH1) out.push(`${noH1}/${web.length} pages have no H1`);
    if (multiH1) out.push(`${multiH1}/${web.length} pages have multiple H1s`);
    if (thin) out.push(`${thin}/${web.length} pages are thin content (<300 words)`);
    if (missingAlt) out.push(`${missingAlt} images missing alt text site-wide`);
    if (noSchema) out.push(`${noSchema}/${web.length} pages have no structured data (schema)`);
    return out;
  }, [scanned]);

  const totalIssues = useMemo(() => scanned.reduce((a, r) => a + (r.issues?.length ?? 0), 0), [scanned]);

  const healthScore = useMemo(() => {
    if (scanned.length === 0) return null;
    const CHECKS_PER_PAGE = 7;
    const worst = scanned.length * CHECKS_PER_PAGE;
    const penalties = scanned.reduce((a, r) => a + Math.min(CHECKS_PER_PAGE, r.issues?.length ?? 0), 0);
    return Math.round(((worst - penalties) / worst) * 100);
  }, [scanned]);

  // Fast scan: HTML skim only.
  async function scanOne(target: string): Promise<Partial<Row>> {
    const res = await fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: target }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "scan failed");
    if (data.sourceType !== "web") return { scan: "skipped" };
    const op = data.onPage;
    return {
      scan: "done",
      words: op.words,
      titleLength: op.meta.titleLength,
      descriptionLength: op.meta.descriptionLength,
      h1Count: op.headings.h1.length,
      missingAlt: op.images.missingAlt,
      internalLinks: op.links.internal,
      schemaCount: op.schema.count,
      issues: data.issues,
    };
  }

  // Deep audit: full Lighthouse + on-page + AI. Fills scan fields too so the
  // table + rollup work the same whether a page was fast-scanned or deep-audited.
  function fullToRow(data: FullAudit): Partial<Row> {
    if (data.sourceType !== "web" || !data.onPage) {
      return { scan: "skipped", deep: "done" };
    }
    const op = data.onPage;
    const derivedIssues: string[] = [];
    if (!op.meta.title) derivedIssues.push("Missing <title>");
    else if (op.meta.titleLength > 60) derivedIssues.push(`Title too long (${op.meta.titleLength} chars)`);
    if (!op.meta.description) derivedIssues.push("Missing meta description");
    else if (op.meta.descriptionLength > 160) derivedIssues.push(`Meta description too long (${op.meta.descriptionLength} chars)`);
    if (op.headings.h1.length === 0) derivedIssues.push("No H1");
    else if (op.headings.h1.length > 1) derivedIssues.push(`Multiple H1s (${op.headings.h1.length})`);
    if (op.words < 300) derivedIssues.push(`Thin content (${op.words} words)`);
    if (op.images.missingAlt > 0) derivedIssues.push(`${op.images.missingAlt} images missing alt`);
    if (!op.meta.canonical) derivedIssues.push("No canonical tag");
    return {
      scan: "done",
      deep: "done",
      words: op.words,
      titleLength: op.meta.titleLength,
      descriptionLength: op.meta.descriptionLength,
      h1Count: op.headings.h1.length,
      missingAlt: op.images.missingAlt,
      internalLinks: op.links.internal,
      schemaCount: op.schema.count,
      issues: derivedIssues,
      performance: data.scores?.performance,
      seo: data.scores?.seo,
      accessibility: data.scores?.accessibility,
      bestPractices: data.scores?.bestPractices,
      lcp: data.metrics?.lcp,
      full: data,
    };
  }

  async function deepAuditRow(idx: number) {
    const row = rowsRef.current[idx];
    if (!row || row.deep === "running") return;
    patchRow(idx, { deep: "running", deepError: undefined });
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: row.url }),
      });
      const data = (await res.json()) as FullAudit & { error?: string };
      if (!res.ok) throw new Error(data.error || "audit failed");
      if (data.sourceType === "api") {
        patchRow(idx, { deep: "error", deepError: "JSON API — no Lighthouse" });
        return;
      }
      patchRow(idx, fullToRow(data));
    } catch (e: unknown) {
      patchRow(idx, { deep: "error", deepError: e instanceof Error ? e.message : "failed" });
    }
  }

  async function run() {
    if (!url.trim()) {
      setError("Enter a website URL first.");
      return;
    }
    cancelRef.current = false;
    setError(null);
    setSummary(null);
    setRowsBoth([]);
    setDiscovery(null);
    setPhase("discovering");

    let pages: string[] = [];
    let disc: typeof discovery = null;
    try {
      const res = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "crawl failed");
      pages = Array.from(new Set<string>(data.pages || []));
      disc = { total: data.total, capped: data.capped, cap: data.cap, source: data.source, origin: data.origin };
      setDiscovery(disc);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not discover pages.");
      setPhase("idle");
      return;
    }
    if (pages.length === 0) {
      setError("No pages found to audit.");
      setPhase("idle");
      return;
    }

    const initial: Row[] = pages.map((p) => ({ url: p, scan: "queued", deep: "idle" }));
    setRowsBoth(initial);
    setPhase("scanning");

    const queue = [...pages.keys()];
    const concurrency = mode === "deep" ? DEEP_CONCURRENCY : SCAN_CONCURRENCY;

    async function worker() {
      while (queue.length && !cancelRef.current) {
        const idx = queue.shift()!;
        patchRow(idx, { scan: "running", ...(mode === "deep" ? { deep: "running" } : {}) });
        try {
          if (mode === "deep") {
            const res = await fetch("/api/audit", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: rowsRef.current[idx].url }),
            });
            const data = (await res.json()) as FullAudit & { error?: string };
            if (!res.ok) throw new Error(data.error || "audit failed");
            if (data.sourceType === "api") {
              patchRow(idx, { scan: "skipped", deep: "error", deepError: "JSON API" });
            } else {
              patchRow(idx, fullToRow(data));
            }
          } else {
            const partial = await scanOne(rowsRef.current[idx].url);
            patchRow(idx, partial);
          }
        } catch (e: unknown) {
          patchRow(idx, {
            scan: "error",
            scanError: e instanceof Error ? e.message : "failed",
            ...(mode === "deep" ? { deep: "error" } : {}),
          });
        }
      }
    }
    await Promise.all(Array.from({ length: concurrency }, () => worker()));
    if (cancelRef.current) {
      setPhase("done");
      return;
    }

    // In fast mode, still give at least one Lighthouse score (homepage).
    if (mode === "fast") deepAuditRow(0);

    setPhase("summarising");
    const web = rowsRef.current.filter((r) => r.scan === "done");
    let sum: string | null = null;
    if (web.length > 0 && disc) {
      const deepRows = web.filter((r) => r.performance != null);
      const avg = deepRows.length
        ? {
            performance: Math.round(deepRows.reduce((a, r) => a + (r.performance ?? 0), 0) / deepRows.length),
            seo: Math.round(deepRows.reduce((a, r) => a + (r.seo ?? 0), 0) / deepRows.length),
            accessibility: Math.round(deepRows.reduce((a, r) => a + (r.accessibility ?? 0), 0) / deepRows.length),
            bestPractices: Math.round(deepRows.reduce((a, r) => a + (r.bestPractices ?? 0), 0) / deepRows.length),
          }
        : { performance: 0, seo: 0, accessibility: 0, bestPractices: 0 };
      const worstPages = [...web]
        .sort((a, b) => (b.issues?.length ?? 0) - (a.issues?.length ?? 0))
        .slice(0, 8)
        .map((r) => ({
          url: r.url, performance: r.performance, seo: r.seo, lcp: r.lcp,
          words: r.words, missingAlt: r.missingAlt, titleLength: r.titleLength,
          descriptionLength: r.descriptionLength, h1Count: r.h1Count,
        }));
      try {
        const res = await fetch("/api/site-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ origin: disc.origin, pagesAudited: web.length, averages: avg, rollup, worstPages }),
        });
        const data = await res.json();
        if (res.ok) { sum = data.summary; setSummary(data.summary); }
      } catch { /* best effort */ }
    }

    if (disc) {
      try {
        const raw = localStorage.getItem(CRAWL_STORE);
        const existing = raw ? JSON.parse(raw) : [];
        const entry = { id: `${Date.now()}`, origin: disc.origin, ranAt: Date.now(), pages: web.length, mode, healthScore, summary: sum };
        localStorage.setItem(CRAWL_STORE, JSON.stringify([entry, ...existing].slice(0, 20)));
      } catch { /* ignore */ }

      // Mirror to the cloud when signed in (endpoint 401s for anon — ignored).
      if (authStatus === "authenticated") {
        fetch("/api/me/crawls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            origin: disc.origin,
            pages: web.length,
            mode,
            healthScore,
            summary: sum,
            data: { rows: rowsRef.current, rollup },
          }),
          keepalive: true,
        }).catch(() => {});
      }
    }
    setPhase("done");
  }

  function cancel() { cancelRef.current = true; }

  function exportCsv() {
    const header = ["url", "words", "title_len", "desc_len", "h1_count", "missing_alt", "internal_links", "schema_count", "issue_count", "issues", "performance", "seo", "accessibility", "best_practices", "lcp", "scan_status"];
    const lines = rows.map((r) =>
      [`"${r.url}"`, r.words ?? "", r.titleLength ?? "", r.descriptionLength ?? "", r.h1Count ?? "", r.missingAlt ?? "", r.internalLinks ?? "", r.schemaCount ?? "", r.issues?.length ?? "", `"${(r.issues || []).join("; ").replace(/"/g, "'")}"`, r.performance ?? "", r.seo ?? "", r.accessibility ?? "", r.bestPractices ?? "", r.lcp ?? "", r.scan].join(","),
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const dl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = dl; a.download = `site-audit-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(dl);
  }

  const doneCount = rows.filter((r) => r.scan === "done").length;
  const errCount = rows.filter((r) => r.scan === "error").length;
  const skipCount = rows.filter((r) => r.scan === "skipped").length;
  const runningCount = rows.filter((r) => r.scan === "running").length;
  const remaining = rows.length - doneCount - errCount - skipCount;
  const etaMin = mode === "deep" ? Math.ceil((remaining * 25) / DEEP_CONCURRENCY / 60) : 0;

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-20 sm:pt-10 pb-10 max-w-6xl">
      <PageHeader
        kicker="whole-site audit"
        title="Audit every page, not just the homepage."
        subtitle="Auto-discover your pages, then run a Fast SEO scan (seconds) or a Deep Lighthouse audit (full scores + AI fix plan per page) across the whole site."
      />

      <div className="dotted-card p-5 sm:p-6 relative mb-8">
        <span className="font-hand text-clay text-[18px] absolute -top-3 left-5 bg-paper px-2">~ the site ~</span>

        {/* Mode toggle */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 mb-4">
          <ModeCard
            active={mode === "fast"}
            onClick={() => !busy && setMode("fast")}
            Icon={Zap}
            title="Fast scan"
            blurb="HTML skim on every page — title, meta, headings, alt, links, schema, issues. ~1s/page. Whole site in under a minute. (Homepage still gets one deep Lighthouse run.)"
          />
          <ModeCard
            active={mode === "deep"}
            onClick={() => !busy && setMode("deep")}
            Icon={Gauge}
            title="Deep audit"
            blurb="Full Lighthouse + Core Web Vitals + AI fix plan on every page — same detail as Site Audit. ~25s/page, 2 at a time. Thorough but slow on big sites."
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/60" strokeWidth={2.2} />
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="example.com"
              className="w-full pl-10 pr-3 py-3 rounded-lg bg-paper-50 border-2 border-ink/80 outline-none text-[14px] font-sans focus:ring-2 focus:ring-teal-accent/30"
              onKeyDown={(e) => e.key === "Enter" && !busy && run()}
              disabled={busy}
            />
          </div>
          {busy ? (
            <button onClick={cancel} className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-hand text-[20px] border-2 border-sunset text-sunset self-start">
              <Loader2 className="w-5 h-5 animate-spin" /> stop
            </button>
          ) : (
            <button onClick={run} className="btn-led inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-hand text-[20px] shadow-[3px_3px_0_0_rgba(44,36,23,0.85)] self-start">
              <Network className="w-4 h-4" /> {mode === "deep" ? "Deep-audit site" : "Audit entire site"} →
            </button>
          )}
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 text-[14px] text-sunset font-sans">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{error}</span>
          </div>
        )}
        {mode === "deep" && (
          <p className="mt-3 font-sans text-[12.5px] text-sunset leading-relaxed">
            Deep mode runs a full Lighthouse audit on every page (~25s each, 2 at a time). A 20-page site takes ~4 min; large sites can take 30+ min. Use the stop button anytime — results so far are kept.
          </p>
        )}
      </div>

      {/* Phase / progress */}
      {phase !== "idle" && (
        <div className="dotted-card p-4 mb-8">
          <div className="flex flex-wrap items-center gap-4 font-hand">
            <span className="text-[16px] text-ink inline-flex items-center gap-2">
              {busy && <Loader2 className="w-4 h-4 animate-spin text-teal-accent" />}
              {phase === "discovering" && "finding pages..."}
              {phase === "scanning" && (mode === "deep" ? "deep-auditing pages..." : "scanning pages...")}
              {phase === "summarising" && "writing site summary..."}
              {phase === "done" && "done"}
            </span>
            {discovery && (
              <span className="text-[14px] text-clay">
                found {discovery.total} {discovery.source === "sitemap" ? "(via sitemap)" : "(via links)"}
                {discovery.capped && ` — auditing first ${discovery.cap}`}
              </span>
            )}
            {phase === "scanning" && mode === "deep" && etaMin > 0 && (
              <span className="text-[14px] text-sunset">~{etaMin} min left</span>
            )}
            {rows.length > 0 && (
              <span className="text-[14px] text-ink-soft ml-auto">
                {doneCount} done · {runningCount} running · {skipCount} skipped · {errCount} errored / {rows.length}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Health + averages */}
      {healthScore !== null && (
        <section className="mb-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Site SEO health" value={String(healthScore)} color={scoreColor(healthScore)} />
          <StatCard label="Pages scanned" value={String(scanned.length)} />
          <StatCard label="Total issues" value={String(totalIssues)} color={issueColor(totalIssues)} />
          <StatCard label="Total words" value={scanned.reduce((a, r) => a + (r.words ?? 0), 0).toLocaleString()} />
        </section>
      )}
      {averages && (
        <section className="mb-8">
          <p className="font-hand text-clay text-[16px] mb-2">~ Lighthouse averages ({averages.pages} pages) ~</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Performance" value={String(averages.performance)} color={scoreColor(averages.performance)} />
            <StatCard label="SEO" value={String(averages.seo)} color={scoreColor(averages.seo)} />
            <StatCard label="Accessibility" value={String(averages.accessibility)} color={scoreColor(averages.accessibility)} />
            <StatCard label="Best Practices" value={String(averages.bestPractices)} color={scoreColor(averages.bestPractices)} />
          </div>
        </section>
      )}

      {/* Rollup */}
      {rollup.length > 0 && (
        <section className="mb-8">
          <p className="font-hand text-clay text-[16px] mb-2">~ site-wide findings ~</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {rollup.map((r) => (
              <li key={r} className="bg-paper-50/70 border border-ink/30 rounded-md p-3 font-sans text-[13px] text-ink flex items-start gap-2">
                <span className="text-teal-accent mt-0.5">•</span><span>{r}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* AI summary */}
      {summary && (
        <section className="sticky-note rounded-lg p-6 sm:p-8 border-[2.5px] border-ink/85 mb-8">
          <p className="font-hand text-clay text-[15px] mb-1">~ llama 3.3 ~</p>
          <h2 className="font-hand text-[28px] text-ink leading-tight mb-4">Site health report.</h2>
          <div className="ai-prose" dangerouslySetInnerHTML={{ __html: mdToHtml(summary) }} />
        </section>
      )}

      {/* Per-page table */}
      {rows.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
            <p className="font-hand text-clay text-[16px]">~ per-page results ~</p>
            <button onClick={exportCsv} className="font-hand text-[14px] inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-2 border-ink/40 text-ink-soft hover:border-ink">
              <Download className="w-3.5 h-3.5" /> export CSV
            </button>
          </div>
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-[12.5px] font-sans border-collapse">
              <thead>
                <tr className="text-left font-hand text-clay text-[13px]">
                  <th className="py-2 pr-2 w-6"></th>
                  <th className="py-2 pr-3">Page</th>
                  <th className="py-2 px-2">Issues</th>
                  <th className="py-2 px-2">Words</th>
                  <th className="py-2 px-2">Title</th>
                  <th className="py-2 px-2">Desc</th>
                  <th className="py-2 px-2">H1</th>
                  <th className="py-2 px-2">Alt</th>
                  <th className="py-2 px-2">Perf</th>
                  <th className="py-2 px-2">Deep</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => {
                  const canExpand = r.full != null;
                  return (
                    <Fragment key={`${idx}-${r.url}`}>
                      <tr className="border-t border-ink/15 align-top">
                        <td className="py-2.5 pr-2">
                          {canExpand && (
                            <button onClick={() => toggleExpand(idx)} aria-label="toggle detail" className="text-ink-soft hover:text-ink">
                              {r.expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                          )}
                        </td>
                        <UrlCell url={r.url} issues={r.issues} />
                        {r.scan === "done" ? (
                          <>
                            <td className="py-2.5 px-2 font-semibold tabular-nums" style={{ color: issueColor(r.issues?.length ?? 0) }}>{r.issues?.length ?? 0}</td>
                            <td className="py-2.5 px-2 tabular-nums text-ink-soft">{r.words ?? "—"}</td>
                            <td className="py-2.5 px-2 tabular-nums text-ink-soft">{r.titleLength ?? "—"}</td>
                            <td className="py-2.5 px-2 tabular-nums text-ink-soft">{r.descriptionLength ?? "—"}</td>
                            <td className="py-2.5 px-2 tabular-nums text-ink-soft">{r.h1Count ?? "—"}</td>
                            <td className="py-2.5 px-2 tabular-nums text-ink-soft">{r.missingAlt ?? "—"}</td>
                            <td className="py-2.5 px-2 tabular-nums font-semibold" style={{ color: scoreColor(r.performance) }}>{r.performance ?? "—"}</td>
                            <td className="py-2.5 px-2"><DeepButton row={r} onClick={() => deepAuditRow(idx)} /></td>
                          </>
                        ) : (
                          <td colSpan={8} className="py-2.5 px-2"><ScanBadge status={r.scan} error={r.scanError} /></td>
                        )}
                      </tr>
                      {r.expanded && r.full && (
                        <tr className="border-t border-ink/10 bg-paper-50/40">
                          <td colSpan={10} className="p-4">
                            <DetailPanel full={r.full} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function ModeCard({ active, onClick, Icon, title, blurb }: { active: boolean; onClick: () => void; Icon: typeof Zap; title: string; blurb: string }) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-md p-4 border-2 transition-transform ${active ? "border-ink/85 bg-paper -translate-y-0.5 shadow-[3px_3px_0_0_rgba(44,36,23,0.6)]" : "border-ink/40 bg-paper-50/50 hover:border-ink"}`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className={`w-4 h-4 ${active ? "text-teal-accent" : "text-ink-soft"}`} strokeWidth={2.2} />
        <span className="font-hand text-[19px] text-ink">{title}</span>
        {active && <Check className="w-4 h-4 text-teal-accent ml-auto" />}
      </div>
      <p className="font-sans text-[12px] text-ink-soft leading-relaxed">{blurb}</p>
    </button>
  );
}

function UrlCell({ url, issues }: { url: string; issues?: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const display = url.replace(/^https?:\/\//, "");
  const LIMIT = 44;
  const isLong = display.length > LIMIT;
  const shown = expanded || !isLong ? display : display.slice(0, LIMIT) + "…";
  return (
    <td className="py-2.5 pr-3 w-[300px] max-w-[300px]">
      <div className="flex items-start gap-1.5">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`text-ink hover:text-teal-accent ${expanded ? "break-all" : ""}`}
          title={url}
        >
          {shown}
        </a>
        <a href={url} target="_blank" rel="noopener noreferrer" aria-label="open page" className="shrink-0 mt-0.5 text-ink-soft hover:text-teal-accent">
          <ExternalLink className="w-3 h-3" />
        </a>
        {isLong && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="font-hand text-[11px] text-clay hover:text-ink shrink-0 mt-0.5"
          >
            {expanded ? "less" : "more"}
          </button>
        )}
      </div>
      {issues && issues.length > 0 && (
        <div className="font-sans text-[11px] text-ink-soft mt-1 leading-snug">
          {issues.slice(0, 3).join(" · ")}
          {issues.length > 3 && ` +${issues.length - 3}`}
        </div>
      )}
    </td>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="sticky-note rounded-md p-4 border-2 border-ink/80">
      <div className="font-hand text-clay text-[13px] mb-1">{label}</div>
      <div className="font-hand text-[40px] leading-none" style={{ color: color ?? "#2c2417" }}>{value}</div>
    </div>
  );
}

function DeepButton({ row, onClick }: { row: Row; onClick: () => void }) {
  if (row.deep === "running") return <span className="font-hand text-[12px] text-teal-dark inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> ~25s</span>;
  if (row.deep === "done") return <span className="font-hand text-[12px] text-leaf-dark inline-flex items-center gap-1" title={`LCP ${row.lcp ?? "?"}`}><Check className="w-3 h-3" /> done</span>;
  if (row.deep === "error") return <span className="font-hand text-[12px] text-sunset" title={row.deepError}>{row.deepError || "failed"}</span>;
  return <button onClick={onClick} className="font-hand text-[12px] inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-ink/40 text-ink-soft hover:border-ink hover:text-ink"><Gauge className="w-3 h-3" /> run</button>;
}

function ScanBadge({ status, error }: { status: ScanStatus; error?: string }) {
  const map: Record<ScanStatus, { label: string; cls: string }> = {
    queued: { label: "queued", cls: "text-ink-soft border-ink/30" },
    running: { label: "running", cls: "text-teal-dark border-teal-accent/50 bg-teal-accent/10" },
    done: { label: "done", cls: "text-leaf-dark border-leaf/50 bg-leaf/10" },
    skipped: { label: "skipped (not HTML)", cls: "text-clay border-clay/40 bg-clay/10" },
    error: { label: "error", cls: "text-sunset border-sunset/50 bg-sunset/10" },
  };
  const s = map[status];
  return <span className={`font-hand text-[11.5px] rounded-full px-2 py-0.5 border ${s.cls}`} title={error}>{s.label}</span>;
}

function DetailPanel({ full }: { full: FullAudit }) {
  const op = full.onPage;
  const sortedIssues = full.issues ? [...full.issues].sort((a, b) => (IMPACT_ORDER[a.impact] ?? 9) - (IMPACT_ORDER[b.impact] ?? 9)) : [];
  return (
    <div className="space-y-5">
      {full.scores && (
        <div>
          <p className="font-hand text-clay text-[14px] mb-2">~ lighthouse scores ~</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <MiniScore label="Performance" v={full.scores.performance} />
            <MiniScore label="SEO" v={full.scores.seo} />
            <MiniScore label="Accessibility" v={full.scores.accessibility} />
            <MiniScore label="Best Practices" v={full.scores.bestPractices} />
          </div>
        </div>
      )}
      {full.metrics && (
        <div>
          <p className="font-hand text-clay text-[14px] mb-2">~ core web vitals ~</p>
          <div className="flex flex-wrap gap-3 font-sans text-[12.5px]">
            <Vital label="LCP" v={full.metrics.lcp} />
            <Vital label="CLS" v={full.metrics.cls} />
            <Vital label="FCP" v={full.metrics.fcp} />
            <Vital label="TBT" v={full.metrics.tbt} />
            <Vital label="Speed Index" v={full.metrics.speedIndex} />
          </div>
        </div>
      )}
      {op && (
        <div>
          <p className="font-hand text-clay text-[14px] mb-2">~ on-page ~</p>
          <div className="flex flex-wrap gap-3 font-sans text-[12.5px] text-ink-soft">
            <span>{op.words} words</span>
            <span>· readability {op.readability.label} (Flesch {op.readability.flesch})</span>
            <span>· title {op.meta.titleLength}ch{op.meta.titleLength > 60 ? " (too long)" : ""}</span>
            <span>· desc {op.meta.descriptionLength}ch{op.meta.descriptionLength > 160 ? " (too long)" : ""}</span>
            <span>· {op.headings.h1.length} H1 / {op.headings.h2Count} H2 / {op.headings.h3Count} H3</span>
            <span>· {op.images.missingAlt}/{op.images.total} missing alt</span>
            <span>· {op.links.internal} internal / {op.links.external} external links</span>
            <span>· schema: {op.schema.types.join(", ") || "none"}</span>
          </div>
        </div>
      )}
      {full.aiSuggestions && (
        <div>
          <p className="font-hand text-clay text-[14px] mb-2">~ llama fix plan ~</p>
          <div className="ai-prose text-[13px]" dangerouslySetInnerHTML={{ __html: full.aiSuggestions }} />
        </div>
      )}
      {sortedIssues.length > 0 && (
        <div>
          <p className="font-hand text-clay text-[14px] mb-2">~ top issues ~</p>
          <ul className="space-y-2">
            {sortedIssues.slice(0, 8).map((iss, i) => (
              <li key={i} className="bg-paper-50/70 border border-ink/30 rounded-md p-2.5 flex items-start gap-2">
                <span className="font-hand text-teal-accent text-[15px] shrink-0">{String(i + 1).padStart(2, "0")}</span>
                <div className="flex-1">
                  <div className="flex items-start gap-2">
                    <span className="font-sans font-semibold text-[12.5px] text-ink flex-1">{iss.title}</span>
                    <span className="font-hand text-[10px] uppercase rounded-full px-1.5 py-0.5 border shrink-0" style={impactStyle(iss.impact)}>{iss.impact}</span>
                  </div>
                  <div className="font-sans text-[11.5px] text-ink-soft mt-0.5" dangerouslySetInnerHTML={{ __html: iss.description }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function impactStyle(impact: string): React.CSSProperties {
  if (impact === "high") return { color: "#c2412a", backgroundColor: "#fbe2dc", borderColor: "#c2412a" };
  if (impact === "medium") return { color: "#c2691b", backgroundColor: "#fceedd", borderColor: "#e67e22" };
  return { color: "#5a4b32", backgroundColor: "#f4ecd8", borderColor: "#8a7b5f" };
}

function MiniScore({ label, v }: { label: string; v: number }) {
  return (
    <div className="bg-paper-50/80 border-2 border-ink/40 rounded-md p-2.5 text-center">
      <div className="font-hand text-[28px] leading-none" style={{ color: scoreColor(v) }}>{v}</div>
      <div className="font-hand text-[11px] text-clay mt-1">{label}</div>
    </div>
  );
}

function Vital({ label, v }: { label: string; v: string }) {
  return (
    <span className="bg-paper-50/70 border border-ink/30 rounded-md px-2.5 py-1">
      <span className="font-hand text-clay text-[11px]">{label}</span> <span className="text-ink tabular-nums">{v}</span>
    </span>
  );
}
