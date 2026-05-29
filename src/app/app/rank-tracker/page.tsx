"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import {
  Loader2,
  Trash2,
  RefreshCw,
  TrendingUp,
  Globe,
  Plus,
  Compass,
  Zap,
  Star,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";

type RankHistoryPoint = {
  date: number; // timestamp
  position: number; // 1 to 101
  searchVolume: number | null;
  cpc: number | null;
  serpFeatures: string[];
};

type TrackedKeyword = {
  id?: string;
  keyword: string;
  domain: string;
  createdAt: number;
  history: RankHistoryPoint[];
};

// Sandbox Mode Mock Keywords with 30-day history
const SANDBOX_KEYWORDS = [
  "ai code review",
  "best git client",
  "free code hosting",
  "automated devops engine",
  "how to learn nextjs",
];

function generateMockHistory(keyword: string, domain: string): TrackedKeyword {
  const history: RankHistoryPoint[] = [];
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  // Generate semi-random deterministic parameters based on keyword content
  const seed = keyword.length;
  const startRank = 30 + (seed % 50); // 30 to 80
  const endRank = Math.max(1, startRank - 20 - (seed % 15)); // improvement
  const volume = 500 + (seed % 8) * 1500; // 500 to 12500
  const cpc = 0.50 + (seed % 6) * 1.20; // $0.50 to $7.70

  const features = ["snippet"];
  if (seed % 2 === 0) features.push("people_also_ask");
  if (seed % 3 === 0) features.push("images");
  if (seed % 4 === 0) features.push("local_pack");

  for (let i = 29; i >= 0; i--) {
    const date = now - i * oneDay;
    const progress = (29 - i) / 29; // 0 to 1
    const trend = startRank + (endRank - startRank) * progress;
    // Add noise
    const noise = Math.sin(i * 0.8) * 4 + (i % 2 === 0 ? 1 : -1);
    let position = Math.max(1, Math.min(101, Math.round(trend + noise)));

    // Simulating unranked at beginning for newer topics
    if (keyword.includes("nextjs") && i > 24) {
      position = 101;
    }

    history.push({
      date,
      position,
      searchVolume: volume,
      cpc,
      serpFeatures: features,
    });
  }

  return {
    id: `mock-${keyword.replace(/\s+/g, "-")}`,
    keyword,
    domain,
    createdAt: now - 30 * oneDay,
    history,
  };
}

