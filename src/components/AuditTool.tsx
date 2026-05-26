"use client";

import { useState } from "react";
import { Loader2, Globe, Sparkles, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";

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
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Input card */}
      <div className="glass rounded-3xl p-6 md:p-8 border border-white/40 shadow-xl shadow-brand-500/5">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full pl-12 pr-4 py-4 rounded-xl bg-white border border-gray-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none text-base"
              onKeyDown={(e) => e.key === "Enter" && runAudit()}
            />
          </div>
          <button
            onClick={() => runAudit()}
            disabled={loading}
            className="px-6 py-4 rounded-xl bg-gradient-to-r from-brand-500 to-purple-600 text-white font-semibold hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-500/30"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Auditing…
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" /> Run Audit
              </>
            )}
          </button>
        </div>

        {/* Quick-test buttons */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <span className="text-xs text-gray-500 mr-1">Quick test:</span>
          {QUICK_SITES.map((s) => (
            <button
              key={s.url}
              onClick={() => {
                setUrl(s.url);
                runAudit(s.url);
              }}
              disabled={loading}
              className="text-xs px-3 py-1.5 rounded-full bg-white border border-gray-200 hover:border-brand-500 hover:text-brand-600 transition-colors disabled:opacity-50"
            >
              {s.label} <ArrowRight className="inline w-3 h-3" />
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="mt-8 text-center text-gray-500 text-sm">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3 text-brand-500" />
          Running Lighthouse audit + AI analysis. Takes 20–40 seconds.
        </div>
      )}

      {/* Results */}
      {result && <Results result={result} />}
    </div>
  );
}

function Results({ result }: { result: AuditResult }) {
  return (
    <div className="mt-8 space-y-6">
      {/* Scores */}
      <div className="glass rounded-2xl p-6 border border-white/40">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">Audit Scores</h2>
          <a
            href={result.finalUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-brand-600 hover:underline truncate max-w-xs"
          >
            {result.finalUrl}
          </a>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ScoreRing label="Performance" score={result.scores.performance} />
          <ScoreRing label="SEO" score={result.scores.seo} />
          <ScoreRing label="Accessibility" score={result.scores.accessibility} />
          <ScoreRing label="Best Practices" score={result.scores.bestPractices} />
        </div>
      </div>

      {/* Core Web Vitals */}
      <div className="glass rounded-2xl p-6 border border-white/40">
        <h2 className="font-semibold text-lg mb-4">Core Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Metric label="LCP" value={result.metrics.lcp} />
          <Metric label="CLS" value={result.metrics.cls} />
          <Metric label="FCP" value={result.metrics.fcp} />
          <Metric label="TBT" value={result.metrics.tbt} />
          <Metric label="Speed Index" value={result.metrics.speedIndex} />
        </div>
      </div>

      {/* AI Suggestions */}
      <div className="glass rounded-2xl p-6 border border-white/40 bg-gradient-to-br from-purple-50/40 to-brand-50/40">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-brand-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h2 className="font-semibold text-lg">AI Fix Suggestions</h2>
        </div>
        <div
          className="prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700 prose-code:text-purple-700 prose-code:bg-purple-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:hidden prose-code:after:hidden"
          dangerouslySetInnerHTML={{ __html: result.aiSuggestions }}
        />
      </div>

      {/* Top issues */}
      {result.issues.length > 0 && (
        <div className="glass rounded-2xl p-6 border border-white/40">
          <h2 className="font-semibold text-lg mb-4">Top Issues Found</h2>
          <ul className="space-y-3">
            {result.issues.map((issue, i) => (
              <li
                key={i}
                className="flex gap-3 p-3 rounded-xl bg-white/60 border border-gray-100"
              >
                <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-sm">{issue.title}</div>
                  <div
                    className="text-xs text-gray-600 mt-1"
                    dangerouslySetInnerHTML={{ __html: issue.description }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ScoreRing({ label, score }: { label: string; score: number }) {
  const color = score >= 90 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";
  const radius = 32;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={radius} stroke="#e5e7eb" strokeWidth="6" fill="none" />
          <circle
            cx="40"
            cy="40"
            r={radius}
            stroke={color}
            strokeWidth="6"
            fill="none"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="score-ring"
          />
        </svg>
        <div
          className="absolute inset-0 flex items-center justify-center font-bold text-lg"
          style={{ color }}
        >
          {score}
        </div>
      </div>
      <div className="text-xs text-gray-600 mt-2">{label}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-white/60 border border-gray-100">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-semibold text-lg mt-0.5">{value}</div>
    </div>
  );
}
