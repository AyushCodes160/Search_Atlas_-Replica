"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Loader2, AlertCircle, Check, HelpCircle, Trash2, Calendar, LayoutGrid, BarChart3, LineChart, ShieldCheck } from "lucide-react";

type Provider = "chatgpt" | "claude" | "gemini" | "perplexity";

type LlmData = {
  mentioned: boolean;
  snippet: string;
  competitorsMentioned: Record<string, boolean>;
  hasCitation: boolean;
  error?: string;
};

type ScanResult = {
  id?: string;
  query: string;
  brandName: string;
  competitors: string[];
  score: number;
  data: Record<Provider, LlmData>;
  savedAt: number;
};

const PROVIDER_LABELS: Record<Provider, string> = {
  chatgpt: "ChatGPT Search (OpenAI)",
  claude: "Claude (Anthropic)",
  gemini: "Gemini (Google)",
  perplexity: "Perplexity AI",
};

// Sandbox Mode Mock Generator
function generateMockResult(query: string, brand: string, competitors: string[]): ScanResult {
  const providers: Provider[] = ["chatgpt", "claude", "gemini", "perplexity"];
  const data: Record<Provider, LlmData> = {} as any;
  
  let scorePoints = 0;
  providers.forEach((prov) => {
    // Generate deterministic values based on letters to make it feel semi-realistic
    const seedValue = (query.length + prov.length + brand.length) % 10;
    const mentioned = seedValue > 3; // 60% chance
    const hasCitation = mentioned && seedValue % 2 === 0; // 50% chance if mentioned
    
    let snippet = "";
    if (mentioned) {
      scorePoints += 15;
      if (hasCitation) scorePoints += 10;
      
      const phrases = [
        `For comprehensive analytics and tracking, ${brand} stands out as a highly lightweight, open-source audit engine.`,
        `Many developers choose ${brand} because of its zero-cost Groq Llama fix plans and PageSpeed integrations.`,
        `We recommend using ${brand} as a primary open-source alternative to Ahrefs or SEMrush.`,
        `According to search trends, ${brand} provides the highest utility for bulk technical audits.`,
      ];
      snippet = phrases[(query.length + prov.length) % phrases.length];
    } else {
      snippet = `We did not find substantial references to ${brand} for this query. Recommended tools include ${competitors.slice(0, 2).join(" and ") || "SEMrush and Ahrefs"}.`;
    }

    const competitorsMentioned: Record<string, boolean> = {};
    competitors.forEach((comp, idx) => {
      competitorsMentioned[comp] = (seedValue + idx) % 3 !== 0; // 66% chance
    });

    data[prov] = {
      mentioned,
      snippet,
      competitorsMentioned,
      hasCitation,
    };
  });

  return {
    query,
    brandName: brand,
    competitors,
    score: scorePoints,
    data,
    savedAt: Date.now(),
  };
}