export default function RankTrackerPage() {
  const [domain, setDomain] = useState("github.com");
  const [bulkKeywords, setBulkKeywords] = useState("");
  const [isSandbox, setIsSandbox] = useState(true);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<TrackedKeyword[]>([]);
  const [selectedKeywordId, setSelectedKeywordId] = useState<string | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);

  // Load history on mount
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/me/rank-tracker");
        if (res.ok) {
          const data = await res.json();
          const dbKeywords = (data.keywords || []).map((k: any) => ({
            id: k.id,
            keyword: k.keyword,
            domain: k.domain,
            createdAt: new Date(k.createdAt).getTime(),
            history: (k.history || []).map((h: any) => ({
              date: new Date(h.date).getTime(),
              position: h.position,
              searchVolume: h.searchVolume,
              cpc: h.cpc,
              serpFeatures: h.serpFeatures || [],
            })).sort((a: any, b: any) => a.date - b.date),
          }));

          if (dbKeywords.length > 0) {
            setHistory(dbKeywords);
            setSelectedKeywordId(dbKeywords[0].id || null);
            setDomain(dbKeywords[0].domain);
            setIsSandbox(false);
          } else {
            // Load sandbox default
            loadSandboxDefaults();
          }
          setIsSignedIn(true);
        } else {
          loadLocalHistory();
        }
      } catch {
        loadLocalHistory();
      }
    }

    function loadLocalHistory() {
      const local = localStorage.getItem("seo-engine:tracked-keywords");
      if (local) {
        const parsed = JSON.parse(local) as TrackedKeyword[];
        if (parsed.length > 0) {
          setHistory(parsed);
          setSelectedKeywordId(parsed[0].id || parsed[0].keyword);
          setDomain(parsed[0].domain);
          setIsSandbox(false);
        } else {
          loadSandboxDefaults();
        }
      } else {
        loadSandboxDefaults();
      }
    }

    function loadSandboxDefaults() {
      const defaults = SANDBOX_KEYWORDS.map(kw => generateMockHistory(kw, "github.com"));
      setHistory(defaults);
      setSelectedKeywordId(defaults[0].id || null);
      setDomain("github.com");
      setIsSandbox(true);
    }

    loadData();
  }, [isSignedIn]);

  // Handle Sandbox mode toggling
  const handleSandboxToggle = (val: boolean) => {
    setIsSandbox(val);
    setError(null);
    if (val) {
      const defaults = SANDBOX_KEYWORDS.map(kw => generateMockHistory(kw, "github.com"));
      setHistory(defaults);
      setSelectedKeywordId(defaults[0].id || null);
      setDomain("github.com");
    } else {
      if (isSignedIn) {
        // Refetch database contents
        setIsSignedIn(false); // triggers useEffect refetch
      } else {
        // Empty local storage list
        setHistory([]);
        setSelectedKeywordId(null);
      }
    }
  };

  // Add Keywords
  const addKeywords = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!bulkKeywords.trim()) return;

    const list = bulkKeywords
      .split(/[\n,]+/)
      .map(k => k.trim())
      .filter(Boolean);

    if (list.length === 0) return;

    setLoading(true);
    const updatedHistory = [...history];

    try {
      for (const kw of list) {
        // Check for duplicates in current list
        if (updatedHistory.some(h => h.keyword.toLowerCase() === kw.toLowerCase() && h.domain.toLowerCase() === domain.toLowerCase())) {
          continue;
        }

        if (isSandbox) {
          // Generate simulated entry
          const simulated = generateMockHistory(kw, domain);
          updatedHistory.unshift(simulated);
        } else {
          // Call API to perform live scan
          const res = await fetch("/api/rank-tracker", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ keyword: kw, domain }),
          });

          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Failed to scan ranking");
          }

          const scanResult = await res.json();
          
          // Construct snapshot
          const newHistoryPoint: RankHistoryPoint = {
            date: Date.now(),
            position: scanResult.position,
            searchVolume: scanResult.searchVolume,
            cpc: scanResult.cpc,
            serpFeatures: scanResult.serpFeatures || [],
          };

          const newTracked: TrackedKeyword = {
            keyword: kw,
            domain,
            createdAt: Date.now(),
            history: [newHistoryPoint],
          };

          if (isSignedIn) {
            // Save to database
            const dbRes = await fetch("/api/me/rank-tracker", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                keyword: kw,
                domain,
                position: scanResult.position,
                searchVolume: scanResult.searchVolume,
                cpc: scanResult.cpc,
                serpFeatures: scanResult.serpFeatures,
              }),
            });

            if (dbRes.ok) {
              const dbData = await dbRes.json();
              newTracked.id = dbData.keyword.id;
              // Map DB history object correctly
              newTracked.history = [
                {
                  date: new Date(dbData.snapshot.date).getTime(),
                  position: dbData.snapshot.position,
                  searchVolume: dbData.snapshot.searchVolume,
                  cpc: dbData.snapshot.cpc,
                  serpFeatures: dbData.snapshot.serpFeatures || [],
                }
              ];
            }
          } else {
            newTracked.id = `local-${Date.now()}-${Math.random()}`;
          }

          updatedHistory.unshift(newTracked);
        }
      }

      setHistory(updatedHistory);
      if (updatedHistory.length > 0) {
        setSelectedKeywordId(updatedHistory[0].id || updatedHistory[0].keyword);
      }

      if (!isSandbox && !isSignedIn) {
        localStorage.setItem("seo-engine:tracked-keywords", JSON.stringify(updatedHistory));
      }
    } catch (err: any) {
      setError(err.message || "Failed to add keywords");
    } finally {
      setLoading(false);
    }
  };

  // Re-run scan for single keyword
  const updateRank = async (item: TrackedKeyword) => {
    if (!item.id && !item.keyword) return;
    setError(null);
    setUpdatingId(item.id || item.keyword);

    try {
      if (isSandbox) {
        // Mock rank update - slightly change position
        await new Promise(r => setTimeout(r, 600));
        const lastPoint = item.history[item.history.length - 1];
        const currentPos = lastPoint ? lastPoint.position : 50;
        let nextPos = currentPos + (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 4);
        nextPos = Math.max(1, Math.min(101, nextPos));

        const updatedHistory = history.map(h => {
          if ((h.id && h.id === item.id) || h.keyword === item.keyword) {
            return {
              ...h,
              history: [
                ...h.history,
                {
                  date: Date.now(),
                  position: nextPos,
                  searchVolume: lastPoint ? lastPoint.searchVolume : 1000,
                  cpc: lastPoint ? lastPoint.cpc : 1.20,
                  serpFeatures: lastPoint ? lastPoint.serpFeatures : ["snippet"],
                }
              ]
            };
          }
          return h;
        });
        setHistory(updatedHistory);
      } else {
        const res = await fetch("/api/rank-tracker", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keyword: item.keyword, domain: item.domain }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to scan ranking");
        }

        const scanResult = await res.json();

        if (isSignedIn && item.id) {
          const dbRes = await fetch("/api/me/rank-tracker", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              keyword: item.keyword,
              domain: item.domain,
              position: scanResult.position,
              searchVolume: scanResult.searchVolume,
              cpc: scanResult.cpc,
              serpFeatures: scanResult.serpFeatures,
            }),
          });

          if (dbRes.ok) {
            const dbData = await dbRes.json();
            const updatedHistory = history.map(h => {
              if (h.id === item.id) {
                return {
                  ...h,
                  history: [
                    ...h.history,
                    {
                      date: new Date(dbData.snapshot.date).getTime(),
                      position: dbData.snapshot.position,
                      searchVolume: dbData.snapshot.searchVolume,
                      cpc: dbData.snapshot.cpc,
                      serpFeatures: dbData.snapshot.serpFeatures || [],
                    }
                  ].sort((a, b) => a.date - b.date)
                };
              }
              return h;
            });
            setHistory(updatedHistory);
          }
        } else {
          // Local storage update
          const updatedHistory = history.map(h => {
            if (h.id === item.id) {
              return {
                ...h,
                history: [
                  ...h.history,
                  {
                    date: Date.now(),
                    position: scanResult.position,
                    searchVolume: scanResult.searchVolume,
                    cpc: scanResult.cpc,
                    serpFeatures: scanResult.serpFeatures || [],
                  }
                ]
              };
            }
            return h;
          });
          setHistory(updatedHistory);
          localStorage.setItem("seo-engine:tracked-keywords", JSON.stringify(updatedHistory));
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to update ranking");
    } finally {
      setUpdatingId(null);
    }
  };

  // Delete tracked keyword
  const deleteItem = async (item: TrackedKeyword, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = window.confirm(`Stop tracking keyword "${item.keyword}"?`);
    if (!confirmed) return;

    if (!isSandbox && isSignedIn && item.id) {
      try {
        await fetch(`/api/me/rank-tracker/${item.id}`, { method: "DELETE" });
      } catch {
        /* fallback */
      }
    }

    const updated = history.filter(h => (h.id && h.id !== item.id) || h.keyword !== item.keyword);
    setHistory(updated);

    if (selectedKeywordId === (item.id || item.keyword)) {
      setSelectedKeywordId(updated[0]?.id || updated[0]?.keyword || null);
    }

    if (!isSandbox && !isSignedIn) {
      localStorage.setItem("seo-engine:tracked-keywords", JSON.stringify(updated));
    }
  };

  // Calculate Rollup Metrics
  const activeKeyword = history.find(h => (h.id && h.id === selectedKeywordId) || h.keyword === selectedKeywordId);

  // Compute stats across current rankings (latest historical point for each keyword)
  const currentKeywords = history.map(h => {
    const latest = h.history[h.history.length - 1];
    return {
      ...h,
      position: latest ? latest.position : 101,
      volume: latest ? latest.searchVolume : null,
      cpc: latest ? latest.cpc : null,
      features: latest ? latest.serpFeatures : [],
    };
  });

  const rankedKeywords = currentKeywords.filter(k => k.position <= 100);
  const avgPos = rankedKeywords.length > 0
    ? Math.round((rankedKeywords.reduce((acc, k) => acc + k.position, 0) / rankedKeywords.length) * 10) / 10
    : null;

  const top3 = currentKeywords.filter(k => k.position <= 3).length;
  const top10 = currentKeywords.filter(k => k.position <= 10).length;
  const top100 = currentKeywords.filter(k => k.position <= 100).length;

  // Visibility calculation: weights rankings (pos 1 = 100%, pos 2 = 90%, pos 3 = 80%, pos 4-5 = 60%, pos 6-10 = 40%, pos 11-20 = 10%, others = 0%)
  const visibilityIndex = currentKeywords.length > 0
    ? Math.round(
        (currentKeywords.reduce((acc, k) => {
          if (k.position === 1) return acc + 100;
          if (k.position === 2) return acc + 90;
          if (k.position === 3) return acc + 80;
          if (k.position <= 5) return acc + 60;
          if (k.position <= 10) return acc + 40;
          if (k.position <= 20) return acc + 10;
          return acc;
        }, 0) / (currentKeywords.length * 100)) * 100
      )
    : 0;

  // Render line chart coords
  const renderChartLine = () => {
    if (!activeKeyword || activeKeyword.history.length === 0) return null;

    const points = activeKeyword.history;
    const width = 500;
    const height = 180;
    const paddingLeft = 35;
    const paddingRight = 15;
    const paddingTop = 15;
    const paddingBottom = 25;

    const usableWidth = width - paddingLeft - paddingRight;
    const usableHeight = height - paddingTop - paddingBottom;

    // Build coordinates
    const coords = points.map((p, i) => {
      const x = points.length === 1
        ? paddingLeft + usableWidth / 2
        : paddingLeft + (i / (points.length - 1)) * usableWidth;
      // Invert Y axis: position 1 -> top (y = paddingTop), position 100 -> bottom (y = height - paddingBottom)
      // Rank 101 (unranked) is plotted just below the limit (height - paddingBottom + 5)
      const rankVal = p.position > 100 ? 105 : p.position;
      const y = paddingTop + ((rankVal - 1) / 104) * usableHeight;
      return { x, y, pos: p.position };
    });

    const pathData = coords.reduce((acc, c, i) => {
      return acc + `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`;
    }, "");

    const areaData = pathData
      ? `${pathData} L ${coords[coords.length - 1].x.toFixed(1)} ${(height - paddingBottom).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(height - paddingBottom).toFixed(1)} Z`
      : "";

    return { coords, pathData, areaData, paddingLeft, paddingRight, paddingTop, paddingBottom, usableWidth, usableHeight, width, height };
  };

  const chart = renderChartLine();

  return (
    <div className="px-5 sm:px-10 py-6 max-w-6xl mx-auto min-h-screen">
      <PageHeader
        kicker="rank tracker"
        title="Rank Tracker"
        subtitle="Track keyword search positions, capture SERP features, and inspect temporal search visibility trends."
      />

      {error && (
        <div className="mb-6 p-4 rounded-xl border border-sunset/20 bg-sunset/5 text-sunset text-[13px] font-sans flex items-center gap-2">
          <HelpCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid Layout: Form on Left (Col 4), Analytics on Right (Col 8) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mt-6">
        {/* Left Column: Form & Config */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="dotted-card p-5 relative flex flex-col gap-4">
            <span className="font-hand text-clay text-[18px] absolute -top-3 left-5 bg-paper-50 px-2">
              ~ tracker settings ~
            </span>

            <form onSubmit={addKeywords} className="flex flex-col gap-3 mt-1">
              <div>
                <label className="block text-[11px] font-sans font-semibold text-ink-soft uppercase tracking-wide mb-1">
                  Target Domain
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-2.5 w-4 h-4 text-ink-soft" />
                  <input
                    type="text"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value.trim().toLowerCase())}
                    placeholder="e.g. website.com"
                    required
                    className="w-full bg-paper-50 border-2 border-ink/10 rounded-lg py-2 pl-9 pr-3 text-[13px] font-sans text-ink focus:border-ink/60 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-sans font-semibold text-ink-soft uppercase tracking-wide mb-1">
                  Track Keywords (Bulk)
                </label>
                <textarea
                  value={bulkKeywords}
                  onChange={(e) => setBulkKeywords(e.target.value)}
                  placeholder="Enter keywords (one per line, or comma-separated)"
                  rows={4}
                  required
                  className="w-full bg-paper-50 border-2 border-ink/10 rounded-lg py-2 px-3 text-[13px] font-sans text-ink focus:border-ink/60 focus:outline-none transition-all resize-none"
                />
              </div>

              <div className="flex items-center justify-between border-t border-ink/5 pt-3">
                <span className="text-[11.5px] font-sans font-semibold text-ink-soft uppercase tracking-wider flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-gold shrink-0" fill="currentColor" />
                  Sandbox Mode
                </span>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isSandbox}
                    onChange={(e) => handleSandboxToggle(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-ink/15 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-paper-50 after:border-ink/10 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-clay"></div>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || !bulkKeywords.trim()}
                className="mt-2 w-full bg-ink hover:bg-ink-soft text-paper-50 font-sans font-semibold text-[13px] py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Add &amp; Scan Keywords
              </button>
            </form>
          </div>

          {/* Quick Help Box */}
          <div className="sticky-note p-5 border border-ink/15">
            <h4 className="font-hand text-[18px] text-ink mb-1.5">AEO &amp; SEO Tracker</h4>
            <p className="font-sans text-[12px] text-ink-soft leading-relaxed">
              Google rankings are dynamic. Using this module, you track standard search engine indexing positions. Toggle Sandbox to see pre-generated charts instantly, or disable it to run live queries!
            </p>
          </div>
        </div>

        {/* Right Column: Analytics & List */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Rollup Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="dotted-card p-4 flex flex-col justify-between">
              <span className="text-[10px] font-sans font-bold text-ink-soft uppercase tracking-wider">Avg Position</span>
              <span className="font-hand text-[28px] text-ink leading-none mt-2 font-bold">
                {avgPos !== null ? `${avgPos}` : "—"}
              </span>
              <span className="text-[10px] text-ink-soft font-sans mt-1">
                {rankedKeywords.length} of {history.length} ranked
              </span>
            </div>

            <div className="dotted-card p-4 flex flex-col justify-between">
              <span className="text-[10px] font-sans font-bold text-ink-soft uppercase tracking-wider">Top 3 Rank</span>
              <span className="font-hand text-[28px] text-ink leading-none mt-2 font-bold">{top3}</span>
              <span className="text-[10px] text-ink-soft font-sans mt-1">keywords in Top 3</span>
            </div>

            <div className="dotted-card p-4 flex flex-col justify-between">
              <span className="text-[10px] font-sans font-bold text-ink-soft uppercase tracking-wider">Top 10 Rank</span>
              <span className="font-hand text-[28px] text-ink leading-none mt-2 font-bold">{top10}</span>
              <span className="text-[10px] text-ink-soft font-sans mt-1">keywords in Top 10</span>
            </div>

            <div className="dotted-card p-4 flex flex-col justify-between">
              <span className="text-[10px] font-sans font-bold text-ink-soft uppercase tracking-wider">Visibility</span>
              <span className="font-hand text-[28px] text-ink leading-none mt-2 font-bold">{visibilityIndex}%</span>
              <span className="text-[10px] text-ink-soft font-sans mt-1">estimated SERP Share</span>
            </div>
          </div>

          {/* Line Trend Chart */}
          <div className="sticky-note p-6 border border-ink/15">
            {activeKeyword && chart ? (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div>
                    <span className="font-hand text-clay text-[15px] uppercase">~ position history ~</span>
                    <h3 className="font-sans font-bold text-[16px] text-ink mt-0.5">
                      &ldquo;{activeKeyword.keyword}&rdquo; ranking on {activeKeyword.domain}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] text-ink-soft block font-sans font-medium uppercase tracking-wider">Current Position</span>
                      <span className="font-hand text-[20px] font-bold text-ink">
                        {activeKeyword.history[activeKeyword.history.length - 1]?.position <= 100
                          ? `#${activeKeyword.history[activeKeyword.history.length - 1].position}`
                          : "Unranked"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* SVG Chart Area */}
                <div className="relative w-full h-[180px] bg-paper-50/40 rounded-lg border border-ink/5 overflow-hidden">
                  <svg className="w-full h-full" viewBox={`0 0 ${chart.width} ${chart.height}`} preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgb(0, 64, 63)" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="rgb(0, 64, 63)" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Guideline Dotted lines */}
                    {[1, 10, 50, 100].map((gridVal) => {
                      const gridY = chart.paddingTop + ((gridVal - 1) / 104) * chart.usableHeight;
                      return (
                        <g key={gridVal}>
                          <line
                            x1={chart.paddingLeft}
                            y1={gridY}
                            x2={chart.width - chart.paddingRight}
                            y2={gridY}
                            stroke="rgba(0,0,0,0.06)"
                            strokeWidth="1"
                            strokeDasharray="4 4"
                          />
                          <text
                            x={chart.paddingLeft - 8}
                            y={gridY + 3}
                            textAnchor="end"
                            fontSize="8"
                            fill="rgba(0,0,0,0.4)"
                            className="font-mono"
                          >
                            {gridVal}
                          </text>
                        </g>
                      );
                    })}

                    {/* Shaded Area Fill */}
                    {chart.areaData && (
                      <path d={chart.areaData} fill="url(#chartGrad)" />
                    )}

                    {/* The Line */}
                    {chart.pathData && (
                      <path
                        d={chart.pathData}
                        fill="none"
                        stroke="rgb(0, 64, 63)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {/* Dots representing points */}
                    {chart.coords.map((c, i) => (
                      <g key={i} className="group/dot cursor-pointer">
                        <circle
                          cx={c.x}
                          cy={c.y}
                          r="3"
                          fill="rgb(0, 64, 63)"
                          stroke="rgb(255, 255, 255)"
                          strokeWidth="1"
                        />
                        <circle
                          cx={c.x}
                          cy={c.y}
                          r="7"
                          fill="transparent"
                          className="hover:fill-clay/10 transition-colors"
                        />
                        <title>{`Day ${i + 1}: Rank ${c.pos <= 100 ? c.pos : "Unranked"}`}</title>
                      </g>
                    ))}
                  </svg>
                  
                  {/* Floating Date Limits */}
                  <div className="absolute bottom-1 left-9 right-4 flex justify-between text-[9px] text-ink-soft font-mono">
                    <span>30 days ago</span>
                    <span>Today</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 flex flex-col items-center justify-center">
                <TrendingUp className="w-12 h-12 text-clay/35 mb-2" strokeWidth={1} />
                <h3 className="font-hand text-[20px] text-ink">No Keyword Selected</h3>
                <p className="font-sans text-[12px] text-ink-soft max-w-xs leading-relaxed">
                  Track or click a keyword from the table below to view its daily indexing trend chart.
                </p>
              </div>
            )}
          </div>

          {/* Keywords Grid Table */}
          <div className="dotted-card p-5">
            <h3 className="font-hand text-[20px] text-ink mb-4">Tracked Keywords ({history.length})</h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-ink/10">
                    <th className="pb-3 text-[11px] font-sans font-bold text-ink-soft uppercase tracking-wider">Keyword</th>
                    <th className="pb-3 text-[11px] font-sans font-bold text-ink-soft uppercase tracking-wider hidden sm:table-cell">Intent</th>
                    <th className="pb-3 text-[11px] font-sans font-bold text-ink-soft uppercase tracking-wider hidden md:table-cell">SERP Features</th>
                    <th className="pb-3 text-[11px] font-sans font-bold text-ink-soft uppercase tracking-wider">Vol</th>
                    <th className="pb-3 text-[11px] font-sans font-bold text-ink-soft uppercase tracking-wider hidden sm:table-cell">CPC</th>
                    <th className="pb-3 text-[11px] font-sans font-bold text-ink-soft uppercase tracking-wider text-right">Rank</th>
                    <th className="pb-3 text-[11px] font-sans font-bold text-ink-soft uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentKeywords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[12.5px] text-ink-soft font-sans italic">
                        No keywords currently being tracked.
                      </td>
                    </tr>
                  ) : (
                    currentKeywords.map((item) => {
                      const latestPoint = item.history[item.history.length - 1];
                      const prevPoint = item.history[item.history.length - 2];
                      
                      let changeStr = "";
                      let changeColor = "text-ink-soft";
                      
                      if (latestPoint && prevPoint) {
                        const curPos = latestPoint.position;
                        const prePos = prevPoint.position;
                        if (curPos !== prePos) {
                          if (curPos < prePos) {
                            // Improvement (numerical decrease)
                            const diff = prePos - curPos;
                            changeStr = `▲ +${diff}`;
                            changeColor = "text-emerald-600";
                          } else {
                            // Decline
                            const diff = curPos - prePos;
                            changeStr = `▼ -${diff}`;
                            changeColor = "text-sunset";
                          }
                        }
                      }

                      // Intent Classification
                      let intentLabel = "Informational";
                      let intentColor = "bg-sky-50 text-sky-700 border-sky-200/50";
                      const kwLower = item.keyword.toLowerCase();
                      if (/(buy|order|price|cheap|discount|deal|coupon|shop|near me|for sale)/.test(kwLower)) {
                        intentLabel = "Transactional";
                        intentColor = "bg-rose-50 text-rose-700 border-rose-200/50";
                      } else if (/(best|top|review|vs|compare|alternative)/.test(kwLower)) {
                        intentLabel = "Commercial";
                        intentColor = "bg-amber-50 text-amber-700 border-amber-200/50";
                      } else if (/(login|sign in|website|official|app|download)/.test(kwLower)) {
                        intentLabel = "Navigational";
                        intentColor = "bg-indigo-50 text-indigo-700 border-indigo-200/50";
                      }

                      const isSelected = selectedKeywordId === (item.id || item.keyword);

                      return (
                        <tr
                          key={item.id || item.keyword}
                          onClick={() => setSelectedKeywordId(item.id || item.keyword)}
                          className={`border-b border-ink/5 last:border-0 hover:bg-paper-50/50 cursor-pointer transition-colors group ${
                            isSelected ? "bg-paper-50/80" : ""
                          }`}
                        >
                          <td className="py-3">
                            <div className="font-sans font-semibold text-[13px] text-ink">{item.keyword}</div>
                            <div className="font-sans text-[10px] text-ink-soft mt-0.5">{item.domain}</div>
                          </td>
                          
                          <td className="py-3 hidden sm:table-cell">
                            <span className={`text-[9.5px] font-sans font-medium px-2 py-0.5 rounded-full border ${intentColor}`}>
                              {intentLabel}
                            </span>
                          </td>

                          <td className="py-3 hidden md:table-cell">
                            <div className="flex gap-1">
                              {(item.features || []).map((f) => (
                                <span
                                  key={f}
                                  className="text-[9px] font-mono text-ink bg-ink/5 border border-ink/10 rounded px-1"
                                  title={f.replace("_", " ")}
                                >
                                  {f === "people_also_ask" ? "PAA" : f === "local_pack" ? "Local" : f}
                                </span>
                              ))}
                              {(item.features || []).length === 0 && (
                                <span className="text-[10px] text-ink-soft">—</span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 font-mono text-[12px] text-ink">
                            {item.volume ? item.volume.toLocaleString() : "—"}
                          </td>

                          <td className="py-3 font-mono text-[12px] text-ink hidden sm:table-cell">
                            {item.cpc ? `$${item.cpc.toFixed(2)}` : "—"}
                          </td>

                          <td className="py-3 text-right">
                            <div className="font-mono text-[13px] font-bold text-ink">
                              {item.position <= 100 ? `#${item.position}` : "—"}
                            </div>
                            {changeStr && (
                              <div className={`text-[9.5px] font-sans font-medium ${changeColor}`}>
                                {changeStr}
                              </div>
                            )}
                          </td>

                          <td className="py-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => updateRank(item)}
                                disabled={updatingId === (item.id || item.keyword)}
                                className="p-1 text-ink-soft hover:text-ink hover:bg-ink/5 rounded transition-all disabled:opacity-30"
                                title="Update position scan"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${updatingId === (item.id || item.keyword) ? "animate-spin" : ""}`} />
                              </button>
                              <button
                                onClick={(e) => deleteItem(item, e)}
                                className="p-1 text-ink-soft hover:text-sunset hover:bg-sunset/5 rounded transition-all"
                                title="Delete keyword"
                              >
                                <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
