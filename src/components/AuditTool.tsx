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
      {/* Input pill card */}
      <div
        className="rounded-3xl p-4 sm:p-5"
        style={{ backgroundColor: "#EDEDED" }}
      >
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="flex-1 relative">
            <Globe
              className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              strokeWidth={2}
            />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-transparent focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 outline-none text-[13px] placeholder:text-gray-400"
              onKeyDown={(e) => e.key === "Enter" && runAudit()}
            />
          </div>
          <button
            onClick={() => runAudit()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 text-[13px] font-medium text-blue-500 border border-blue-400 bg-white rounded-full px-6 py-3 hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.5} />
                Auditing
              </>
            ) : (
              <>
                Run audit
                <span className="transition-transform duration-200 group-hover:translate-x-0.5">
                  →
                </span>
              </>
            )}
          </button>
        </div>

        {/* Quick-test */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <span className="text-[11.5px] text-gray-500 mr-1">Quick test</span>
          {QUICK_SITES.map((s) => (
            <button
              key={s.url}
              onClick={() => {
                setUrl(s.url);
                runAudit(s.url);
              }}
              disabled={loading}
              className="text-[11.5px] font-medium px-3 py-1.5 rounded-full bg-white border border-transparent text-gray-700 hover:border-blue-400 hover:text-blue-500 transition-colors duration-200 disabled:opacity-50 group"
            >
              {s.label}
              <span className="inline-block ml-1 transition-transform duration-200 group-hover:translate-x-0.5">
                →
              </span>
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 text-[12px] text-red-600 bg-white border border-red-100 rounded-2xl px-3 py-2.5">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={2} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="mt-10 text-center text-[12px] text-gray-500">
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
    <div className="mt-12 space-y-10">
      <Section
        kicker="Lighthouse"
        title="Audit scores"
        meta={
          <a
            href={result.finalUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[11.5px] text-gray-500 hover:text-gray-700 truncate max-w-[16rem] hover:underline underline-offset-2"
          >
            {result.finalUrl}
          </a>
        }
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

      <Section kicker="Core metrics" title="Speed & layout">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <MetricCard label="LCP" value={result.metrics.lcp} />
          <MetricCard label="CLS" value={result.metrics.cls} />
          <MetricCard label="FCP" value={result.metrics.fcp} />
          <MetricCard label="TBT" value={result.metrics.tbt} />
          <MetricCard label="Speed Index" value={result.metrics.speedIndex} />
        </div>
      </Section>

      <Section kicker="Gemini" title="AI fix plan">
        <div
          className="rounded-3xl p-6 sm:p-7 ai-prose"
          style={{ backgroundColor: "#EDEDED" }}
          dangerouslySetInnerHTML={{ __html: result.aiSuggestions }}
        />
      </Section>

      {result.issues.length > 0 && (
        <Section kicker="Lighthouse" title="Top issues">
          <ul className="space-y-2">
            {result.issues.map((issue, i) => (
              <li
                key={i}
                className="flex gap-4 p-4 sm:p-5 rounded-2xl"
                style={{ backgroundColor: "#EDEDED" }}
              >
                <span className="text-[11.5px] font-medium text-blue-500 shrink-0 mt-0.5 tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <div className="font-medium text-[13px] text-gray-900">
                    {issue.title}
                  </div>
                  <div
                    className="ai-prose-mini mt-1.5"
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
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="text-[11.5px] font-medium text-blue-500 mb-1">
            {kicker}
          </div>
          <h2 className="text-[18px] font-medium text-gray-900 tracking-tight">
            {title}
          </h2>
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
      className="rounded-2xl p-4 sm:p-5 flex items-center gap-4"
      style={{ backgroundColor: "#EDEDED" }}
    >
      <div className="relative w-12 h-12 shrink-0">
        <svg className="w-12 h-12 -rotate-90" viewBox="0 0 56 56">
          <circle
            cx="28"
            cy="28"
            r={radius}
            stroke="#ffffff"
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
        <div className="text-[11.5px] text-gray-500 truncate">{label}</div>
        <div
          className="text-[20px] font-medium tabular-nums leading-tight mt-0.5"
          style={{ color }}
        >
          {score}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-2xl p-4 sm:p-5"
      style={{ backgroundColor: "#EDEDED" }}
    >
      <div className="text-[11.5px] text-gray-500 mb-2">{label}</div>
      <div className="text-[15px] font-medium text-gray-900 tabular-nums">
        {value}
      </div>
    </div>
  );
}
