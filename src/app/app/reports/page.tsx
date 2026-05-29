"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/PageHeader";
import { readHistory, type StoredAudit } from "@/lib/auditContext";
import {
  FileBarChart2,
  Loader2,
  Download,
  RefreshCw,
  Activity,
  KeyRound,
  TrendingUp,
  Network,
  MapPin,
  Eye,
  Wand2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Printer,
  Star,
} from "lucide-react";

/* ─── Types ─── */
type AuditEntry = StoredAudit;

type KeywordList = {
  id: string;
  seed: string;
  savedAt: number;
  data: { total: number; keywords?: any[] };
};

type TrackedKw = {
  keyword: string;
  domain: string;
  history: { date: number; position: number; searchVolume: number | null; cpc: number | null; serpFeatures: string[] }[];
};

type CrawlEntry = {
  id: string;
  host: string;
  seoHealth?: number;
  pagesScanned?: number;
  totalIssues?: number;
  mode?: string;
  savedAt?: number;
};

type LocalSeoEntry = {
  url: string;
  napScore?: number;
  schemaScore?: number;
  localScore?: number;
  overallScore?: number;
};

type LlmEntry = {
  brand: string;
  overallScore?: number;
  providers?: { provider: string; score: number }[];
};

type OttoEntry = {
  url: string;
  fixCount?: number;
  fixes?: string[];
};

/* ─── localStorage keys ─── */
const LS = {
  audits: "seo-engine:audit-history",
  keywords: "seo-engine:keyword-lists",
  ranks: "seo-engine:tracked-keywords",
  crawls: "seo-engine:site-crawls",
  localSeo: "seo-engine:local-seo",
  llmVis: "seo-engine:llm-visibility",
  otto: "seo-engine:otto-fixes",
};

function safeJsonParse<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/* ─── Section toggle component ─── */
function SectionToggle({ label, icon: Icon, enabled, onChange }: { label: string; icon: any; enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-ink/5 cursor-pointer transition-colors select-none">
      <Icon className="w-4 h-4 text-clay shrink-0" />
      <span className="flex-1 text-[13px] font-sans font-medium text-ink">{label}</span>
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-clay rounded"
      />
    </label>
  );
}

