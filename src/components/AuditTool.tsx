"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Globe, Loader2, ServerCog, FileCode, Share2, Check, Link as LinkIcon } from "lucide-react";
import { saveLastAudit, type StoredAudit } from "@/lib/auditContext";

type Classification = {
  type: "api" | "web";
  reasoning: string;
  signals: string[];
  allowedMetrics: string[];
  blockedMetrics: string[];
};

type OnPageAudit = {
  words: number;
  readingMinutes: number;
  readability: { flesch: number; grade: number; label: string };
  headings: { h1: string[]; h2Count: number; h3Count: number; h4Count: number; issues: string[] };
  images: { total: number; missingAlt: number; sampleMissing: { src: string; nearbyText: string }[] };
  links: { internal: number; external: number; nofollow: number; dofollow: number };
  schema: { types: string[]; count: number; suggested: string[] };
  meta: {
    title: string | null;
    titleLength: number;
    description: string | null;
    descriptionLength: number;
    canonical: string | null;
    viewport: string | null;
    ogTitle: string | null;
    ogDescription: string | null;
    ogImage: string | null;
    robots: string | null;
  };
};

type WebAuditResult = {
  sourceType: "web";
  url: string;
  finalUrl: string;
  probe: { contentType: string; status: number };
  classification: Classification;
  scores: { performance: number; seo: number; accessibility: number; bestPractices: number };
  metrics: { lcp: string; cls: string; fcp: string; tbt: string; speedIndex: string };
  issues: { title: string; description: string; impact: string }[];
  onPage: OnPageAudit | null;
  aiSuggestions: string;
};

type ApiAuditResult = {
  sourceType: "api";
  url: string;
  finalUrl: string;
  probe: { contentType: string; status: number };
  classification: Classification;
  timing: { avgMs: number; minMs: number; maxMs: number; status: number; bytes: number };
  schema: {
    rootType: "object" | "array" | "primitive" | "null";
    itemCount: number | null;
    keys: string[];
    sampleItemKeys: string[];
    maxDepth: number;
  };
  completeness: { totalChecked: number; nullFields: { field: string; nullCount: number }[] };
  parseError: string | null;
  aiSuggestions: string;
};

type AuditResult = WebAuditResult | ApiAuditResult;

const QUICK_SITES = [
  { label: "gotoretreats.com", url: "https://www.gotoretreats.com/" },
  { label: "app.aibridge.one", url: "https://app.aibridge.one/" },
  { label: "hn.algolia.com (API)", url: "https://hn.algolia.com/api/v1/search?query=seo" },
];

