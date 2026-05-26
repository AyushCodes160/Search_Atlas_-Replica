"use client";

import { useState } from "react";
import { Loader2, Globe, AlertCircle } from "lucide-react";

type AuditResult = {
  url: string;
  finalUrl: string;
  scores: {
    performance: number;
    seo: number;
    accessibility: number;
    bestPractices: number;
  };
  metrics: {
    lcp: string;
    cls: string;
    fcp: string;
    tbt: string;
    speedIndex: string;
  };
  issues: { title: string; description: string; impact: string }[];
  aiSuggestions: string;
};

const QUICK_SITES = [
  { label: "gotoretreats.com", url: "https://www.gotoretreats.com/" },
  { label: "app.aibridge.one", url: "https://app.aibridge.one/" },
];

export default function AuditTool() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AuditResult | null>(null);

  async function runAudit(target?: string) {
    const auditUrl = target ?? url;
    if (!auditUrl) {
      setError("Enter a URL first.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: auditUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Audit failed");
      setResult(data);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Something went wrong";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Input surface */}
      <div
        className="rounded-2xl p-5 sm:p-6"
        style={{ backgroundColor: "#EDEDED" }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 relative">
            <Globe
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              strokeWidth={2}
            />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full pl-10 pr-3 py-2.5 rounded-full bg-transparent outline-none text-[13px] text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/15 transition-all"
              onKeyDown={(e) => e.key === "Enter" && runAudit()}
            />
          </div>
          <button
            onClick={() => runAudit()}
            disabled={loading}
            className="inline-flex items-center gap-2 text-[13px] font-medium text-blue-500 border border-blue-400 rounded-full px-5 py-2.5 hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.5} />
                Auditing
              </>
            ) : (
              <>
                Run audit
                <span className="inline-block transition-transform duration-200 group-hover:translate-x-0.5">
                  →
                </span>
              </>
            )}
          </button>
        </div>

        {/* Quick test */}
        <div className="flex flex-wrap items-center gap-2 mt-5">
          <span className="text-[11.5px] text-gray-400 mr-1">Quick test</span>
          {QUICK_SITES.map((s) => (
            <button
              key={s.url}
              onClick={() => {
                setUrl(s.url);
                runAudit(s.url);
              }}
              disabled={loading}
              className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-gray-700 border border-gray-300 rounded-full px-3 py-1.5 hover:border-blue-400 hover:text-blue-500 transition-all duration-200 disabled:opacity-50 group"
            >
              {s.label}
              <span className="inline-block transition-transform duration-200 group-hover:translate-x-0.5">
                →
              </span>
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 text-[12px] text-red-500">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={2} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="mt-12 text-center text-[13px] text-gray-400">
          <Loader2
            className="w-5 h-5 animate-spin mx-auto mb-3 text-blue-500"
            strokeWidth={2}
          />
          Running Lighthouse + AI analysis. Takes 20–40 seconds.
        </div>
      )}

      {/* Results */}
      {result && <Results result={result} />}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Results({ result }: { result: AuditResult }) {
  return (
    <div className="mt-12 sm:mt-20 space-y-12 sm:space-y-20">
      <Section
        kicker="Lighthouse"
        title="Audit scores"
        meta={
          <a
            href={result.finalUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[11.5px] text-gray-400 hover:text-blue-500 truncate max-w-[18rem] transition-colors duration-200"
          >
            {result.finalUrl}
          </a>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ScoreCard label="Performance" score={result.scores.performance} />
          <ScoreCard label="SEO" score={result.scores.seo} />
          <ScoreCard
            label="Accessibility"
            score={result.scores.accessibility}
          />
          <ScoreCard
            label="Best Practices"
            score={result.scores.bestPractices}
          />
        </div>
      </Section>

      <Section kicker="Core metrics" title="Speed &amp; layout">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <MetricCard label="LCP" value={result.metrics.lcp} />
          <MetricCard label="CLS" value={result.metrics.cls} />
          <MetricCard label="FCP" value={result.metrics.fcp} />
          <MetricCard label="TBT" value={result.metrics.tbt} />
          <MetricCard label="Speed Index" value={result.metrics.speedIndex} />
        </div>
      </Section>

      <Section kicker="Gemini" title="AI fix plan">
        <div
          className="rounded-2xl p-6 sm:p-8 ai-prose"
          style={{ backgroundColor: "#EDEDED" }}
          dangerouslySetInnerHTML={{ __html: result.aiSuggestions }}
        />
      </Section>

      {result.issues.length > 0 && (
        <Section kicker="Lighthouse" title="Top issues">
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {result.issues.map((issue, i) => (
              <li
                key={i}
                className="flex gap-4 p-5 sm:p-6 rounded-2xl"
                style={{ backgroundColor: "#EDEDED" }}
              >
                <span className="text-[11.5px] font-medium text-blue-500 shrink-0 mt-0.5 tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <div className="font-medium text-[13px] text-gray-900 mb-1.5">
                    {issue.title}
                  </div>
                  <div
                    className="text-[13px] text-gray-400 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: issue.description }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function Section({
  kicker,
  title,
  meta,
  children,
}: {
  kicker: string;
  title: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="text-[11.5px] font-medium text-blue-500 mb-2">
            {kicker}
          </div>
          <h2
            className="text-[1.5rem] sm:text-[1.75rem] leading-[1.15] font-medium text-gray-900 tracking-tight"
            dangerouslySetInnerHTML={{ __html: title }}
          />
        </div>
        {meta}
      </div>
      {children}
    </section>
  );
}

function ScoreCard({ label, score }: { label: string; score: number }) {
  const color =
    score >= 90 ? "#16a34a" : score >= 50 ? "#d97706" : "#dc2626";
  const radius = 22;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;

  return (
    <div
      className="rounded-2xl p-5 sm:p-6 flex items-center gap-4"
      style={{ backgroundColor: "#EDEDED" }}
    >
      <div className="relative w-12 h-12 shrink-0">
        <svg className="w-12 h-12 -rotate-90" viewBox="0 0 56 56">
          <circle
            cx="28"
            cy="28"
            r={radius}
            stroke="#f0f0ee"
            strokeWidth="4"
            fill="none"
          />
          <circle
            cx="28"
            cy="28"
            r={radius}
            stroke={color}
            strokeWidth="4"
            fill="none"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="score-ring"
          />
        </svg>
      </div>
      <div className="min-w-0">
        <div className="text-[11.5px] text-gray-400 truncate">{label}</div>
        <div className="text-[22px] font-medium tabular-nums leading-tight mt-0.5 text-gray-900">
          {score}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-2xl p-5 sm:p-6"
      style={{ backgroundColor: "#EDEDED" }}
    >
      <div className="text-[11.5px] text-gray-400 mb-2">{label}</div>
      <div className="text-[15px] font-medium text-gray-900 tabular-nums">
        {value}
      </div>
    </div>
  );
}
