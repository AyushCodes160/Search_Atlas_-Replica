"use client";

import { useMemo, useRef, useState } from "react";
import {
  Loader2,
  Globe,
  AlertCircle,
  Gauge,
  Zap,
  Check,
  Swords,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { humanDelay } from "@/lib/fetchPage";

type Mode = "fast" | "deep";
type SideKey = "mine" | "theirs";
type ScanStatus = "queued" | "running" | "done" | "error" | "skipped";

type FullAudit = {
  sourceType: "web" | "api";
  scores?: { performance: number; seo: number; accessibility: number; bestPractices: number };
  metrics?: { lcp: string };
  onPage?: {
    words: number;
    headings: { h1: string[] };
    images: { missingAlt: number };
    links: { internal: number };
    schema: { count: number };
    meta: { title: string | null; titleLength: number; description: string | null; descriptionLength: number; canonical: string | null };
  } | null;
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
  schemaCount?: number;
  issues?: string[];
  performance?: number;
  seo?: number;
  accessibility?: number;
  bestPractices?: number;
};

type Discovery = { total: number; capped: boolean; cap: number; source: string; origin: string };

type SiteStats = {
  pages: number;
  deepPages: number;
  avg: { performance: number; seo: number; accessibility: number; bestPractices: number } | null;
  totalWords: number;
  avgWords: number;
  pctMissingTitle: number;
  pctMissingDesc: number;
  pctNoH1: number;
  pctMultiH1: number;
  pctThin: number;
  missingAltTotal: number;
  pctNoSchema: number;
  totalIssues: number;
  avgIssuesPerPage: number;
  healthScore: number | null;
};

const SCAN_CONCURRENCY = 6;
const DEEP_CONCURRENCY = 2;
const CHECKS_PER_PAGE = 7;
// Default number of pages Lighthouse runs on per site in deep mode. The "audit
// all" toggle lifts it to every discovered page (up to the 150 crawl cap).
const DEEP_CAP = 30;

function scoreColor(s?: number | null): string {
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

function pct(n: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((n / total) * 100);
}

function siteStats(rows: Row[]): SiteStats | null {
  const scanned = rows.filter((r) => r.scan === "done");
  if (scanned.length === 0) return null;
  const deep = scanned.filter((r) => r.performance != null);
  const avgOf = (sel: (r: Row) => number | undefined) =>
    Math.round(deep.reduce((a, r) => a + (sel(r) ?? 0), 0) / deep.length);
  const totalWords = scanned.reduce((a, r) => a + (r.words ?? 0), 0);
  const penalties = scanned.reduce((a, r) => a + Math.min(CHECKS_PER_PAGE, r.issues?.length ?? 0), 0);
  const totalIssues = scanned.reduce((a, r) => a + (r.issues?.length ?? 0), 0);
  return {
    pages: scanned.length,
    deepPages: deep.length,
    avg: deep.length
      ? {
          performance: avgOf((r) => r.performance),
          seo: avgOf((r) => r.seo),
          accessibility: avgOf((r) => r.accessibility),
          bestPractices: avgOf((r) => r.bestPractices),
        }
      : null,
    totalWords,
    avgWords: Math.round(totalWords / scanned.length),
    pctMissingTitle: pct(scanned.filter((r) => (r.titleLength ?? 0) === 0).length, scanned.length),
    pctMissingDesc: pct(scanned.filter((r) => (r.descriptionLength ?? 0) === 0).length, scanned.length),
    pctNoH1: pct(scanned.filter((r) => (r.h1Count ?? 0) === 0).length, scanned.length),
    pctMultiH1: pct(scanned.filter((r) => (r.h1Count ?? 0) > 1).length, scanned.length),
    pctThin: pct(scanned.filter((r) => (r.words ?? 0) < 300).length, scanned.length),
    missingAltTotal: scanned.reduce((a, r) => a + (r.missingAlt ?? 0), 0),
    pctNoSchema: pct(scanned.filter((r) => (r.schemaCount ?? 0) === 0).length, scanned.length),
    totalIssues,
    avgIssuesPerPage: Math.round((totalIssues / scanned.length) * 10) / 10,
    healthScore: Math.round(((scanned.length * CHECKS_PER_PAGE - penalties) / (scanned.length * CHECKS_PER_PAGE)) * 100),
  };
}

// Fast scan: HTML skim only.
async function scanOne(target: string): Promise<Partial<Row>> {
  const res = await fetch("/api/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: target }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "scan failed");
  if (data.isBlockedByFirewall) {
    const who = data.blockVendor ? ` (${data.blockVendor})` : "";
    return { scan: "error", scanError: `blocked by firewall${who}` };
  }
  if (data.sourceType !== "web") return { scan: "skipped" };
  const op = data.onPage;
  return {
    scan: "done",
    words: op.words,
    titleLength: op.meta.titleLength,
    descriptionLength: op.meta.descriptionLength,
    h1Count: op.headings.h1.length,
    missingAlt: op.images.missingAlt,
    schemaCount: op.schema.count,
    issues: data.issues,
  };
}

function fullToRow(data: FullAudit): Partial<Row> {
  if (data.sourceType !== "web" || !data.onPage) return { scan: "skipped" };
  const op = data.onPage;
  const issues: string[] = [];
  if (!op.meta.title) issues.push("Missing <title>");
  else if (op.meta.titleLength > 60) issues.push(`Title too long (${op.meta.titleLength})`);
  if (!op.meta.description) issues.push("Missing meta description");
  else if (op.meta.descriptionLength > 160) issues.push(`Meta description too long (${op.meta.descriptionLength})`);
  if (op.headings.h1.length === 0) issues.push("No H1");
  else if (op.headings.h1.length > 1) issues.push(`Multiple H1s (${op.headings.h1.length})`);
  if (op.words < 300) issues.push(`Thin content (${op.words} words)`);
  if (op.images.missingAlt > 0) issues.push(`${op.images.missingAlt} images missing alt`);
  if (!op.meta.canonical) issues.push("No canonical tag");
  return {
    scan: "done",
    words: op.words,
    titleLength: op.meta.titleLength,
    descriptionLength: op.meta.descriptionLength,
    h1Count: op.headings.h1.length,
    missingAlt: op.images.missingAlt,
    schemaCount: op.schema.count,
    issues,
    performance: data.scores?.performance,
    seo: data.scores?.seo,
    accessibility: data.scores?.accessibility,
    bestPractices: data.scores?.bestPractices,
  };
}

export default function CompetitorCrawlPage() {
  const [mineUrl, setMineUrl] = useState("");
  const [theirsUrl, setTheirsUrl] = useState("");
  const [mode, setMode] = useState<Mode>("fast");
  const [auditAll, setAuditAll] = useState(false);
  const [deepening, setDeepening] = useState(false);
  const [phase, setPhase] = useState<"idle" | "discovering" | "scanning" | "comparing" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [mineDisc, setMineDisc] = useState<Discovery | null>(null);
  const [theirsDisc, setTheirsDisc] = useState<Discovery | null>(null);
  const [mineRows, setMineRows] = useState<Row[]>([]);
  const [theirsRows, setTheirsRows] = useState<Row[]>([]);
  const [comparison, setComparison] = useState<string | null>(null);
  const [showPages, setShowPages] = useState<{ mine: boolean; theirs: boolean }>({ mine: false, theirs: false });

  const mineRef = useRef<Row[]>([]);
  const theirsRef = useRef<Row[]>([]);
  const cancelRef = useRef(false);

  const busy = phase === "discovering" || phase === "scanning" || phase === "comparing";

  function refFor(side: SideKey) {
    return side === "mine" ? mineRef : theirsRef;
  }
  function setRowsFor(side: SideKey, next: Row[]) {
    refFor(side).current = next;
    (side === "mine" ? setMineRows : setTheirsRows)(next);
  }
  function patchRow(side: SideKey, idx: number, patch: Partial<Row>) {
    const r = refFor(side);
    const next = [...r.current];
    next[idx] = { ...next[idx], ...patch };
    setRowsFor(side, next);
  }

  async function discover(u: string): Promise<{ pages: string[]; disc: Discovery; blocked: { vendor: string | null; status: number } | null }> {
    const res = await fetch("/api/crawl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: u }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "crawl failed");
    if (data.isBlockedByFirewall) {
      return { pages: [], disc: { total: 0, capped: false, cap: 0, source: "blocked", origin: data.origin }, blocked: { vendor: data.blockVendor ?? null, status: data.blockStatus ?? 0 } };
    }
    const pages = Array.from(new Set<string>(data.pages || []));
    return { pages, disc: { total: data.total, capped: data.capped, cap: data.cap, source: data.source, origin: data.origin }, blocked: null };
  }

  // Phase 1 — fast HTML scan of one page.
  async function scanRow(side: SideKey, idx: number) {
    try {
      patchRow(side, idx, await scanOne(refFor(side).current[idx].url));
    } catch (e: unknown) {
      patchRow(side, idx, { scan: "error", scanError: e instanceof Error ? e.message : "failed" });
    }
  }

  // Phase 2 — full Lighthouse audit of one page, overwriting its scan row.
  async function deepAuditAt(side: SideKey, idx: number) {
    const row = refFor(side).current[idx];
    if (!row) return;
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: row.url }),
      });
      const data = (await res.json()) as FullAudit & { error?: string; isBlockedByFirewall?: boolean; blockVendor?: string | null };
      if (!res.ok) return;
      if (data.isBlockedByFirewall) {
        const who = data.blockVendor ? ` (${data.blockVendor})` : "";
        patchRow(side, idx, { scan: "error", scanError: `blocked by firewall${who}` });
      } else if (data.sourceType === "web") {
        patchRow(side, idx, fullToRow(data));
      }
    } catch {
      /* best effort */
    }
  }

  async function run() {
    if (!mineUrl.trim() || !theirsUrl.trim()) {
      setError("Both URLs are required.");
      return;
    }
    cancelRef.current = false;
    setError(null);
    setComparison(null);
    setMineDisc(null);
    setTheirsDisc(null);
    setRowsFor("mine", []);
    setRowsFor("theirs", []);
    setPhase("discovering");

    let minePages: string[] = [];
    let theirsPages: string[] = [];
    let mDisc: Discovery;
    let tDisc: Discovery;
    try {
      const [m, t] = await Promise.all([discover(mineUrl), discover(theirsUrl)]);
      // Surface a firewall block before doing anything else.
      const blockedSides: string[] = [];
      if (m.blocked) blockedSides.push(`your site${m.blocked.vendor ? ` (${m.blocked.vendor})` : ""}`);
      if (t.blocked) blockedSides.push(`the competitor${t.blocked.vendor ? ` (${t.blocked.vendor})` : ""}`);
      if (blockedSides.length > 0) {
        setError(`Blocked by an anti-bot firewall: ${blockedSides.join(" and ")}. Protected sites can't be crawled, so the comparison can't run.`);
        setPhase("idle");
        return;
      }
      minePages = m.pages;
      theirsPages = t.pages;
      mDisc = m.disc;
      tDisc = t.disc;
      setMineDisc(mDisc);
      setTheirsDisc(tDisc);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not discover pages.");
      setPhase("idle");
      return;
    }
    if (minePages.length === 0 || theirsPages.length === 0) {
      setError("One of the sites returned no pages to audit.");
      setPhase("idle");
      return;
    }

    setRowsFor("mine", minePages.map((p) => ({ url: p, scan: "queued" })));
    setRowsFor("theirs", theirsPages.map((p) => ({ url: p, scan: "queued" })));
    setDeepening(false);
    setPhase("scanning");

    // Phase 1 — fast-scan every page of BOTH sites (one shared queue, fast).
    const scanTasks: { side: SideKey; idx: number }[] = [
      ...minePages.map((_, idx) => ({ side: "mine" as SideKey, idx })),
      ...theirsPages.map((_, idx) => ({ side: "theirs" as SideKey, idx })),
    ];
    async function scanWorker() {
      let first = true;
      while (scanTasks.length && !cancelRef.current) {
        const task = scanTasks.shift()!;
        if (!first) await humanDelay(1000, 3000);
        first = false;
        if (cancelRef.current) break;
        patchRow(task.side, task.idx, { scan: "running" });
        await scanRow(task.side, task.idx);
      }
    }
    await Promise.all(Array.from({ length: SCAN_CONCURRENCY }, () => scanWorker()));
    if (cancelRef.current) {
      setPhase("done");
      return;
    }

    // Phase 2 — Lighthouse the top N pages per side (fast mode: just the
    // homepage of each, for a perf signal). One shared queue so deep concurrency
    // (and the PageSpeed rate limit) is respected globally, not doubled per side.
    const mineDeep = mode === "fast" ? 1 : auditAll ? minePages.length : Math.min(DEEP_CAP, minePages.length);
    const theirsDeep = mode === "fast" ? 1 : auditAll ? theirsPages.length : Math.min(DEEP_CAP, theirsPages.length);
    const deepTasks: { side: SideKey; idx: number }[] = [
      ...Array.from({ length: mineDeep }, (_, i) => ({ side: "mine" as SideKey, idx: i })),
      ...Array.from({ length: theirsDeep }, (_, i) => ({ side: "theirs" as SideKey, idx: i })),
    ];
    if (deepTasks.length > 0) {
      setDeepening(true);
      async function deepWorker() {
        let first = true;
        while (deepTasks.length && !cancelRef.current) {
          const task = deepTasks.shift()!;
          if (!first) await humanDelay(1000, 3000);
          first = false;
          if (cancelRef.current) break;
          await deepAuditAt(task.side, task.idx);
        }
      }
      await Promise.all(Array.from({ length: DEEP_CONCURRENCY }, () => deepWorker()));
      setDeepening(false);
    }
    if (cancelRef.current) {
      setPhase("done");
      return;
    }

    setPhase("comparing");
    const mStats = siteStats(mineRef.current);
    const tStats = siteStats(theirsRef.current);
    if (mStats && tStats) {
      try {
        const res = await fetch("/api/site-compare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mine: { origin: mDisc.origin, stats: { ...mStats, mode } },
            theirs: { origin: tDisc.origin, stats: { ...tStats, mode } },
          }),
        });
        const data = await res.json();
        if (res.ok) setComparison(data.comparison);
      } catch {
        /* best effort */
      }
    }
    setPhase("done");
  }

  function cancel() {
    cancelRef.current = true;
  }

  const mineStats = useMemo(() => siteStats(mineRows), [mineRows]);
  const theirsStats = useMemo(() => siteStats(theirsRows), [theirsRows]);

  const mineDone = mineRows.filter((r) => r.scan === "done" || r.scan === "skipped" || r.scan === "error").length;
  const theirsDone = theirsRows.filter((r) => r.scan === "done" || r.scan === "skipped" || r.scan === "error").length;
  const deepTarget =
    mode === "deep"
      ? (auditAll ? mineRows.length : Math.min(DEEP_CAP, mineRows.length)) +
        (auditAll ? theirsRows.length : Math.min(DEEP_CAP, theirsRows.length))
      : 0;
  const deepDoneCount = mineRows.filter((r) => r.performance != null).length + theirsRows.filter((r) => r.performance != null).length;
  const deepRemaining = Math.max(0, deepTarget - deepDoneCount);
  const etaMin = deepening ? Math.ceil((deepRemaining * 25) / DEEP_CONCURRENCY / 60) : 0;

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-20 sm:pt-10 pb-10 max-w-6xl">
      <PageHeader
        kicker="competitor site audit"
        title="Your whole site vs theirs."
        subtitle="Crawl both sites end to end, then compare site-wide averages — performance, SEO hygiene, content depth — and let Llama tell you where they beat you and what to copy."
      />

      <div className="dotted-card p-5 sm:p-6 relative mb-8">
        <span className="font-hand text-clay text-[18px] absolute -top-3 left-5 bg-paper px-2">~ the matchup ~</span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 mb-4">
          <ModeCard
            active={mode === "fast"}
            onClick={() => !busy && setMode("fast")}
            Icon={Zap}
            title="Fast scan"
            blurb="HTML SEO skim on every page of both sites — titles, meta, headings, alt, schema, issues. A polite 1-3s gap between requests keeps you under rate limits. (One homepage Lighthouse run per side for a perf signal.)"
          />
          <ModeCard
            active={mode === "deep"}
            onClick={() => !busy && setMode("deep")}
            Icon={Gauge}
            title="Deep audit"
            blurb="Every page gets a fast SEO scan, then full Lighthouse runs on the top pages of each site for true performance/SEO averages (~25s/page, 2 at a time). Toggle below to audit every page."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UrlField label="Your site" value={mineUrl} onChange={setMineUrl} placeholder="your-site.com" disabled={busy} />
          <UrlField label="Competitor site" value={theirsUrl} onChange={setTheirsUrl} placeholder="competitor.com" disabled={busy} />
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-5">
          {busy ? (
            <button onClick={cancel} className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-hand text-[20px] border-2 border-sunset text-sunset">
              <Loader2 className="w-5 h-5 animate-spin" /> stop
            </button>
          ) : (
            <button
              onClick={run}
              disabled={!mineUrl.trim() || !theirsUrl.trim()}
              className="btn-led inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-hand text-[20px] shadow-[3px_3px_0_0_rgba(44,36,23,0.85)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Swords className="w-4 h-4" /> {mode === "deep" ? "Deep-compare sites" : "Compare sites"} →
            </button>
          )}
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 text-[14px] text-sunset font-sans">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{error}</span>
          </div>
        )}
        {mode === "deep" && (
          <div className="mt-3 space-y-2">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={auditAll}
                onChange={(e) => setAuditAll(e.target.checked)}
                disabled={busy}
                className="mt-1 accent-teal-accent"
              />
              <span className="font-sans text-[12.5px] text-ink leading-relaxed">
                <strong>Audit every discovered page of both sites</strong> (up to 150 each). Off by default — we Lighthouse the top {DEEP_CAP} pages per site, which gives an accurate site-wide average. Turn on for exhaustive per-page performance (much slower).
              </span>
            </label>
            <p className="font-sans text-[12px] text-sunset leading-relaxed">
              Every page gets a fast SEO scan; Lighthouse (~25s/page, 2 at a time across both sites) runs on {auditAll ? "all discovered pages — large sites can take 30+ min" : `the top ${DEEP_CAP} per site`}. Stop anytime — results so far are kept.
            </p>
          </div>
        )}
      </div>

      {/* Progress */}
      {phase !== "idle" && (
        <div className="dotted-card p-4 mb-8">
          <div className="flex flex-wrap items-center gap-4 font-hand">
            <span className="text-[16px] text-ink inline-flex items-center gap-2">
              {busy && <Loader2 className="w-4 h-4 animate-spin text-teal-accent" />}
              {phase === "discovering" && "finding pages on both sites..."}
              {phase === "scanning" && (deepening ? "running Lighthouse on top pages..." : "scanning both sites...")}
              {phase === "comparing" && "writing the comparison..."}
              {phase === "done" && "done"}
            </span>
            {mineDisc && theirsDisc && (
              <span className="text-[14px] text-clay">
                you: {mineDone}/{mineRows.length} · them: {theirsDone}/{theirsRows.length}
              </span>
            )}
            {deepening && etaMin > 0 && (
              <span className="text-[14px] text-sunset ml-auto">~{etaMin} min left</span>
            )}
          </div>
        </div>
      )}

      {/* Side-by-side summary */}
      {(mineStats || theirsStats) && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
          <SiteColumn label="You" origin={mineDisc?.origin} stats={mineStats} other={theirsStats} tilt="-0.4deg" />
          <SiteColumn label="Them" origin={theirsDisc?.origin} stats={theirsStats} other={mineStats} tilt="0.4deg" />
        </section>
      )}

      {/* Delta table */}
      {mineStats && theirsStats && (
        <section className="dotted-card p-5 mb-8">
          <p className="font-hand text-clay text-[16px] mb-3">~ head to head ~</p>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] font-sans border-collapse">
              <thead>
                <tr className="text-left font-hand text-clay text-[13px]">
                  <th className="py-2 pr-3">Metric</th>
                  <th className="py-2 px-3 text-right">You</th>
                  <th className="py-2 px-3 text-right">Them</th>
                  <th className="py-2 pl-3 text-right">Edge</th>
                </tr>
              </thead>
              <tbody>
                <DeltaRow label="SEO health score" mine={mineStats.healthScore} them={theirsStats.healthScore} higherBetter />
                <DeltaRow label="Avg performance" mine={mineStats.avg?.performance ?? null} them={theirsStats.avg?.performance ?? null} higherBetter />
                <DeltaRow label="Avg SEO score" mine={mineStats.avg?.seo ?? null} them={theirsStats.avg?.seo ?? null} higherBetter />
                <DeltaRow label="Pages crawled" mine={mineStats.pages} them={theirsStats.pages} higherBetter neutral />
                <DeltaRow label="Avg words / page" mine={mineStats.avgWords} them={theirsStats.avgWords} higherBetter />
                <DeltaRow label="% missing title" mine={mineStats.pctMissingTitle} them={theirsStats.pctMissingTitle} suffix="%" />
                <DeltaRow label="% missing meta desc" mine={mineStats.pctMissingDesc} them={theirsStats.pctMissingDesc} suffix="%" />
                <DeltaRow label="% pages no H1" mine={mineStats.pctNoH1} them={theirsStats.pctNoH1} suffix="%" />
                <DeltaRow label="% thin (<300 words)" mine={mineStats.pctThin} them={theirsStats.pctThin} suffix="%" />
                <DeltaRow label="% pages no schema" mine={mineStats.pctNoSchema} them={theirsStats.pctNoSchema} suffix="%" />
                <DeltaRow label="Images missing alt" mine={mineStats.missingAltTotal} them={theirsStats.missingAltTotal} />
                <DeltaRow label="Avg issues / page" mine={mineStats.avgIssuesPerPage} them={theirsStats.avgIssuesPerPage} />
              </tbody>
            </table>
          </div>
          <p className="font-sans text-[11.5px] text-ink-soft mt-3">
            Compared on averages and rates so different page counts are judged fairly. {mode === "fast" && "Performance/SEO scores are homepage-only in fast scan — switch to deep for true site-wide Lighthouse averages."}
          </p>
        </section>
      )}

      {/* Verdict */}
      {comparison && (
        <section className="sticky-note rounded-lg p-6 sm:p-8 border-[2.5px] border-ink/85 mb-8" style={{ transform: "rotate(-0.3deg)" }}>
          <p className="font-hand text-clay text-[15px] mb-1">~ llama 3.3 ~</p>
          <h2 className="font-hand text-[28px] text-ink leading-tight mb-4">How the matchup reads.</h2>
          <div className="ai-prose" dangerouslySetInnerHTML={{ __html: mdToHtml(comparison) }} />
        </section>
      )}

      {/* Per-page breakdowns */}
      {(mineRows.length > 0 || theirsRows.length > 0) && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <PageBreakdown label="Your pages" rows={mineRows} open={showPages.mine} onToggle={() => setShowPages((s) => ({ ...s, mine: !s.mine }))} />
          <PageBreakdown label="Their pages" rows={theirsRows} open={showPages.theirs} onToggle={() => setShowPages((s) => ({ ...s, theirs: !s.theirs }))} />
        </section>
      )}
    </div>
  );
}