export default function AuditTool() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [sharedView, setSharedView] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const progRef = useRef<number | null>(null);

  // Load audit from URL hash if present (?share-link flow).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const m = window.location.hash.match(/^#share=(.+)$/);
    if (!m) return;
    const decoded = decodeShare(m[1]);
    if (decoded) {
      setResult(decoded);
      setSharedView(true);
      setUrl(decoded.url);
    }
  }, []);

  function shareCurrent() {
    if (!result) return;
    const hash = encodeShare(result);
    const link = `${window.location.origin}${window.location.pathname}#share=${hash}`;
    if (link.length > 8000) {
      setError("Audit too large to share via URL. Try CSV export instead.");
      return;
    }
    navigator.clipboard?.writeText(link);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 1800);
  }

  useEffect(() => {
    if (!loading) {
      if (progRef.current) window.clearInterval(progRef.current);
      progRef.current = null;
      return;
    }
    setProgress(8);
    progRef.current = window.setInterval(() => {
      setProgress((p) => (p < 92 ? p + Math.random() * 3.5 : p));
    }, 280);
    return () => {
      if (progRef.current) window.clearInterval(progRef.current);
    };
  }, [loading]);

  async function runAudit(target?: string) {
    const auditUrl = target ?? url;
    if (!auditUrl) {
      setError("Drop a URL on the page first.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setProgress(8);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: auditUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Audit failed");
      setProgress(100);
      setTimeout(() => setResult(data), 250);
      try {
        const stored: StoredAudit = {
          url: data.url,
          sourceType: data.sourceType,
          ranAt: Date.now(),
          scores: data.sourceType === "web" ? data.scores : undefined,
          vitals: data.sourceType === "web" ? data.metrics : undefined,
          onPage:
            data.sourceType === "web" && data.onPage
              ? {
                  words: data.onPage.words,
                  flesch: data.onPage.readability.flesch,
                  grade: data.onPage.readability.grade,
                  h1Count: data.onPage.headings.h1.length,
                  h2Count: data.onPage.headings.h2Count,
                  h3Count: data.onPage.headings.h3Count,
                  headingIssues: data.onPage.headings.issues,
                  imagesTotal: data.onPage.images.total,
                  imagesMissingAlt: data.onPage.images.missingAlt,
                  internalLinks: data.onPage.links.internal,
                  externalLinks: data.onPage.links.external,
                  schemaTypes: data.onPage.schema.types,
                  titleLength: data.onPage.meta.titleLength,
                  descriptionLength: data.onPage.meta.descriptionLength,
                }
              : undefined,
          topFixes:
            data.sourceType === "web" && Array.isArray(data.issues)
              ? data.issues.slice(0, 6).map((i: { title: string }) => i.title)
              : undefined,
        };
        saveLastAudit(stored);
      } catch {
        /* persistence is best-effort */
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="dotted-card p-5 sm:p-6 relative">
        <span className="font-hand text-clay text-[18px] absolute -top-3 left-5 bg-paper px-2">
          ~ audit form ~
        </span>

        <div className="flex flex-col gap-3">
          <label className="font-hand text-[20px] text-ink mt-2">URL to audit</label>
          <div className="relative">
            <Globe
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/60"
              strokeWidth={2.2}
            />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com  or  https://api.example.com/v1/items"
              className="w-full pl-10 pr-3 py-3 rounded-lg bg-paper-50 border-2 border-ink/80 outline-none text-[14px] text-ink placeholder:text-ink/40 focus:ring-2 focus:ring-teal-accent/30 font-sans"
              onKeyDown={(e) => e.key === "Enter" && runAudit()}
            />
          </div>

          <button
            onClick={() => runAudit()}
            disabled={loading}
            className="btn-led inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-hand text-[20px] shadow-[3px_3px_0_0_rgba(44,36,23,0.85)] disabled:opacity-60 disabled:cursor-not-allowed self-start"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" strokeWidth={2.5} />
                auditing...
              </>
            ) : (
              <>Run audit →</>
            )}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-5">
          <span className="font-hand text-[15px] text-clay mr-1">quick test:</span>
          {QUICK_SITES.map((s) => (
            <button
              key={s.url}
              onClick={() => {
                setUrl(s.url);
                runAudit(s.url);
              }}
              disabled={loading}
              className="font-hand text-[15px] text-ink hover:text-teal-accent border-2 border-ink/70 rounded-full px-3 py-1 hover:rotate-[-2deg] transition-transform disabled:opacity-50 shadow-[2px_2px_0_0_rgba(44,36,23,0.7)]"
            >
              {s.label} →
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 text-[14px] text-sunset font-sans">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={2.2} />
            <span>{error}</span>
          </div>
        )}

        <p className="mt-4 font-sans text-[12.5px] text-ink-soft leading-relaxed">
          Web URLs → full Lighthouse + Llama 3.3. JSON APIs auto-detect → backend-only review. No misleading SEO scores on endpoints.
        </p>

        {loading && (
          <div className="mt-5">
            <div className="font-hand text-[15px] text-clay mb-1">
              {progress < 30 && "classifying source..."}
              {progress >= 30 && progress < 70 && "running Lighthouse..."}
              {progress >= 70 && "asking Llama for the fix plan..."}
            </div>
            <div className="relative h-3 bg-paper-200 border-2 border-ink/80 rounded-full overflow-hidden">
              <div
                className="progress-watercolor h-full transition-[width] duration-300"
                style={{ width: `${progress}%` }}
              />
              <span
                className="absolute -top-1 transition-all duration-300"
                style={{ left: `calc(${progress}% - 8px)` }}
                aria-hidden
              >
                <svg width="22" height="20" viewBox="0 0 22 20" fill="none">
                  <path
                    d="M1 10 L18 10 M11 3 L18 10 L11 17"
                    stroke="#2c2417"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </div>
          </div>
        )}
      </div>

      {result && (
        <div className="flex flex-wrap items-center gap-3 -mb-2">
          {sharedView && (
            <span className="font-hand text-[14px] text-clay inline-flex items-center gap-1.5 border-2 border-ink/40 bg-paper-50 rounded-full px-3 py-1">
              <LinkIcon className="w-3.5 h-3.5" /> loaded from shared link
            </span>
          )}
          <button
            onClick={shareCurrent}
            className="font-hand text-[15px] text-ink border-2 border-ink/70 rounded-full px-4 py-1.5 hover:bg-paper-50 inline-flex items-center gap-1.5 shadow-[2px_2px_0_0_rgba(44,36,23,0.6)]"
          >
            {shareCopied ? <Check className="w-4 h-4 text-teal-accent" /> : <Share2 className="w-4 h-4" />}
            {shareCopied ? "link copied" : "share this audit"}
          </button>
        </div>
      )}

      {result?.sourceType === "web" && <WebResults result={result} />}
      {result?.sourceType === "api" && <ApiResults result={result} />}
    </div>
  );
}