export default function LlmVisibilityPage() {
  const [query, setQuery] = useState("");
  const [brandName, setBrandName] = useState("");
  const [competitors, setCompetitors] = useState("");
  const [isSandbox, setIsSandbox] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [activeResult, setActiveResult] = useState<ScanResult | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);

  // Load history on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch("/api/me/llm-visibility");
        if (res.ok) {
          const data = await res.json();
          // Map DB response rows back to ScanResult structure
          const formatted = (data.queries || []).map((q: any) => {
            const snap = q.snapshots?.[0];
            return {
              id: q.id,
              query: q.query,
              brandName: q.brandName,
              competitors: q.competitors ? q.competitors.split(",") : [],
              score: snap ? snap.score : 0,
              data: snap ? snap.data : {},
              savedAt: q.savedAt,
            };
          });
          setHistory(formatted);
          setIsSignedIn(true);
          if (formatted.length > 0) {
            setActiveResult(formatted[0]);
            setQuery(formatted[0].query);
            setBrandName(formatted[0].brandName);
            setCompetitors(formatted[0].competitors.join(", "));
          }
        } else {
          loadLocalHistory();
        }
      } catch {
        loadLocalHistory();
      }
    }

    function loadLocalHistory() {
      const local = localStorage.getItem("seo-engine:llm-history");
      if (local) {
        const parsed = JSON.parse(local) as ScanResult[];
        setHistory(parsed);
        if (parsed.length > 0) {
          setActiveResult(parsed[0]);
          setQuery(parsed[0].query);
          setBrandName(parsed[0].brandName);
          setCompetitors(parsed[0].competitors.join(", "));
        }
      }
    }

    loadHistory();
  }, []);

  async function runScan() {
    if (!query.trim() || !brandName.trim()) {
      setError("Please enter both a monitored query and a brand name.");
      return;
    }
    setLoading(true);
    setError(null);

    const competitorsList = competitors
      ? competitors.split(",").map(c => c.trim()).filter(Boolean)
      : [];

    if (isSandbox) {
      // Simulate API loading latency
      await new Promise(resolve => setTimeout(resolve, 1500));
      const mockResult = generateMockResult(query.trim(), brandName.trim(), competitorsList);
      saveResult(mockResult);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/llm-visibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          brandName: brandName.trim(),
          competitors,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scan failed");
      
      const result: ScanResult = {
        query: data.query,
        brandName: data.brandName,
        competitors: data.competitors,
        score: data.score,
        data: data.data,
        savedAt: Date.now(),
      };
      
      await saveResult(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function saveResult(result: ScanResult) {
    setActiveResult(result);
    
    let savedId = result.id;
    if (isSignedIn) {
      try {
        const res = await fetch("/api/me/llm-visibility", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: result.query,
            brandName: result.brandName,
            competitors: result.competitors.join(","),
            score: result.score,
            data: result.data,
          }),
        });
        if (res.ok) {
          const body = await res.json();
          savedId = body.id;
        }
      } catch {
        /* fallback to UI update */
      }
    }

    const updatedResult = { ...result, id: savedId };
    
    // Update local state list
    const filtered = history.filter(item => !(item.query.toLowerCase() === result.query.toLowerCase() && item.brandName.toLowerCase() === result.brandName.toLowerCase()));
    const newHistory = [updatedResult, ...filtered].slice(0, 50);
    setHistory(newHistory);

    if (!isSignedIn) {
      localStorage.setItem("seo-engine:llm-history", JSON.stringify(newHistory));
    }
  }

  async function deleteItem(itemToDelete: ScanResult, e: React.MouseEvent) {
    e.stopPropagation();
    const confirmed = window.confirm(`Delete scan for "${itemToDelete.query}"?`);
    if (!confirmed) return;

    if (isSignedIn && itemToDelete.id) {
      try {
        await fetch(`/api/me/llm-visibility/${itemToDelete.id}`, { method: "DELETE" });
      } catch {
        /* fallback */
      }
    }

    const newHistory = history.filter(h => h.savedAt !== itemToDelete.savedAt);
    setHistory(newHistory);
    
    if (!isSignedIn) {
      localStorage.setItem("seo-engine:llm-history", JSON.stringify(newHistory));
    }

    if (activeResult?.savedAt === itemToDelete.savedAt) {
      setActiveResult(newHistory[0] || null);
    }
  }

  // Competitor Mentions Count calculations
  const competitorCounts: Record<string, number> = {};
  if (activeResult) {
    competitorCounts[activeResult.brandName] = 0;
    activeResult.competitors.forEach(c => {
      competitorCounts[c] = 0;
    });

    const providers: Provider[] = ["chatgpt", "claude", "gemini", "perplexity"];
    providers.forEach(p => {
      const d = activeResult.data[p];
      if (d && d.mentioned) {
        competitorCounts[activeResult.brandName]++;
      }
      activeResult.competitors.forEach(c => {
        if (d && d.competitorsMentioned?.[c]) {
          competitorCounts[c]++;
        }
      });
    });
  }

  // Historical Trends Calculation
  const trendHistory = activeResult
    ? history
        .filter(h => h.query.toLowerCase() === activeResult.query.toLowerCase() && h.brandName.toLowerCase() === activeResult.brandName.toLowerCase())
        .sort((a, b) => a.savedAt - b.savedAt)
    : [];

  const dialOffset = activeResult ? 251.2 - (251.2 * activeResult.score) / 100 : 251.2;
  const dialColor = activeResult
    ? activeResult.score >= 75
      ? "#1b9e5f" // leaf green
      : activeResult.score >= 40
      ? "#e2b203" // sunset yellow
      : "#c2412a" // crimson red
    : "#rgba(0,64,63,0.08)";

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-20 sm:pt-10 pb-10 max-w-6xl">
      <PageHeader
        kicker="LLM visibility tracker"
        title="AI Search Engine Optimization (GEO)"
        subtitle="Monitor brand mentions and citation metrics across Perplexity, ChatGPT, Claude, and Gemini in real-time."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form & History (Col 4) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="dotted-card p-5 relative flex flex-col gap-4">
            <span className="font-hand text-clay text-[18px] absolute -top-3 left-5 bg-paper-50 px-2">
              ~ tracker brief ~
            </span>

            <div className="mt-2 flex flex-col gap-3">
              <label className="block">
                <span className="font-hand text-[15px] text-clay block mb-1">Monitored search query</span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. Best SEO analysis engines 2026"
                  className="w-full px-3 py-2 rounded-lg bg-paper-50 border border-ink/20 outline-none text-[14px] focus:ring-2 focus:ring-teal-accent/30 font-sans"
                />
              </label>

              <label className="block">
                <span className="font-hand text-[15px] text-clay block mb-1">Your Brand Name</span>
                <input
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g. SEO Engine"
                  className="w-full px-3 py-2 rounded-lg bg-paper-50 border border-ink/20 outline-none text-[14px] focus:ring-2 focus:ring-teal-accent/30 font-sans"
                />
              </label>

              <label className="block">
                <span className="font-hand text-[15px] text-clay block mb-1">Competitors (comma separated)</span>
                <input
                  value={competitors}
                  onChange={(e) => setCompetitors(e.target.value)}
                  placeholder="e.g. Search Atlas, SEMrush, Ahrefs"
                  className="w-full px-3 py-2 rounded-lg bg-paper-50 border border-ink/20 outline-none text-[14px] focus:ring-2 focus:ring-teal-accent/30 font-sans"
                />
              </label>

              {/* Sandbox Toggle */}
              <label className="flex items-center gap-2 cursor-pointer mt-1 select-none">
                <input
                  type="checkbox"
                  checked={isSandbox}
                  onChange={(e) => setIsSandbox(e.target.checked)}
                  className="rounded border-ink/30 text-teal focus:ring-teal/30 w-4 h-4"
                />
                <span className="font-sans text-[12.5px] text-ink-soft flex items-center gap-1">
                  Demo Sandbox Mode{" "}
                  <span title="Generates immediate simulated scans. Disable to query native models or Groq fallback.">
                    <HelpCircle className="w-3.5 h-3.5 text-clay" />
                  </span>
                </span>
              </label>

              <button
                onClick={runScan}
                disabled={loading}
                className="btn-led inline-flex items-center justify-center gap-2 rounded-full px-6 py-2.5 font-hand text-[18px] shadow-md disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    scanning AI...
                  </>
                ) : (
                  <>Scan AI Visibility →</>
                )}
              </button>
            </div>

            {error && (
              <div className="mt-2 flex items-start gap-1.5 text-[13px] text-sunset font-sans">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Saved History card */}
          <div className="dotted-card p-5 relative flex flex-col gap-3 min-h-[220px]">
            <span className="font-hand text-clay text-[18px] absolute -top-3 left-5 bg-paper-50 px-2">
              ~ query history ~
            </span>

            <div className="mt-2 flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
              {history.length === 0 ? (
                <p className="text-[12.5px] text-ink-soft font-sans italic text-center mt-6">No previous queries run.</p>
              ) : (
                 history.map((item) => (
                  <div
                    key={item.savedAt}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setActiveResult(item);
                      setQuery(item.query);
                      setBrandName(item.brandName);
                      setCompetitors(item.competitors.join(", "));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setActiveResult(item);
                        setQuery(item.query);
                        setBrandName(item.brandName);
                        setCompetitors(item.competitors.join(", "));
                      }
                    }}
                    className={`text-left p-3 rounded-lg border-2 transition-all flex items-start justify-between gap-2 group cursor-pointer ${
                      activeResult?.savedAt === item.savedAt
                        ? "bg-paper-50 border-ink/80 shadow-sm"
                        : "border-transparent hover:bg-paper-50/50 hover:border-ink/20"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-sans font-semibold text-[13px] text-ink truncate">{item.query}</div>
                      <div className="font-sans text-[11px] text-ink-soft flex items-center gap-1.5 mt-0.5">
                        <span>{item.brandName}</span>
                        <span>·</span>
                        <span className="font-mono text-[9px] px-1 bg-ink/5 rounded">Score: {item.score}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => deleteItem(item, e)}
                      className="opacity-0 group-hover:opacity-100 hover:text-sunset p-0.5 transition-opacity text-ink-soft"
                      title="Delete record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Dashboard (Col 8) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {!activeResult ? (
            <div className="sticky-note p-12 border border-ink/15 text-center flex flex-col items-center justify-center min-h-[400px]">
              <ShieldCheck className="w-16 h-16 text-clay/40 mb-4" strokeWidth={1} />
              <h3 className="font-hand text-[26px] text-ink mb-2">No LLM Scan Active</h3>
              <p className="font-sans text-[14px] text-ink-soft max-w-sm mx-auto leading-relaxed">
                Choose a query, select your brand name, and hit the scan button to evaluate your organic footprint in AI responses.
              </p>
            </div>
          ) : (
            <>
              {/* Score summary panel */}
              <div className="sticky-note p-6 border border-ink/15 flex flex-col md:flex-row items-center gap-6">
                {/* SVG circular score dial */}
                <div className="relative w-24 h-24 shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="rgba(0,64,63,0.06)"
                      strokeWidth="8"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke={dialColor}
                      strokeWidth="8"
                      strokeDasharray="251.2"
                      strokeDashoffset={dialOffset}
                      className="score-ring"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-hand text-[26px] font-bold leading-none" style={{ color: dialColor }}>{activeResult.score}</span>
                    <span className="text-[9px] text-ink-soft font-sans uppercase font-medium mt-0.5">GEO Grade</span>
                  </div>
                </div>

                <div className="flex-1 text-center md:text-left">
                  <h3 className="font-hand text-[24px] text-ink leading-tight flex items-center justify-center md:justify-start gap-2">
                    Visibility Report
                  </h3>
                  <p className="font-sans text-[13.5px] text-ink-soft leading-relaxed mt-1">
                    Your brand **"{activeResult.brandName}"** has a visibility rating of **{activeResult.score}%** across monitored AI search answers for the query:
                  </p>
                  <div className="font-mono text-[12.5px] text-teal-dark bg-teal-accent/10 border border-teal-accent/20 rounded px-2.5 py-1.5 mt-2 inline-block max-w-full truncate">
                    "{activeResult.query}"
                  </div>
                </div>
              </div>

              {/* Providers Breakdown cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(Object.keys(activeResult.data) as Provider[]).map((prov) => {
                  const info = activeResult.data[prov];
                  if (!info) return null;

                  return (
                    <div key={prov} className="dotted-card p-5 relative flex flex-col justify-between gap-3 min-h-[220px]">
                      <div>
                        <div className="flex items-start justify-between gap-2 border-b border-ink/10 pb-2">
                          <span className="font-hand text-ink text-[18px]">{PROVIDER_LABELS[prov]}</span>
                          <div className="flex items-center gap-1.5">
                            {info.mentioned ? (
                              <>
                                <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded font-semibold">Mentioned</span>
                                {info.hasCitation && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-800 border border-blue-300 rounded font-semibold" title="Citation link found">Cited</span>
                                )}
                              </>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded font-semibold">Not mentioned</span>
                            )}
                          </div>
                        </div>

                        {/* Snippet box */}
                        <div className="mt-3 font-sans text-[12.5px] italic text-ink-soft leading-relaxed bg-paper/30 p-2.5 rounded border border-ink/5">
                          "{info.snippet}"
                        </div>
                      </div>

                      {/* Competitor overlap metrics */}
                      <div className="text-[11.5px] font-sans text-ink-muted flex flex-wrap items-center gap-x-2 gap-y-0.5 pt-2 border-t border-ink/5">
                        <span className="font-medium text-clay">Competitors found:</span>
                        {activeResult.competitors.length === 0 ? (
                          <span>None tracked</span>
                        ) : (
                          activeResult.competitors.map(comp => (
                            <span 
                              key={comp} 
                              className={`font-semibold ${
                                info.competitorsMentioned?.[comp] ? "text-sunset-dark" : "opacity-40"
                              }`}
                            >
                              {comp} {info.competitorsMentioned?.[comp] ? "✓" : "✗"}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Grid 2: Share of Voice & Trends */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Share of Voice (SOV) Bar Chart */}
                <div className="sticky-note p-5 border border-ink/15 flex flex-col gap-4">
                  <h4 className="font-hand text-[19px] text-ink border-b border-ink/10 pb-1 flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-teal" /> Share of Voice (Mentions)
                  </h4>
                  
                  <div className="flex flex-col gap-3.5 my-2">
                    {Object.keys(competitorCounts).map((comp) => {
                      const count = competitorCounts[comp] || 0;
                      const percentage = (count / 4) * 100;
                      const isBrand = comp === activeResult.brandName;
                      const color = isBrand ? "#1b9e5f" : "#e2b203";

                      return (
                        <div key={comp} className="flex flex-col gap-1 text-[13px] font-sans">
                          <div className="flex items-center justify-between">
                            <span className={`font-semibold truncate max-w-[150px] ${isBrand ? "text-ink" : "text-ink-soft"}`}>
                              {comp} {isBrand ? "(You)" : ""}
                            </span>
                            <span className="font-semibold text-ink-soft text-[12px]">{count}/4 mentions ({percentage.toFixed(0)}%)</span>
                          </div>
                          <div className="w-full h-3 bg-ink/5 rounded-full overflow-hidden border border-ink/10">
                            <div 
                              className="h-full transition-all duration-500 rounded-full" 
                              style={{ width: `${percentage}%`, backgroundColor: color }} 
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Trend line Chart */}
                <div className="sticky-note p-5 border border-ink/15 flex flex-col gap-4">
                  <h4 className="font-hand text-[19px] text-ink border-b border-ink/10 pb-1 flex items-center gap-1.5">
                    <LineChart className="w-4 h-4 text-teal" /> GEO Score Trend
                  </h4>

                  {trendHistory.length < 2 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-paper/20 rounded-lg min-h-[140px]">
                      <Calendar className="w-8 h-8 text-clay/30 mb-2" />
                      <p className="font-sans text-[12px] text-ink-soft italic leading-relaxed">
                        Only one snapshot saved. Run this query scan again later to map historical trend charts.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-between h-full">
                      {/* Custom SVG Line Chart */}
                      <div className="w-full h-28 relative mt-2">
                        <svg className="w-full h-full" viewBox="0 0 200 100" preserveAspectRatio="none">
                          {/* Grid lines */}
                          <line x1="0" y1="20" x2="200" y2="20" stroke="rgba(0,64,63,0.06)" strokeWidth="1" />
                          <line x1="0" y1="50" x2="200" y2="50" stroke="rgba(0,64,63,0.06)" strokeWidth="1" />
                          <line x1="0" y1="80" x2="200" y2="80" stroke="rgba(0,64,63,0.06)" strokeWidth="1" />
                          
                          {/* Polyline path */}
                          <polyline
                            fill="none"
                            stroke="#0e9aa0"
                            strokeWidth="2.5"
                            points={trendHistory
                              .map((h, i) => {
                                const x = (i / (trendHistory.length - 1)) * 200;
                                const y = 100 - h.score * 0.8 - 10; // score 100 -> y=10, score 0 -> y=90
                                return `${x},${y}`;
                              })
                              .join(" ")}
                          />

                          {/* Data points */}
                          {trendHistory.map((h, i) => {
                            const x = (i / (trendHistory.length - 1)) * 200;
                            const y = 100 - h.score * 0.8 - 10;
                            return (
                              <circle
                                key={i}
                                cx={x}
                                cy={y}
                                r="4"
                                fill="#00403f"
                                stroke="#ffffff"
                                strokeWidth="1.5"
                              >
                                <title>{`Score: ${h.score} on ${new Date(h.savedAt).toLocaleDateString()}`}</title>
                              </circle>
                            );
                          })}
                        </svg>
                      </div>
                      
                      {/* Trend labels */}
                      <div className="flex justify-between w-full text-[10px] text-ink-soft font-sans pt-2 border-t border-ink/5 mt-1">
                        <span>{new Date(trendHistory[0].savedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                        <span className="font-semibold text-teal-dark">Score Progress</span>
                        <span>{new Date(trendHistory[trendHistory.length - 1].savedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
