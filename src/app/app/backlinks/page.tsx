"use client";

import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import {
  Link2,
  Loader2,
  RefreshCw,
  Shield,
  ShieldAlert,
  ExternalLink,
  ArrowRight,
  Lightbulb,
  GitCompare,
  TrendingUp,
} from "lucide-react";

type BacklinkEntry = {
  source: string;
  anchor: string;
  domainRating: number;
  type: string;
  page?: string;
};

type AnchorEntry = { anchor: string; percent: number };
type LinkType = { type: string; percent: number };
type GapOpp = { source: string; reason: string; difficulty: string };

type BacklinkResult = {
  domain: string;
  metrics: {
    domainAuthority: number;
    totalBacklinks: number;
    referringDomains: number;
    doFollowPercent: number;
    noFollowPercent: number;
    avgDomainRating: number;
  };
  topBacklinks: BacklinkEntry[];
  anchorDistribution: AnchorEntry[];
  linkTypes: LinkType[];
  gap_analysis?: {
    competitor: string;
    competitorDA: number;
    opportunities: GapOpp[];
    summary: string;
  };
  recommendations: string[];
  toxicRisk: string;
};

function MetricCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-paper-50 rounded-xl p-4 text-center border border-ink/5 relative">
      <span className="absolute top-2 right-2 text-[8px] font-sans font-bold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-full">AI EST.</span>
      <p className="text-[10px] font-sans font-bold text-ink-soft uppercase tracking-wider">{label}</p>
      <p className="text-[28px] font-hand font-bold text-ink mt-1">{typeof value === "number" ? value.toLocaleString() : value}</p>
      {sub && <p className="text-[10px] font-sans text-ink-soft">{sub}</p>}
    </div>
  );
}

function BarSegment({ percent, color, label }: { percent: number; color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-[12px] font-sans">
      <div className="flex-1 h-5 bg-ink/5 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
      <span className="text-ink-soft w-8 text-right text-[11px]">{percent}%</span>
      <span className="text-ink w-28 truncate text-[11px]">{label}</span>
    </div>
  );
}