function PanelHeader({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="mb-4">
      <p className="font-hand text-clay text-[15px] mb-1">~ {kicker} ~</p>
      <h3 className="font-hand text-[28px] text-ink leading-tight calligraphic">{title}</h3>
    </div>
  );
}

function SourceBanner({
  classification,
  finalUrl,
  contentType,
  status,
}: {
  classification: Classification;
  finalUrl: string;
  contentType: string;
  status: number;
}) {
  const Icon = classification.type === "api" ? ServerCog : FileCode;
  const label = classification.type === "api" ? "JSON API source" : "Web page source";
  return (
    <div className="sticky-note rounded-lg p-5 border-[2.5px] border-ink/85" style={{ transform: "rotate(-0.8deg)" }}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
        <div className="flex items-center gap-3 shrink-0">
          <span className="w-10 h-10 rounded-full bg-teal-accent/20 border-2 border-ink/80 flex items-center justify-center text-teal-dark">
            <Icon className="w-4 h-4" strokeWidth={2.2} />
          </span>
          <div>
            <div className="font-hand text-clay text-[14px]">detected</div>
            <div className="font-hand text-ink text-[22px] leading-tight">{label}</div>
          </div>
        </div>
        <div className="flex-1 font-sans text-[13px] text-ink-soft leading-relaxed">
          {classification.reasoning}
        </div>
        <div className="font-sans text-[12px] text-ink-soft sm:text-right shrink-0">
          <div className="truncate max-w-xs">{finalUrl}</div>
          <div className="typewriter">{status} · {contentType || "no content-type"}</div>
        </div>
      </div>

      {classification.signals.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {classification.signals.map((s) => (
            <span key={s} className="font-hand text-[14px] text-ink border-2 border-ink/70 rounded-full px-2.5 py-0.5 bg-paper-50">
              {s}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <MiniList label="allowed metrics" items={classification.allowedMetrics} dot="bg-teal-accent" />
        <MiniList label="blocked metrics" items={classification.blockedMetrics} dot="bg-sunset" />
      </div>
    </div>
  );
}

function MiniList({ label, items, dot }: { label: string; items: string[]; dot: string }) {
  return (
    <div className="bg-paper-50/70 rounded-md p-3 border border-ink/30">
      <p className="font-hand text-[15px] text-clay mb-2">{label}</p>
      <ul className="space-y-1">
        {items.map((m) => (
          <li key={m} className="text-[12.5px] text-ink-soft leading-relaxed flex items-start gap-2 font-sans">
            <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${dot}`} />
            <span>{m}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function WebResults({ result }: { result: WebAuditResult }) {
  return (
    <div className="space-y-6">
      <SourceBanner
        classification={result.classification}
        finalUrl={result.finalUrl}
        contentType={result.probe.contentType}
        status={result.probe.status}
      />

      <div className="sticky-note rounded-lg p-5 border-[2.5px] border-ink/85" style={{ transform: "rotate(0.6deg)" }}>
        <PanelHeader kicker="lighthouse" title="Audit scores" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <ScoreCard label="Performance" score={result.scores.performance} />
          <ScoreCard label="SEO" score={result.scores.seo} />
          <ScoreCard label="Accessibility" score={result.scores.accessibility} />
          <ScoreCard label="Best Practices" score={result.scores.bestPractices} />
        </div>
      </div>

      <div className="sticky-note rounded-lg p-5 border-[2.5px] border-ink/85" style={{ transform: "rotate(-0.5deg)" }}>
        <PanelHeader kicker="core metrics" title="Speed & layout" />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <MetricCard label="LCP" value={result.metrics.lcp} />
          <MetricCard label="CLS" value={result.metrics.cls} />
          <MetricCard label="FCP" value={result.metrics.fcp} />
          <MetricCard label="TBT" value={result.metrics.tbt} />
          <MetricCard label="Speed Index" value={result.metrics.speedIndex} />
        </div>
      </div>

      {result.onPage && <OnPagePanel onPage={result.onPage} />}

      <div className="sticky-note rounded-lg p-6 border-[2.5px] border-ink/85" style={{ transform: "rotate(0.4deg)" }}>
        <PanelHeader kicker="llama 3.3" title="AI fix plan" />
        <div className="ai-prose" dangerouslySetInnerHTML={{ __html: result.aiSuggestions }} />
      </div>

      {result.issues.length > 0 && (
        <div className="sticky-note rounded-lg p-5 border-[2.5px] border-ink/85" style={{ transform: "rotate(-0.4deg)" }}>
          <PanelHeader kicker="lighthouse" title="Top issues — priority sorted" />
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sortByImpact(result.issues).map((issue, i) => (
              <li key={i} className="bg-paper-50/70 border border-ink/30 rounded-md p-3 flex gap-3">
                <span className="font-hand text-teal-accent text-[18px] shrink-0">{String(i + 1).padStart(2, "0")}</span>
                <div className="flex-1">
                  <div className="flex items-start gap-2 mb-1">
                    <div className="font-sans font-semibold text-[13.5px] text-ink flex-1">{issue.title}</div>
                    <ImpactPill impact={issue.impact} />
                  </div>
                  <div className="font-sans text-[12.5px] text-ink-soft leading-relaxed" dangerouslySetInnerHTML={{ __html: issue.description }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ScoreCard({ label, score }: { label: string; score: number }) {
  const color = score >= 90 ? "#6b7a3f" : score >= 50 ? "#e67e22" : "#c2412a";
  const radius = 22;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="bg-paper-50/80 border-2 border-ink/70 rounded-md p-4 flex items-center gap-3 shadow-[2px_2px_0_0_rgba(44,36,23,0.5)]">
      <div className="relative w-12 h-12 shrink-0">
        <svg className="w-12 h-12 -rotate-90" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r={radius} stroke="#e8d9b4" strokeWidth="5" fill="none" />
          <circle
            cx="28"
            cy="28"
            r={radius}
            stroke={color}
            strokeWidth="5"
            fill="none"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="score-ring"
          />
        </svg>
      </div>
      <div className="min-w-0">
        <div className="font-hand text-[14px] text-clay truncate">{label}</div>
        <div className="font-hand text-[26px] text-ink leading-tight tabular-nums" style={{ color }}>
          {score}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-paper-50/80 border-2 border-ink/70 rounded-md p-3 shadow-[2px_2px_0_0_rgba(44,36,23,0.5)]">
      <div className="font-hand text-[14px] text-clay">{label}</div>
      <div className="typewriter text-[15px] text-ink mt-0.5">{value}</div>
    </div>
  );
}

function ApiResults({ result }: { result: ApiAuditResult }) {
  return (
    <div className="space-y-6">
      <SourceBanner
        classification={result.classification}
        finalUrl={result.finalUrl}
        contentType={result.probe.contentType}
        status={result.probe.status}
      />

      <div className="sticky-note rounded-lg p-5 border-[2.5px] border-ink/85" style={{ transform: "rotate(0.5deg)" }}>
        <PanelHeader kicker="response time" title="Latency profile" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label="Avg" value={`${result.timing.avgMs} ms`} />
          <MetricCard label="Min" value={`${result.timing.minMs} ms`} />
          <MetricCard label="Max" value={`${result.timing.maxMs} ms`} />
          <MetricCard label="Payload" value={`${(result.timing.bytes / 1024).toFixed(1)} KB`} />
        </div>
      </div>

      <div className="sticky-note rounded-lg p-5 border-[2.5px] border-ink/85" style={{ transform: "rotate(-0.5deg)" }}>
        <PanelHeader kicker="schema" title="Response shape" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="bg-paper-50/80 border-2 border-ink/70 rounded-md p-4 shadow-[2px_2px_0_0_rgba(44,36,23,0.5)]">
            <div className="font-hand text-[14px] text-clay">Root type</div>
            <div className="font-hand text-[20px] text-ink capitalize mb-3">{result.schema.rootType}</div>
            <div className="font-hand text-[14px] text-clay">Max depth</div>
            <div className="typewriter text-[15px] text-ink mb-3">{result.schema.maxDepth}</div>
            {result.schema.itemCount != null && (
              <>
                <div className="font-hand text-[14px] text-clay">Items</div>
                <div className="typewriter text-[15px] text-ink">{result.schema.itemCount}</div>
              </>
            )}
          </div>
          <KeyChips label="Root keys" keys={result.schema.keys} />
          <KeyChips label="Item keys" keys={result.schema.sampleItemKeys} />
        </div>
      </div>

      {result.completeness.totalChecked > 0 && (
        <div className="sticky-note rounded-lg p-5 border-[2.5px] border-ink/85" style={{ transform: "rotate(0.4deg)" }}>
          <PanelHeader kicker="data quality" title="Completeness" />
          <p className="font-hand text-[14px] text-clay mb-3">
            sampled {result.completeness.totalChecked} items
          </p>
          {result.completeness.nullFields.length === 0 ? (
            <div className="font-sans text-[13.5px] text-ink-soft">No null or empty values detected in sampled items.</div>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {result.completeness.nullFields.map((f) => (
                <li key={f.field} className="bg-paper-50/80 border-2 border-ink/60 rounded-md p-3 flex items-center justify-between">
                  <span className="font-sans font-semibold text-[13.5px] text-ink truncate">{f.field}</span>
                  <span className="typewriter text-[12px] text-clay shrink-0 ml-3">
                    {f.nullCount} null / {result.completeness.totalChecked}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="sticky-note rounded-lg p-6 border-[2.5px] border-ink/85" style={{ transform: "rotate(-0.3deg)" }}>
        <PanelHeader kicker="llama 3.3" title="Backend review" />
        <div className="ai-prose" dangerouslySetInnerHTML={{ __html: result.aiSuggestions }} />
      </div>
    </div>
  );
}

function KeyChips({ label, keys }: { label: string; keys: string[] }) {
  return (
    <div className="bg-paper-50/80 border-2 border-ink/70 rounded-md p-4 shadow-[2px_2px_0_0_rgba(44,36,23,0.5)]">
      <div className="font-hand text-[14px] text-clay mb-2">{label}</div>
      {keys.length === 0 ? (
        <div className="font-sans text-[13px] text-ink-soft">(none)</div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {keys.map((k) => (
            <span
              key={k}
              className="typewriter text-[12px] text-ink px-2 py-0.5 rounded border border-ink/40 bg-paper-100"
            >
              {k}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function OnPagePanel({ onPage }: { onPage: OnPageAudit }) {
  const titleTone =
    onPage.meta.titleLength === 0
      ? "text-sunset"
      : onPage.meta.titleLength > 60
        ? "text-sunset"
        : "text-ink";
  const descTone =
    onPage.meta.descriptionLength === 0
      ? "text-sunset"
      : onPage.meta.descriptionLength > 160
        ? "text-sunset"
        : "text-ink";
  return (
    <div className="sticky-note rounded-lg p-5 sm:p-6 border-[2.5px] border-ink/85" style={{ transform: "rotate(0.3deg)" }}>
      <PanelHeader kicker="on-page" title="What's on the page" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <MetricCard label="Words" value={onPage.words.toLocaleString()} />
        <MetricCard label="Reading time" value={`${onPage.readingMinutes} min`} />
        <MetricCard
          label={`Readability · ${onPage.readability.label}`}
          value={`Flesch ${onPage.readability.flesch}`}
        />
        <MetricCard label="Grade level" value={`${onPage.readability.grade}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
        {/* Meta tags */}
        <div className="bg-paper-50/80 border-2 border-ink/70 rounded-md p-4 shadow-[2px_2px_0_0_rgba(44,36,23,0.5)]">
          <div className="font-hand text-[14px] text-clay mb-2">Meta tags</div>
          <div className="space-y-2 font-sans text-[13px] text-ink-soft">
            <div>
              <span className="font-hand text-[12px] text-clay">title</span>
              <div className={`${titleTone} typewriter text-[12.5px] break-words`}>
                {onPage.meta.title || "(missing)"}
                <span className="font-hand text-[11px] text-clay ml-2">
                  {onPage.meta.titleLength} chars
                  {onPage.meta.titleLength > 60 ? " · too long" : ""}
                </span>
              </div>
            </div>
            <div>
              <span className="font-hand text-[12px] text-clay">description</span>
              <div className={`${descTone} typewriter text-[12.5px] break-words`}>
                {onPage.meta.description || "(missing)"}
                <span className="font-hand text-[11px] text-clay ml-2">
                  {onPage.meta.descriptionLength} chars
                  {onPage.meta.descriptionLength > 160 ? " · too long" : ""}
                </span>
              </div>
            </div>
            <div className="font-hand text-[12px] text-clay flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
              <span>canonical: <span className={onPage.meta.canonical ? "text-ink" : "text-sunset"}>{onPage.meta.canonical ? "✓" : "missing"}</span></span>
              <span>viewport: <span className={onPage.meta.viewport ? "text-ink" : "text-sunset"}>{onPage.meta.viewport ? "✓" : "missing"}</span></span>
              <span>og:title: <span className={onPage.meta.ogTitle ? "text-ink" : "text-sunset"}>{onPage.meta.ogTitle ? "✓" : "missing"}</span></span>
              <span>og:image: <span className={onPage.meta.ogImage ? "text-ink" : "text-sunset"}>{onPage.meta.ogImage ? "✓" : "missing"}</span></span>
              <span>robots: <span className="text-ink">{onPage.meta.robots || "—"}</span></span>
            </div>
          </div>
        </div>

        {/* Headings */}
        <div className="bg-paper-50/80 border-2 border-ink/70 rounded-md p-4 shadow-[2px_2px_0_0_rgba(44,36,23,0.5)]">
          <div className="font-hand text-[14px] text-clay mb-2">Headings</div>
          <div className="flex gap-4 mb-2">
            <CountChip label="H1" n={onPage.headings.h1.length} />
            <CountChip label="H2" n={onPage.headings.h2Count} />
            <CountChip label="H3" n={onPage.headings.h3Count} />
            <CountChip label="H4" n={onPage.headings.h4Count} />
          </div>
          {onPage.headings.h1.length > 0 && (
            <div className="font-sans text-[12.5px] text-ink mb-2">
              <span className="font-hand text-[11px] text-clay">H1:</span>{" "}
              {onPage.headings.h1[0]}
            </div>
          )}
          {onPage.headings.issues.length > 0 && (
            <ul className="space-y-1">
              {onPage.headings.issues.map((iss) => (
                <li key={iss} className="font-sans text-[12px] text-sunset flex items-start gap-1.5">
                  <span>!</span>
                  <span>{iss}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Images */}
        <div className="bg-paper-50/80 border-2 border-ink/70 rounded-md p-4 shadow-[2px_2px_0_0_rgba(44,36,23,0.5)]">
          <div className="font-hand text-[14px] text-clay mb-2">Images</div>
          <div className="font-hand text-[28px] text-ink leading-none">
            {onPage.images.missingAlt}
            <span className="font-hand text-[15px] text-clay"> / {onPage.images.total}</span>
          </div>
          <div className="font-sans text-[12px] text-ink-soft mt-1">
            missing alt attribute
          </div>
          {onPage.images.sampleMissing.length > 0 && (
            <ul className="mt-3 space-y-1 max-h-32 overflow-y-auto">
              {onPage.images.sampleMissing.map((img, i) => (
                <li key={i} className="typewriter text-[11px] text-ink-soft truncate" title={img.src}>
                  {img.src.replace(/^https?:\/\//, "")}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Links */}
        <div className="bg-paper-50/80 border-2 border-ink/70 rounded-md p-4 shadow-[2px_2px_0_0_rgba(44,36,23,0.5)]">
          <div className="font-hand text-[14px] text-clay mb-2">Links</div>
          <div className="flex gap-4 mb-2">
            <CountChip label="internal" n={onPage.links.internal} />
            <CountChip label="external" n={onPage.links.external} />
          </div>
          <div className="font-sans text-[12.5px] text-ink-soft">
            {onPage.links.dofollow} dofollow · {onPage.links.nofollow} nofollow
          </div>
        </div>

        {/* Schema */}
        <div className="bg-paper-50/80 border-2 border-ink/70 rounded-md p-4 shadow-[2px_2px_0_0_rgba(44,36,23,0.5)]">
          <div className="font-hand text-[14px] text-clay mb-2">Schema (JSON-LD)</div>
          {onPage.schema.types.length === 0 ? (
            <div className="font-sans text-[12.5px] text-sunset mb-2">No schema detected</div>
          ) : (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {onPage.schema.types.map((t) => (
                <span key={t} className="typewriter text-[11px] text-ink bg-paper-100 border border-ink/40 px-2 py-0.5 rounded">
                  {t}
                </span>
              ))}
            </div>
          )}
          {onPage.schema.suggested.length > 0 && (
            <div>
              <div className="font-hand text-[12px] text-clay mt-1 mb-1">consider adding:</div>
              <div className="flex flex-wrap gap-1.5">
                {onPage.schema.suggested.map((t) => (
                  <span key={t} className="typewriter text-[11px] text-teal-dark bg-teal-accent/15 border border-teal-accent/40 px-2 py-0.5 rounded">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CountChip({ label, n }: { label: string; n: number }) {
  return (
    <div>
      <div className="font-hand text-[22px] text-ink leading-none tabular-nums">{n}</div>
      <div className="font-hand text-[11px] text-clay">{label}</div>
    </div>
  );
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function trimForShare(r: AuditResult): AuditResult {
  if (r.sourceType === "web") {
    const issues = r.issues.slice(0, 8).map((i) => ({
      title: i.title,
      description: stripHtml(i.description).slice(0, 180),
      impact: i.impact,
    }));
    const onPage = r.onPage
      ? {
          ...r.onPage,
          images: { ...r.onPage.images, sampleMissing: [] },
          headings: { ...r.onPage.headings, h1: r.onPage.headings.h1.slice(0, 1) },
        }
      : null;
    return { ...r, aiSuggestions: "", issues, onPage };
  }
  return { ...r, aiSuggestions: "" };
}

function encodeShare(r: AuditResult): string {
  const trimmed = trimForShare(r);
  const json = JSON.stringify(trimmed);
  // URL-safe base64
  const b64 = typeof window === "undefined" ? Buffer.from(json).toString("base64") : btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeShare(hash: string): AuditResult | null {
  try {
    const b64 = hash.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json = decodeURIComponent(escape(atob(padded)));
    return JSON.parse(json) as AuditResult;
  } catch {
    return null;
  }
}

const IMPACT_ORDER: Record<string, number> = { high: 0, medium: 1, info: 2 };

function sortByImpact<T extends { impact: string }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => (IMPACT_ORDER[a.impact] ?? 99) - (IMPACT_ORDER[b.impact] ?? 99),
  );
}

function ImpactPill({ impact }: { impact: string }) {
  const tone =
    impact === "high"
      ? { fg: "#c2412a", bg: "#fbe2dc", border: "#c2412a" }
      : impact === "medium"
        ? { fg: "#c2691b", bg: "#fceedd", border: "#e67e22" }
        : { fg: "#5a4b32", bg: "#f4ecd8", border: "#8a7b5f" };
  return (
    <span
      className="font-hand text-[11px] rounded-full px-2 py-0.5 border shrink-0 uppercase tracking-wide"
      style={{ color: tone.fg, backgroundColor: tone.bg, borderColor: tone.border }}
    >
      {impact}
    </span>
  );
}