function UrlField({ label, value, onChange, placeholder, disabled }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; disabled?: boolean }) {
  return (
    <label className="block">
      <span className="font-hand text-[16px] text-clay block mb-1.5">{label}</span>
      <div className="relative">
        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/60" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-paper-50 border-2 border-ink/80 outline-none text-[14px] font-sans focus:ring-2 focus:ring-teal-accent/30 disabled:opacity-60"
        />
      </div>
    </label>
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

function SiteColumn({ label, origin, stats, other, tilt }: { label: string; origin?: string; stats: SiteStats | null; other: SiteStats | null; tilt: string }) {
  return (
    <div className="sticky-note rounded-lg p-6 border-[2.5px] border-ink/85" style={{ transform: `rotate(${tilt})` }}>
      <div className="font-hand text-clay text-[14px] mb-1">{label}</div>
      <h3 className="font-hand text-[18px] text-ink leading-tight mb-4 break-all">
        {origin ? origin.replace(/^https?:\/\//, "") : "…"}
      </h3>
      {!stats ? (
        <div className="flex items-center gap-2 text-clay font-hand text-[16px]">
          <Loader2 className="w-4 h-4 animate-spin" /> crawling…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <Metric label="SEO health" value={stats.healthScore} other={other?.healthScore} higherBetter />
            <Metric label="Pages" value={stats.pages} other={other?.pages} higherBetter neutral />
            <Metric label="Avg perf" value={stats.avg?.performance ?? null} other={other?.avg?.performance ?? null} higherBetter />
            <Metric label="Avg SEO" value={stats.avg?.seo ?? null} other={other?.avg?.seo ?? null} higherBetter />
          </div>
          <div className="bg-paper-50/70 border border-ink/30 rounded-md p-3 font-sans text-[12.5px] text-ink-soft space-y-1">
            <div>{stats.avgWords} avg words/page · {stats.totalWords.toLocaleString()} total</div>
            <div>{stats.pctMissingDesc}% missing meta desc · {stats.pctNoH1}% no H1</div>
            <div>{stats.pctThin}% thin pages · {stats.pctNoSchema}% no schema</div>
            <div>{stats.missingAltTotal} images missing alt · {stats.avgIssuesPerPage} issues/page</div>
          </div>
        </>
      )}
    </div>
  );
}

function Metric({ label, value, other, higherBetter, neutral }: { label: string; value: number | null; other?: number | null; higherBetter?: boolean; neutral?: boolean }) {
  const delta = value != null && other != null ? value - other : null;
  let tone = "text-clay";
  if (delta != null && !neutral) {
    const win = higherBetter ? delta > 0 : delta < 0;
    const lose = higherBetter ? delta < 0 : delta > 0;
    tone = win ? "text-leaf-dark" : lose ? "text-sunset" : "text-clay";
  }
  return (
    <div className="bg-paper-50/80 border border-ink/30 rounded-md p-2.5 flex items-center justify-between">
      <div>
        <div className="font-hand text-[11px] text-clay">{label}</div>
        <div className="font-hand text-[22px] leading-none tabular-nums mt-0.5" style={{ color: scoreColor(value) }}>
          {value ?? "—"}
        </div>
      </div>
      {delta != null && (
        <span className={`font-hand text-[12px] tabular-nums ${tone}`}>
          {delta > 0 ? "+" : ""}{delta}
        </span>
      )}
    </div>
  );
}

function DeltaRow({ label, mine, them, higherBetter, neutral, suffix }: { label: string; mine: number | null; them: number | null; higherBetter?: boolean; neutral?: boolean; suffix?: string }) {
  // Default for rate metrics (missing/thin/issues): lower is better.
  const hb = higherBetter ?? false;
  let edge = "—";
  let tone = "text-clay";
  if (mine != null && them != null && !neutral) {
    const youWin = hb ? mine > them : mine < them;
    const youLose = hb ? mine < them : mine > them;
    edge = youWin ? "you" : youLose ? "them" : "tie";
    tone = youWin ? "text-leaf-dark" : youLose ? "text-sunset" : "text-clay";
  }
  const fmt = (v: number | null) => (v == null ? "—" : `${v}${suffix ?? ""}`);
  return (
    <tr className="border-t border-ink/15">
      <td className="py-2 pr-3 text-ink-soft">{label}</td>
      <td className="py-2 px-3 text-right tabular-nums text-ink">{fmt(mine)}</td>
      <td className="py-2 px-3 text-right tabular-nums text-ink">{fmt(them)}</td>
      <td className={`py-2 pl-3 text-right font-hand ${tone}`}>{edge}</td>
    </tr>
  );
}

function PageBreakdown({ label, rows, open, onToggle }: { label: string; rows: Row[]; open: boolean; onToggle: () => void }) {
  const scanned = rows.filter((r) => r.scan === "done");
  return (
    <div className="dotted-card p-4">
      <button onClick={onToggle} className="w-full flex items-center justify-between font-hand text-[16px] text-ink">
        <span className="inline-flex items-center gap-2">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          {label}
        </span>
        <span className="text-clay text-[14px]">{scanned.length} pages</span>
      </button>
      {open && scanned.length > 0 && (
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-[12px] font-sans border-collapse">
            <thead>
              <tr className="text-left font-hand text-clay text-[12px]">
                <th className="py-1.5 pr-2">Page</th>
                <th className="py-1.5 px-2">Iss</th>
                <th className="py-1.5 px-2">Words</th>
                <th className="py-1.5 px-2">Perf</th>
              </tr>
            </thead>
            <tbody>
              {scanned.map((r, i) => {
                const d = r.url.replace(/^https?:\/\//, "");
                return (
                  <tr key={`${i}-${r.url}`} className="border-t border-ink/15">
                    <td className="py-1.5 pr-2 max-w-[220px]">
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-ink hover:text-teal-accent inline-flex items-center gap-1" title={r.url}>
                        <span className="truncate inline-block max-w-[200px] align-bottom">{d}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </td>
                    <td className="py-1.5 px-2 tabular-nums font-semibold" style={{ color: issueColor(r.issues?.length ?? 0) }}>{r.issues?.length ?? 0}</td>
                    <td className="py-1.5 px-2 tabular-nums text-ink-soft">{r.words ?? "—"}</td>
                    <td className="py-1.5 px-2 tabular-nums font-semibold" style={{ color: scoreColor(r.performance) }}>{r.performance ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