/* ─── Score pill ─── */
function ScorePill({ score, label }: { score: number | null | undefined; label: string }) {
  if (score == null) return null;
  const s = Math.round(score);
  const color = s >= 90 ? "text-emerald-600 bg-emerald-50" : s >= 50 ? "text-amber-600 bg-amber-50" : "text-red-600 bg-red-50";
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-sans font-bold ${color}`}>
      <span>{s}</span>
      <span className="font-normal text-[10px] opacity-70">{label}</span>
    </div>
  );
}

/* ─── Main Page ─── */
export default function ReportsPage() {
  const { data: session } = useSession();
  const isSignedIn = !!session?.user;
  const reportRef = useRef<HTMLDivElement>(null);

  // Data state
  const [audits, setAudits] = useState<AuditEntry[]>([]);
  const [keywords, setKeywords] = useState<KeywordList[]>([]);
  const [ranks, setRanks] = useState<TrackedKw[]>([]);
  const [crawls, setCrawls] = useState<CrawlEntry[]>([]);
  const [localSeo, setLocalSeo] = useState<LocalSeoEntry[]>([]);
  const [llmVis, setLlmVis] = useState<LlmEntry[]>([]);
  const [otto, setOtto] = useState<OttoEntry[]>([]);

  // UI state
  const [sections, setSections] = useState({
    audits: true,
    keywords: true,
    ranks: true,
    crawls: true,
    localSeo: true,
    llmVis: true,
    otto: true,
  });
  const [clientName, setClientName] = useState("");
  const [summary, setSummary] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Load all data
  useEffect(() => {
    loadAllData();
  }, [isSignedIn]);

  async function loadAllData() {
    // Audits
    const localAudits = readHistory();
    if (isSignedIn) {
      try {
        const res = await fetch("/api/me/audits");
        if (res.ok) {
          const data = await res.json();
          setAudits(data.audits?.length ? data.audits : localAudits);
        } else setAudits(localAudits);
      } catch { setAudits(localAudits); }
    } else setAudits(localAudits);

    // Keywords
    const localKw = safeJsonParse<KeywordList[]>(LS.keywords, []);
    if (isSignedIn) {
      try {
        const res = await fetch("/api/me/keyword-lists");
        if (res.ok) {
          const data = await res.json();
          setKeywords(data.lists?.length ? data.lists : localKw);
        } else setKeywords(localKw);
      } catch { setKeywords(localKw); }
    } else setKeywords(localKw);

    // Rank Tracker
    const localRanks = safeJsonParse<TrackedKw[]>(LS.ranks, []);
    if (isSignedIn) {
      try {
        const res = await fetch("/api/me/rank-tracker");
        if (res.ok) {
          const data = await res.json();
          setRanks(data.keywords?.length ? data.keywords : localRanks);
        } else setRanks(localRanks);
      } catch { setRanks(localRanks); }
    } else setRanks(localRanks);

    // Crawls
    const localCrawls = safeJsonParse<CrawlEntry[]>(LS.crawls, []);
    if (isSignedIn) {
      try {
        const res = await fetch("/api/me/crawls");
        if (res.ok) {
          const data = await res.json();
          setCrawls(data.crawls?.length ? data.crawls : localCrawls);
        } else setCrawls(localCrawls);
      } catch { setCrawls(localCrawls); }
    } else setCrawls(localCrawls);

    // Local SEO
    const localLs = safeJsonParse<LocalSeoEntry[]>(LS.localSeo, []);
    if (isSignedIn) {
      try {
        const res = await fetch("/api/me/local-seo");
        if (res.ok) {
          const data = await res.json();
          setLocalSeo(data.audits?.length ? data.audits : localLs);
        } else setLocalSeo(localLs);
      } catch { setLocalSeo(localLs); }
    } else setLocalSeo(localLs);

    // LLM Visibility
    const localLlm = safeJsonParse<LlmEntry[]>(LS.llmVis, []);
    if (isSignedIn) {
      try {
        const res = await fetch("/api/me/llm-visibility");
        if (res.ok) {
          const data = await res.json();
          setLlmVis(data.queries?.length ? data.queries : localLlm);
        } else setLlmVis(localLlm);
      } catch { setLlmVis(localLlm); }
    } else setLlmVis(localLlm);

    // OTTO
    setOtto(safeJsonParse<OttoEntry[]>(LS.otto, []));
  }

  // Build metrics object for the AI summary
  function buildMetrics() {
    const m: any = {};
    if (sections.audits && audits.length > 0) {
      const latest = audits[0];
      m.siteAudit = {
        url: latest.url,
        scores: latest.scores,
        totalAuditsRun: audits.length,
      };
    }
    if (sections.keywords && keywords.length > 0) {
      m.keywords = {
        listsCount: keywords.length,
        totalIdeas: keywords.reduce((sum, k) => sum + (k.data?.total || 0), 0),
        topSeeds: keywords.slice(0, 5).map(k => k.seed),
      };
    }
    if (sections.ranks && ranks.length > 0) {
      const withPos = ranks.filter(r => {
        const last = r.history?.[r.history.length - 1];
        return last && last.position <= 100;
      });
      m.rankTracker = {
        trackedCount: ranks.length,
        rankedCount: withPos.length,
        topKeywords: ranks.slice(0, 5).map(r => ({
          keyword: r.keyword,
          domain: r.domain,
          position: r.history?.[r.history.length - 1]?.position,
        })),
      };
    }
    if (sections.crawls && crawls.length > 0) {
      const latest = crawls[0];
      m.siteCrawl = {
        host: latest.host,
        seoHealth: latest.seoHealth,
        pagesScanned: latest.pagesScanned,
        totalIssues: latest.totalIssues,
      };
    }
    if (sections.localSeo && localSeo.length > 0) {
      const latest = localSeo[0] as any;
      m.localSeo = {
        url: latest.url,
        overallScore: latest.overallScore || latest.overall_score,
        napScore: latest.napScore || latest.nap_score,
      };
    }
    if (sections.llmVis && llmVis.length > 0) {
      const latest = llmVis[0] as any;
      m.llmVisibility = {
        brand: latest.brand,
        overallScore: latest.overallScore || latest.overall_score,
      };
    }
    if (sections.otto && otto.length > 0) {
      m.otto = { fixesApplied: otto.length };
    }
    return m;
  }

  // Generate report
  async function generateReport() {
    setGenerating(true);
    setError(null);
    setSummary("");

    try {
      const metrics = buildMetrics();

      if (Object.keys(metrics).length === 0) {
        setError("No data available. Run some audits, track keywords, or crawl a site first — then come back to generate a report.");
        setGenerating(false);
        return;
      }

      const res = await fetch("/api/reports/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metrics }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate summary");
      }

      const data = await res.json();
      setSummary(data.summary);
      setGenerated(true);
    } catch (err: any) {
      setError(err.message || "Failed to generate report");
    } finally {
      setGenerating(false);
    }
  }

  // Export PDF
  function exportPdf() {
    window.print();
  }

  // Count available data
  const dataCount = [
    sections.audits && audits.length > 0,
    sections.keywords && keywords.length > 0,
    sections.ranks && ranks.length > 0,
    sections.crawls && crawls.length > 0,
    sections.localSeo && localSeo.length > 0,
    sections.llmVis && llmVis.length > 0,
    sections.otto && otto.length > 0,
  ].filter(Boolean).length;

  const toggleSection = (key: string) => setExpandedSection(expandedSection === key ? null : key);

  // Latest audit
  const latestAudit = audits[0];
  const avgPerf = audits.length > 0
    ? Math.round(audits.slice(0, 5).reduce((s, a) => s + (a.scores?.performance || 0), 0) / Math.min(audits.length, 5))
    : null;

  return (
    <div className="px-5 sm:px-10 py-6 max-w-6xl mx-auto min-h-screen">
      <PageHeader
        kicker="reports"
        title="SEO Reports"
        subtitle="Generate professional SEO reports by aggregating data from all your modules. Export as PDF."
      />

      {error && (
        <div className="mb-6 p-4 rounded-xl border border-sunset/20 bg-sunset/5 text-sunset text-[13px] font-sans flex items-center gap-2">
          <XCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mt-6">
        {/* Left Column: Config */}
        <div className="lg:col-span-4 flex flex-col gap-6" data-print-hide>
          <div className="dotted-card p-5 relative flex flex-col gap-3">
            <span className="font-hand text-clay text-[18px] absolute -top-3 left-5 bg-paper-50 px-2">
              ~ report builder ~
            </span>

            <div className="mt-2">
              <label className="block text-[11px] font-sans font-semibold text-ink-soft uppercase tracking-wide mb-1">
                Client / Brand Name (optional)
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Acme Corp"
                className="w-full bg-paper-50 border-2 border-ink/10 rounded-lg py-2 px-3 text-[13px] font-sans text-ink focus:border-ink/60 focus:outline-none transition-all"
              />
            </div>

            <div className="border-t border-ink/5 pt-3">
              <p className="text-[11px] font-sans font-semibold text-ink-soft uppercase tracking-wide mb-2">Include Sections</p>
              <SectionToggle label={`Site Audits (${audits.length})`} icon={Activity} enabled={sections.audits} onChange={v => setSections(s => ({ ...s, audits: v }))} />
              <SectionToggle label={`Keywords (${keywords.length} lists)`} icon={KeyRound} enabled={sections.keywords} onChange={v => setSections(s => ({ ...s, keywords: v }))} />
              <SectionToggle label={`Rank Tracker (${ranks.length})`} icon={TrendingUp} enabled={sections.ranks} onChange={v => setSections(s => ({ ...s, ranks: v }))} />
              <SectionToggle label={`Site Crawls (${crawls.length})`} icon={Network} enabled={sections.crawls} onChange={v => setSections(s => ({ ...s, crawls: v }))} />
              <SectionToggle label={`Local SEO (${localSeo.length})`} icon={MapPin} enabled={sections.localSeo} onChange={v => setSections(s => ({ ...s, localSeo: v }))} />
              <SectionToggle label={`LLM Visibility (${llmVis.length})`} icon={Eye} enabled={sections.llmVis} onChange={v => setSections(s => ({ ...s, llmVis: v }))} />
              <SectionToggle label={`OTTO Fixes (${otto.length})`} icon={Wand2} enabled={sections.otto} onChange={v => setSections(s => ({ ...s, otto: v }))} />
            </div>

            <button
              onClick={generateReport}
              disabled={generating || dataCount === 0}
              className="mt-3 w-full bg-ink hover:bg-ink-soft text-paper-50 font-sans font-semibold text-[13px] py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {generating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
              ) : (
                <><FileBarChart2 className="w-4 h-4" /> Generate Report</>
              )}
            </button>

            {generated && (
              <div className="flex gap-2">
                <button
                  onClick={exportPdf}
                  className="flex-1 border-2 border-ink/15 text-ink font-sans font-semibold text-[12px] py-2 rounded-lg hover:bg-ink/5 transition-all flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> Export PDF
                </button>
                <button
                  onClick={generateReport}
                  className="flex-1 border-2 border-ink/15 text-ink font-sans font-semibold text-[12px] py-2 rounded-lg hover:bg-ink/5 transition-all flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                </button>
              </div>
            )}
          </div>

          <div className="sticky-note p-5 border border-ink/15" data-print-hide>
            <h4 className="font-hand text-[18px] text-ink mb-1.5">About Reports</h4>
            <p className="font-sans text-[12px] text-ink-soft leading-relaxed">
              This module pulls data from every tool you&apos;ve used — audits, keywords, rank tracking, crawls, local SEO, LLM visibility, and OTTO fixes — into one professional SEO report with an AI-written executive summary.
            </p>
          </div>
        </div>

        {/* Right Column: Report Preview */}
        <div className="lg:col-span-8">
          {!generated ? (
            <div className="dotted-card p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
              <FileBarChart2 className="w-16 h-16 text-clay/25 mb-4" strokeWidth={1} />
              <h3 className="font-hand text-[24px] text-ink mb-2">No Report Generated Yet</h3>
              <p className="font-sans text-[13px] text-ink-soft max-w-md leading-relaxed">
                Select which sections to include, optionally enter a client name, then click <strong>Generate Report</strong>. The AI will write an executive summary and compile all your data into a professional report.
              </p>
              {dataCount === 0 && (
                <p className="font-sans text-[12px] text-sunset mt-4 bg-sunset/5 border border-sunset/15 px-4 py-2 rounded-lg">
                  No data found. Run audits, track keywords, or crawl a site first.
                </p>
              )}
            </div>
          ) : (
            <div ref={reportRef} className="bg-white rounded-2xl border border-ink/10 shadow-sm overflow-hidden print:shadow-none print:border-none print:rounded-none">
              {/* Report Header */}
              <div className="bg-gradient-to-br from-[#00403f] to-[#006a6a] text-white px-8 py-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                    <FileBarChart2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-sans font-semibold uppercase tracking-widest text-white/60">GoToSEO Report</p>
                    <h2 className="text-[20px] font-sans font-bold leading-tight">
                      {clientName ? `${clientName} — SEO Report` : "SEO Performance Report"}
                    </h2>
                  </div>
                </div>
                <p className="text-[12px] text-white/70 font-sans">
                  Generated on {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>

              <div className="px-8 py-6 space-y-6">
                {/* Executive Summary */}
                {summary && (
                  <div className="border-l-4 border-clay pl-5 py-1">
                    <h3 className="text-[14px] font-sans font-bold text-ink mb-2 uppercase tracking-wide">Executive Summary</h3>
                    <div className="text-[13px] font-sans text-ink-soft leading-relaxed whitespace-pre-line">{summary}</div>
                  </div>
                )}

                {/* Overview Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {audits.length > 0 && sections.audits && (
                    <div className="bg-paper-50 rounded-xl p-4 text-center border border-ink/5">
                      <p className="text-[10px] font-sans font-bold text-ink-soft uppercase tracking-wider">Avg Performance</p>
                      <p className="text-[28px] font-hand font-bold text-ink mt-1">{avgPerf ?? "—"}</p>
                    </div>
                  )}
                  {keywords.length > 0 && sections.keywords && (
                    <div className="bg-paper-50 rounded-xl p-4 text-center border border-ink/5">
                      <p className="text-[10px] font-sans font-bold text-ink-soft uppercase tracking-wider">Keyword Ideas</p>
                      <p className="text-[28px] font-hand font-bold text-ink mt-1">{keywords.reduce((s, k) => s + (k.data?.total || 0), 0).toLocaleString()}</p>
                    </div>
                  )}
                  {ranks.length > 0 && sections.ranks && (
                    <div className="bg-paper-50 rounded-xl p-4 text-center border border-ink/5">
                      <p className="text-[10px] font-sans font-bold text-ink-soft uppercase tracking-wider">Tracked Keywords</p>
                      <p className="text-[28px] font-hand font-bold text-ink mt-1">{ranks.length}</p>
                    </div>
                  )}
                  {crawls.length > 0 && sections.crawls && (
                    <div className="bg-paper-50 rounded-xl p-4 text-center border border-ink/5">
                      <p className="text-[10px] font-sans font-bold text-ink-soft uppercase tracking-wider">Sites Crawled</p>
                      <p className="text-[28px] font-hand font-bold text-ink mt-1">{crawls.length}</p>
                    </div>
                  )}
                </div>

                {/* Site Audit Section */}
                {sections.audits && audits.length > 0 && (
                  <div className="border border-ink/10 rounded-xl overflow-hidden">
                    <button onClick={() => toggleSection("audits")} className="w-full flex items-center justify-between px-5 py-4 bg-paper-50 hover:bg-ink/5 transition-colors">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-clay" />
                        <span className="text-[14px] font-sans font-bold text-ink">Site Audit Results</span>
                        <span className="text-[11px] font-sans text-ink-soft">({audits.length} audits)</span>
                      </div>
                      {expandedSection === "audits" ? <ChevronUp className="w-4 h-4 text-ink-soft" /> : <ChevronDown className="w-4 h-4 text-ink-soft" />}
                    </button>
                    {(expandedSection === "audits" || true) && (
                      <div className="px-5 py-4 space-y-3">
                        {latestAudit && (
                          <div>
                            <p className="text-[11px] font-sans text-ink-soft mb-2">Latest audit: <strong className="text-ink">{latestAudit.url}</strong></p>
                            <div className="flex flex-wrap gap-2">
                              <ScorePill score={latestAudit.scores?.performance} label="Perf" />
                              <ScorePill score={latestAudit.scores?.seo} label="SEO" />
                              <ScorePill score={latestAudit.scores?.accessibility} label="A11y" />
                              <ScorePill score={latestAudit.scores?.bestPractices} label="BP" />
                            </div>
                          </div>
                        )}
                        {audits.length > 1 && (
                          <div className="border-t border-ink/5 pt-3">
                            <p className="text-[11px] font-sans font-semibold text-ink-soft mb-2">Recent audit history</p>
                            <div className="space-y-1.5">
                              {audits.slice(0, 5).map((a, i) => (
                                <div key={i} className="flex items-center justify-between text-[12px] font-sans">
                                  <span className="text-ink-soft truncate max-w-[200px]">{a.url}</span>
                                  <div className="flex gap-1.5">
                                    <ScorePill score={a.scores?.performance} label="P" />
                                    <ScorePill score={a.scores?.seo} label="S" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Keywords Section */}
                {sections.keywords && keywords.length > 0 && (
                  <div className="border border-ink/10 rounded-xl overflow-hidden">
                    <button onClick={() => toggleSection("keywords")} className="w-full flex items-center justify-between px-5 py-4 bg-paper-50 hover:bg-ink/5 transition-colors">
                      <div className="flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-clay" />
                        <span className="text-[14px] font-sans font-bold text-ink">Keyword Research</span>
                        <span className="text-[11px] font-sans text-ink-soft">({keywords.length} lists)</span>
                      </div>
                      {expandedSection === "keywords" ? <ChevronUp className="w-4 h-4 text-ink-soft" /> : <ChevronDown className="w-4 h-4 text-ink-soft" />}
                    </button>
                    <div className="px-5 py-4 space-y-2">
                      {keywords.slice(0, 5).map((kl, i) => (
                        <div key={i} className="flex items-center justify-between text-[12px] font-sans py-1 border-b border-ink/5 last:border-0">
                          <span className="text-ink font-medium">&ldquo;{kl.seed}&rdquo;</span>
                          <span className="text-ink-soft">{kl.data?.total || 0} ideas</span>
                        </div>
                      ))}
                      <p className="text-[11px] text-ink-soft font-sans pt-1">
                        Total: <strong className="text-ink">{keywords.reduce((s, k) => s + (k.data?.total || 0), 0).toLocaleString()}</strong> keyword ideas across {keywords.length} lists
                      </p>
                    </div>
                  </div>
                )}

                {/* Rank Tracker Section */}
                {sections.ranks && ranks.length > 0 && (
                  <div className="border border-ink/10 rounded-xl overflow-hidden">
                    <button onClick={() => toggleSection("ranks")} className="w-full flex items-center justify-between px-5 py-4 bg-paper-50 hover:bg-ink/5 transition-colors">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-clay" />
                        <span className="text-[14px] font-sans font-bold text-ink">Rank Tracker</span>
                        <span className="text-[11px] font-sans text-ink-soft">({ranks.length} keywords)</span>
                      </div>
                      {expandedSection === "ranks" ? <ChevronUp className="w-4 h-4 text-ink-soft" /> : <ChevronDown className="w-4 h-4 text-ink-soft" />}
                    </button>
                    <div className="px-5 py-4">
                      <div className="space-y-1.5">
                        {ranks.slice(0, 10).map((r, i) => {
                          const latest = r.history?.[r.history.length - 1];
                          const pos = latest?.position ?? 101;
                          return (
                            <div key={i} className="flex items-center justify-between text-[12px] font-sans py-1 border-b border-ink/5 last:border-0">
                              <div>
                                <span className="text-ink font-medium">{r.keyword}</span>
                                <span className="text-ink-soft ml-2 text-[10px]">on {r.domain}</span>
                              </div>
                              <span className={`font-bold ${pos <= 3 ? "text-emerald-600" : pos <= 10 ? "text-amber-600" : pos <= 100 ? "text-ink" : "text-red-500"}`}>
                                {pos <= 100 ? `#${pos}` : "Unranked"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Site Crawl Section */}
                {sections.crawls && crawls.length > 0 && (
                  <div className="border border-ink/10 rounded-xl overflow-hidden">
                    <button onClick={() => toggleSection("crawls")} className="w-full flex items-center justify-between px-5 py-4 bg-paper-50 hover:bg-ink/5 transition-colors">
                      <div className="flex items-center gap-2">
                        <Network className="w-4 h-4 text-clay" />
                        <span className="text-[14px] font-sans font-bold text-ink">Site Crawl Results</span>
                        <span className="text-[11px] font-sans text-ink-soft">({crawls.length} crawls)</span>
                      </div>
                      {expandedSection === "crawls" ? <ChevronUp className="w-4 h-4 text-ink-soft" /> : <ChevronDown className="w-4 h-4 text-ink-soft" />}
                    </button>
                    <div className="px-5 py-4 space-y-2">
                      {crawls.slice(0, 3).map((c, i) => (
                        <div key={i} className="flex items-center justify-between text-[12px] font-sans py-1.5 border-b border-ink/5 last:border-0">
                          <div>
                            <span className="text-ink font-medium">{c.host}</span>
                            <span className="text-ink-soft ml-2 text-[10px]">{c.pagesScanned || "?"} pages · {c.mode || "fast"}</span>
                          </div>
                          {c.seoHealth != null && <ScorePill score={c.seoHealth} label="Health" />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Local SEO Section */}
                {sections.localSeo && localSeo.length > 0 && (
                  <div className="border border-ink/10 rounded-xl overflow-hidden">
                    <button onClick={() => toggleSection("localSeo")} className="w-full flex items-center justify-between px-5 py-4 bg-paper-50 hover:bg-ink/5 transition-colors">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-clay" />
                        <span className="text-[14px] font-sans font-bold text-ink">Local SEO</span>
                        <span className="text-[11px] font-sans text-ink-soft">({localSeo.length} audits)</span>
                      </div>
                      {expandedSection === "localSeo" ? <ChevronUp className="w-4 h-4 text-ink-soft" /> : <ChevronDown className="w-4 h-4 text-ink-soft" />}
                    </button>
                    <div className="px-5 py-4 space-y-2">
                      {localSeo.slice(0, 3).map((ls: any, i) => (
                        <div key={i} className="flex items-center justify-between text-[12px] font-sans py-1.5 border-b border-ink/5 last:border-0">
                          <span className="text-ink font-medium truncate max-w-[200px]">{ls.url}</span>
                          <div className="flex gap-1.5">
                            <ScorePill score={ls.overallScore || ls.overall_score} label="Overall" />
                            <ScorePill score={ls.napScore || ls.nap_score} label="NAP" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* LLM Visibility Section */}
                {sections.llmVis && llmVis.length > 0 && (
                  <div className="border border-ink/10 rounded-xl overflow-hidden">
                    <button onClick={() => toggleSection("llmVis")} className="w-full flex items-center justify-between px-5 py-4 bg-paper-50 hover:bg-ink/5 transition-colors">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-clay" />
                        <span className="text-[14px] font-sans font-bold text-ink">LLM Visibility</span>
                        <span className="text-[11px] font-sans text-ink-soft">({llmVis.length} queries)</span>
                      </div>
                      {expandedSection === "llmVis" ? <ChevronUp className="w-4 h-4 text-ink-soft" /> : <ChevronDown className="w-4 h-4 text-ink-soft" />}
                    </button>
                    <div className="px-5 py-4 space-y-2">
                      {llmVis.slice(0, 3).map((lv: any, i) => (
                        <div key={i} className="flex items-center justify-between text-[12px] font-sans py-1.5 border-b border-ink/5 last:border-0">
                          <span className="text-ink font-medium">{lv.brand}</span>
                          <ScorePill score={lv.overallScore || lv.overall_score} label="Score" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* OTTO Section */}
                {sections.otto && otto.length > 0 && (
                  <div className="border border-ink/10 rounded-xl overflow-hidden">
                    <button onClick={() => toggleSection("otto")} className="w-full flex items-center justify-between px-5 py-4 bg-paper-50 hover:bg-ink/5 transition-colors">
                      <div className="flex items-center gap-2">
                        <Wand2 className="w-4 h-4 text-clay" />
                        <span className="text-[14px] font-sans font-bold text-ink">OTTO SEO Fixes</span>
                        <span className="text-[11px] font-sans text-ink-soft">({otto.length} applied)</span>
                      </div>
                      {expandedSection === "otto" ? <ChevronUp className="w-4 h-4 text-ink-soft" /> : <ChevronDown className="w-4 h-4 text-ink-soft" />}
                    </button>
                    <div className="px-5 py-4">
                      <p className="text-[12px] font-sans text-ink-soft">
                        <strong className="text-ink">{otto.length}</strong> OTTO fix scripts have been generated and applied across your sites.
                      </p>
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="border-t border-ink/10 pt-4 mt-6 flex items-center justify-between">
                  <p className="text-[10px] font-sans text-ink-soft">
                    Generated by GoToSEO · github.com/AyushCodes160/SEO_Engine
                  </p>
                  <div className="flex items-center gap-1 text-[10px] font-sans text-ink-soft">
                    <Star className="w-3 h-3 text-gold" fill="currentColor" />
                    Free & open-source
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