export default function BacklinksPage() {
  const [domain, setDomain] = useState("");
  const [competitor, setCompetitor] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BacklinkResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function analyze(e: React.FormEvent) {
    e.preventDefault();
    if (!domain.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/backlinks/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domain.trim(), competitor: competitor.trim() || undefined }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to analyze backlinks");
      }

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to analyze backlinks");
    } finally {
      setLoading(false);
    }
  }

  const toxicColor = result?.toxicRisk === "high" ? "text-red-600 bg-red-50" : result?.toxicRisk === "medium" ? "text-amber-600 bg-amber-50" : "text-emerald-600 bg-emerald-50";
  const barColors = ["bg-clay", "bg-emerald-500", "bg-amber-500", "bg-blue-500", "bg-purple-500", "bg-pink-500", "bg-orange-500"];

  return (
    <div className="px-5 sm:px-10 py-6 max-w-6xl mx-auto min-h-screen">
      <PageHeader
        kicker="backlinks"
        title="Backlink Analyzer"
        subtitle="AI-estimated backlink profile, anchor text patterns, and competitor gap strategy. Not live-crawled data."
      />

      {error && (
        <div className="mb-6 p-4 rounded-xl border border-sunset/20 bg-sunset/5 text-sunset text-[13px] font-sans flex items-center gap-2">
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mt-6">
        {/* Left Column: Form */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <form onSubmit={analyze} className="dotted-card p-5 relative flex flex-col gap-4">
            <span className="font-hand text-clay text-[18px] absolute -top-3 left-5 bg-paper-50 px-2">
              ~ backlink audit ~
            </span>

            <div className="mt-2">
              <label className="block text-[11px] font-sans font-semibold text-ink-soft uppercase tracking-wide mb-1">
                Target Domain
              </label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="e.g. wikipedia.org"
                className="w-full bg-paper-50 border-2 border-ink/10 rounded-lg py-2 px-3 text-[13px] font-sans text-ink focus:border-ink/60 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-sans font-semibold text-ink-soft uppercase tracking-wide mb-1">
                Competitor Domain (optional)
              </label>
              <input
                type="text"
                value={competitor}
                onChange={(e) => setCompetitor(e.target.value)}
                placeholder="e.g. britannica.com"
                className="w-full bg-paper-50 border-2 border-ink/10 rounded-lg py-2 px-3 text-[13px] font-sans text-ink focus:border-ink/60 focus:outline-none transition-all"
              />
              <p className="text-[10px] font-sans text-ink-soft mt-1">Add a competitor to get a link gap analysis</p>
            </div>

            <button
              type="submit"
              disabled={loading || !domain.trim()}
              className="w-full bg-ink hover:bg-ink-soft text-paper-50 font-sans font-semibold text-[13px] py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</>
              ) : (
                <><Link2 className="w-4 h-4" /> Analyze Backlinks</>
              )}
            </button>
          </form>

          <div className="sticky-note p-5 border border-ink/15">
            <h4 className="font-hand text-[18px] text-ink mb-1.5">⚡ AI Estimation Mode</h4>
            <p className="font-sans text-[12px] text-ink-soft leading-relaxed">
              This module uses Groq (Llama 3.3) to <strong>estimate</strong> a domain&apos;s backlink profile based on the LLM&apos;s training data knowledge. The structural patterns (dofollow ratios, anchor distribution, link types) are realistic, but the hard numbers are AI-generated approximations &mdash; not live-crawled data.
            </p>
            <p className="font-sans text-[11px] text-ink-soft leading-relaxed mt-2 opacity-70">
              For exact numbers, connect a paid API like DataForSEO ($50/mo) or Ahrefs ($129/mo).
            </p>
          </div>
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-8">
          {!result ? (
            <div className="dotted-card p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
              <Link2 className="w-16 h-16 text-clay/25 mb-4" strokeWidth={1} />
              <h3 className="font-hand text-[24px] text-ink mb-2">No Backlink Analysis Yet</h3>
              <p className="font-sans text-[13px] text-ink-soft max-w-md leading-relaxed">
                Enter a domain to analyze its backlink profile. Optionally add a competitor to discover link gap opportunities you can exploit.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* AI Estimate Banner */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
                <span className="text-amber-600 text-[16px] shrink-0">⚠️</span>
                <p className="text-[12px] font-sans text-amber-800 leading-relaxed">
                  <strong>AI-Estimated Data.</strong> These metrics are generated by Llama 3.3 based on training data patterns, not live-crawled from the web. Structural patterns (ratios, distributions, link types) are realistic; absolute numbers are approximations. Use for strategic planning, not as ground truth.
                </p>
              </div>
              {/* Metrics Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <MetricCard label="Domain Authority" value={result.metrics.domainAuthority} sub="/100" />
                <MetricCard label="Total Backlinks" value={result.metrics.totalBacklinks} />
                <MetricCard label="Referring Domains" value={result.metrics.referringDomains} />
                <MetricCard label="DoFollow" value={`${result.metrics.doFollowPercent}%`} />
                <MetricCard label="NoFollow" value={`${result.metrics.noFollowPercent}%`} />
                <div className={`rounded-xl p-4 text-center border border-ink/5 ${toxicColor}`}>
                  <p className="text-[10px] font-sans font-bold uppercase tracking-wider opacity-70">Toxic Risk</p>
                  <div className="flex items-center justify-center gap-1.5 mt-2">
                    {result.toxicRisk === "low" ? <Shield className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                    <span className="text-[18px] font-hand font-bold capitalize">{result.toxicRisk}</span>
                  </div>
                </div>
              </div>

              {/* Top Backlinks */}
              <div className="bg-white rounded-xl border border-ink/10 overflow-hidden">
                <div className="px-5 py-4 bg-paper-50 border-b border-ink/5 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-clay" />
                  <span className="text-[14px] font-sans font-bold text-ink">Top Backlinks</span>
                  <span className="text-[11px] font-sans text-ink-soft">({result.topBacklinks.length})</span>
                </div>
                <div className="divide-y divide-ink/5">
                  {result.topBacklinks.map((bl, i) => (
                    <div key={i} className="px-5 py-3 flex items-center justify-between hover:bg-ink/[0.02] transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-sans font-medium text-ink truncate">{bl.source}</p>
                        <p className="text-[11px] font-sans text-ink-soft truncate">Anchor: &ldquo;{bl.anchor}&rdquo;{bl.page ? ` · ${bl.page}` : ""}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-3">
                        <span className={`text-[10px] font-sans font-bold px-2 py-0.5 rounded-full ${bl.type === "dofollow" ? "bg-emerald-50 text-emerald-600" : "bg-ink/5 text-ink-soft"}`}>
                          {bl.type}
                        </span>
                        <span className="text-[12px] font-sans font-bold text-ink w-8 text-right">
                          {bl.domainRating}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Anchor Distribution + Link Types side by side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-ink/10 p-5">
                  <p className="text-[13px] font-sans font-bold text-ink mb-3">Anchor Text Distribution</p>
                  <div className="space-y-2">
                    {result.anchorDistribution.map((a, i) => (
                      <BarSegment key={i} percent={a.percent} color={barColors[i % barColors.length]} label={a.anchor} />
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-ink/10 p-5">
                  <p className="text-[13px] font-sans font-bold text-ink mb-3">Link Types</p>
                  <div className="space-y-2">
                    {result.linkTypes.map((lt, i) => (
                      <BarSegment key={i} percent={lt.percent} color={barColors[i % barColors.length]} label={lt.type} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Gap Analysis */}
              {result.gap_analysis && (
                <div className="bg-white rounded-xl border border-ink/10 overflow-hidden">
                  <div className="px-5 py-4 bg-paper-50 border-b border-ink/5 flex items-center gap-2">
                    <GitCompare className="w-4 h-4 text-clay" />
                    <span className="text-[14px] font-sans font-bold text-ink">Link Gap Analysis</span>
                    <span className="text-[11px] font-sans text-ink-soft">vs {result.gap_analysis.competitor}</span>
                  </div>
                  <div className="px-5 py-4">
                    {/* DA Comparison */}
                    <div className="flex items-center gap-4 mb-4 pb-4 border-b border-ink/5">
                      <div className="text-center">
                        <p className="text-[10px] font-sans text-ink-soft font-bold uppercase">{domain}</p>
                        <p className="text-[24px] font-hand font-bold text-ink">{result.metrics.domainAuthority}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-ink-soft" />
                      <div className="text-center">
                        <p className="text-[10px] font-sans text-ink-soft font-bold uppercase">{result.gap_analysis.competitor}</p>
                        <p className="text-[24px] font-hand font-bold text-clay">{result.gap_analysis.competitorDA}</p>
                      </div>
                    </div>

                    <p className="text-[12px] font-sans text-ink-soft mb-3">{result.gap_analysis.summary}</p>

                    {/* Opportunities */}
                    <p className="text-[11px] font-sans font-bold text-ink uppercase tracking-wide mb-2">Outreach Opportunities</p>
                    <div className="space-y-2">
                      {result.gap_analysis.opportunities.map((opp, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-paper-50 border border-ink/5">
                          <TrendingUp className="w-4 h-4 text-clay shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[12px] font-sans font-bold text-ink">{opp.source}</span>
                              <span className={`text-[9px] font-sans font-bold px-1.5 py-0.5 rounded-full ${
                                opp.difficulty === "easy" ? "bg-emerald-50 text-emerald-600" :
                                opp.difficulty === "hard" ? "bg-red-50 text-red-600" :
                                "bg-amber-50 text-amber-600"
                              }`}>{opp.difficulty}</span>
                            </div>
                            <p className="text-[11px] font-sans text-ink-soft">{opp.reason}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {result.recommendations && result.recommendations.length > 0 && (
                <div className="dotted-card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-4 h-4 text-gold" />
                    <span className="font-hand text-[16px] text-ink">Recommendations</span>
                  </div>
                  <ul className="space-y-1.5">
                    {result.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 text-[12px] font-sans text-ink-soft">
                        <span className="text-clay mt-0.5">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Regenerate */}
              <button
                onClick={analyze as any}
                className="w-full border-2 border-ink/15 text-ink font-sans font-semibold text-[12px] py-2.5 rounded-lg hover:bg-ink/5 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Re-analyze
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
