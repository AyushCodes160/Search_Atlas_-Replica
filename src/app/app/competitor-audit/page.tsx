"use client";

import { useState } from "react";
import {
  Loader2,
  Play,
  AlertCircle,
  Swords,
  Globe,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { saveLastAudit, type StoredAudit } from "@/lib/auditContext";

type WebAudit = {
  sourceType: "web";
  url: string;
  finalUrl: string;
  scores: { performance: number; seo: number; accessibility: number; bestPractices: number };
  metrics: { lcp: string; cls: string; fcp: string; tbt: string; speedIndex: string };
  onPage: {
    words: number;
    readability: { flesch: number; grade: number; label: string };
    headings: { h1: string[]; h2Count: number; h3Count: number; h4Count: number; issues: string[] };
    images: { total: number; missingAlt: number };
    links: { internal: number; external: number; nofollow: number; dofollow: number };
    schema: { types: string[]; suggested: string[] };
    meta: { title: string | null; titleLength: number; description: string | null; descriptionLength: number };
  } | null;
};

type ApiAudit = {
  sourceType: "api";
  url: string;
  finalUrl: string;
};

type Audit = WebAudit | ApiAudit;

function mdToHtml(md: string): string {
  let html = md.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  html = html.replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code}</code></pre>`);
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");
  html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>");
  html = html.replace(/^# (.*$)/gim, "<h2>$1</h2>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/^\s*\d+\.\s+(.+)$/gim, "<oli>$1</oli>");
  html = html.replace(/(<oli>[\s\S]+?<\/oli>)/g, (m) => "<ol>" + m.replace(/<\/?oli>/g, (t) => (t === "<oli>" ? "<li>" : "</li>")) + "</ol>");
  html = html.replace(/<\/ol>\s*<ol>/g, "");
  html = html.replace(/^\s*[-*] (.+)$/gim, "<li>$1</li>");
  html = html.replace(/(<li>[\s\S]+?<\/li>)/g, "<ul>$1</ul>");
  html = html.replace(/<\/ul>\s*<ul>/g, "");
  html = html
    .split(/\n{2,}/)
    .map((b) => (/^<(h\d|ul|ol|pre|li)/.test(b.trim()) ? b : `<p>${b.replace(/\n/g, "<br/>")}</p>`))
    .join("\n");
  return html;
}

async function fetchAudit(url: string): Promise<Audit> {
  const res = await fetch("/api/audit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Audit failed");
  return data;
}

function scoreColor(s: number): string {
  if (s >= 90) return "#6b7a3f";
  if (s >= 50) return "#d97706";
  return "#dc2626";
}

function deltaTone(delta: number): string {
  if (delta > 0) return "text-leaf-dark";
  if (delta < 0) return "text-sunset";
  return "text-clay";
}

export default function CompetitorAuditPage() {
  const [mine, setMine] = useState("");
  const [theirs, setTheirs] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mineAudit, setMineAudit] = useState<Audit | null>(null);
  const [theirsAudit, setTheirsAudit] = useState<Audit | null>(null);
  const [comparison, setComparison] = useState<string | null>(null);

  async function run() {
    if (!mine.trim() || !theirs.trim()) {
      setError("Both URLs required.");
      return;
    }
    setLoading(true);
    setError(null);
    setMineAudit(null);
    setTheirsAudit(null);
    setComparison(null);
    try {
      const [m, t] = await Promise.all([fetchAudit(mine), fetchAudit(theirs)]);
      setMineAudit(m);
      setTheirsAudit(t);

      // Save "mine" as the last audit so Atlas Agent can pick up where the user left off.
      if (m.sourceType === "web") {
        const stored: StoredAudit = {
          url: m.url,
          sourceType: "web",
          ranAt: Date.now(),
          scores: m.scores,
          vitals: m.metrics,
          onPage: m.onPage
            ? {
                words: m.onPage.words,
                flesch: m.onPage.readability.flesch,
                grade: m.onPage.readability.grade,
                h1Count: m.onPage.headings.h1.length,
                h2Count: m.onPage.headings.h2Count,
                h3Count: m.onPage.headings.h3Count,
                headingIssues: m.onPage.headings.issues,
                imagesTotal: m.onPage.images.total,
                imagesMissingAlt: m.onPage.images.missingAlt,
                internalLinks: m.onPage.links.internal,
                externalLinks: m.onPage.links.external,
                schemaTypes: m.onPage.schema.types,
                titleLength: m.onPage.meta.titleLength,
                descriptionLength: m.onPage.meta.descriptionLength,
              }
            : undefined,
        };
        saveLastAudit(stored);
      }

      // Only run comparison if both are web audits with onPage data
      if (m.sourceType === "web" && t.sourceType === "web") {
        const cmp = await fetch("/api/compare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mine: m, competitor: t }),
        });
        const data = await cmp.json();
        if (cmp.ok) setComparison(data.comparison);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-20 sm:pt-10 pb-10 max-w-6xl">
      <PageHeader
        kicker="competitor audit"
        title="You vs them, side by side."
        subtitle="Paste your URL and one competitor URL. Both get the full Lighthouse + on-page audit, then Llama writes a comparison: where they win, where you win, what to copy."
      />

      <div className="dotted-card p-5 sm:p-6 relative mb-8">
        <span className="font-hand text-clay text-[18px] absolute -top-3 left-5 bg-paper px-2">
          ~ the matchup ~
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <UrlField
            label="Your URL"
            value={mine}
            onChange={setMine}
            placeholder="https://your-site.com"
            disabled={loading}
          />
          <UrlField
            label="Competitor URL"
            value={theirs}
            onChange={setTheirs}
            placeholder="https://competitor.com"
            disabled={loading}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-5">
          <button
            onClick={run}
            disabled={loading || !mine.trim() || !theirs.trim()}
            className="btn-led inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-hand text-[20px] shadow-[3px_3px_0_0_rgba(44,36,23,0.85)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                comparing...
              </>
            ) : (
              <>
                <Swords className="w-4 h-4" /> Compare →
              </>
            )}
          </button>
          <p className="font-sans text-[12px] text-ink-soft">
            Both audits run in parallel. ~30-50 seconds total.
          </p>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 text-[14px] text-sunset font-sans">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {(mineAudit || theirsAudit) && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
          <SidePanel label="You" audit={mineAudit} other={theirsAudit} tilt="-0.4deg" />
          <SidePanel label="Them" audit={theirsAudit} other={mineAudit} tilt="0.4deg" />
        </section>
      )}

      {comparison && (
        <section className="sticky-note rounded-lg p-6 sm:p-8 border-[2.5px] border-ink/85" style={{ transform: "rotate(-0.3deg)" }}>
          <div className="flex items-center gap-2 mb-5">
            <p className="font-hand text-clay text-[15px]">~ llama 3.3 ~</p>
          </div>
          <h2 className="font-hand text-[28px] text-ink leading-tight mb-5">
            How the matchup reads.
          </h2>
          <div className="ai-prose" dangerouslySetInnerHTML={{ __html: mdToHtml(comparison) }} />
        </section>
      )}
    </div>
  );
}

function UrlField({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="font-hand text-[16px] text-clay block mb-1.5">{label}</span>
      <div className="relative">
        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/60" />
        <input
          type="url"
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

function SidePanel({
  label,
  audit,
  other,
  tilt,
}: {
  label: string;
  audit: Audit | null;
  other: Audit | null;
  tilt: string;
}) {
  if (!audit) {
    return (
      <div
        className="sticky-note rounded-lg p-6 border-[2.5px] border-ink/85 text-center"
        style={{ transform: `rotate(${tilt})` }}
      >
        <Loader2 className="w-6 h-6 animate-spin text-teal-accent mx-auto mb-2" />
        <p className="font-hand text-[18px] text-clay">{label} loading...</p>
      </div>
    );
  }
  if (audit.sourceType === "api") {
    return (
      <div
        className="sticky-note rounded-lg p-6 border-[2.5px] border-ink/85"
        style={{ transform: `rotate(${tilt})` }}
      >
        <div className="font-hand text-clay text-[14px] mb-1">{label}</div>
        <h3 className="font-hand text-[20px] text-ink leading-tight mb-2 break-all">
          {audit.url.replace(/^https?:\/\//, "")}
        </h3>
        <p className="font-sans text-[13px] text-ink-soft">
          JSON API source — Lighthouse not applicable. Cannot be compared to a web page meaningfully.
        </p>
      </div>
    );
  }
  const otherWeb = other?.sourceType === "web" ? other : null;
  return (
    <div
      className="sticky-note rounded-lg p-6 border-[2.5px] border-ink/85"
      style={{ transform: `rotate(${tilt})` }}
    >
      <div className="font-hand text-clay text-[14px] mb-1">{label}</div>
      <h3 className="font-hand text-[18px] text-ink leading-tight mb-4 break-all">
        {audit.finalUrl.replace(/^https?:\/\//, "")}
      </h3>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <ScoreBlock label="Performance" mine={audit.scores.performance} other={otherWeb?.scores.performance} />
        <ScoreBlock label="SEO" mine={audit.scores.seo} other={otherWeb?.scores.seo} />
        <ScoreBlock label="A11y" mine={audit.scores.accessibility} other={otherWeb?.scores.accessibility} />
        <ScoreBlock label="Best Pr." mine={audit.scores.bestPractices} other={otherWeb?.scores.bestPractices} />
      </div>

      <div className="bg-paper-50/70 border border-ink/30 rounded-md p-3 mb-3">
        <div className="font-hand text-[13px] text-clay mb-2">Core vitals</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 typewriter text-[12px] text-ink">
          <span>LCP: {audit.metrics.lcp}</span>
          <span>CLS: {audit.metrics.cls}</span>
          <span>FCP: {audit.metrics.fcp}</span>
          <span>TBT: {audit.metrics.tbt}</span>
        </div>
      </div>

      {audit.onPage && (
        <div className="bg-paper-50/70 border border-ink/30 rounded-md p-3 space-y-2">
          <div className="font-hand text-[13px] text-clay">On-page</div>
          <Row label="Words" mine={audit.onPage.words} other={otherWeb?.onPage?.words} />
          <Row label="Readability (Flesch)" mine={audit.onPage.readability.flesch} other={otherWeb?.onPage?.readability.flesch} />
          <Row label="H1 count" mine={audit.onPage.headings.h1.length} other={otherWeb?.onPage?.headings.h1.length} />
          <Row label="H2 count" mine={audit.onPage.headings.h2Count} other={otherWeb?.onPage?.headings.h2Count} />
          <Row label="Images missing alt" mine={audit.onPage.images.missingAlt} other={otherWeb?.onPage?.images.missingAlt} invert />
          <Row label="Internal links" mine={audit.onPage.links.internal} other={otherWeb?.onPage?.links.internal} />
          <Row label="External links" mine={audit.onPage.links.external} other={otherWeb?.onPage?.links.external} />
          <Row label="Schema types" mine={audit.onPage.schema.types.length} other={otherWeb?.onPage?.schema.types.length} />
          <Row label="Title length" mine={audit.onPage.meta.titleLength} other={otherWeb?.onPage?.meta.titleLength} />
          <Row label="Description length" mine={audit.onPage.meta.descriptionLength} other={otherWeb?.onPage?.meta.descriptionLength} />
        </div>
      )}
    </div>
  );
}

function ScoreBlock({ label, mine, other }: { label: string; mine: number; other?: number }) {
  const color = scoreColor(mine);
  const delta = other != null ? mine - other : null;
  return (
    <div className="bg-paper-50/80 border border-ink/30 rounded-md p-2.5 flex items-center justify-between">
      <div>
        <div className="font-hand text-[11px] text-clay">{label}</div>
        <div className="font-hand text-[20px] leading-none tabular-nums mt-0.5" style={{ color }}>
          {mine}
        </div>
      </div>
      {delta != null && (
        <span className={`font-hand text-[12px] tabular-nums ${deltaTone(delta)}`}>
          {delta > 0 ? "+" : ""}
          {delta}
        </span>
      )}
    </div>
  );
}

function Row({
  label,
  mine,
  other,
  invert,
}: {
  label: string;
  mine: number;
  other?: number;
  invert?: boolean;
}) {
  let delta: number | null = null;
  if (other != null) delta = mine - other;
  // For "bad" metrics (like missing alt count) — lower is better, so invert tone
  const tone = delta == null ? "text-clay" : invert ? deltaTone(-delta) : deltaTone(delta);
  return (
    <div className="flex items-center justify-between font-sans text-[12.5px]">
      <span className="text-ink-soft">{label}</span>
      <span className="flex items-center gap-2 tabular-nums">
        <span className="text-ink">{mine}</span>
        {delta != null && (
          <span className={`text-[11px] ${tone}`}>
            {delta > 0 ? "+" : ""}
            {delta}
          </span>
        )}
      </span>
    </div>
  );
}
