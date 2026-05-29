"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import {
  Loader2,
  AlertCircle,
  Trash2,
  MapPin,
  Phone,
  Building2,
  Globe,
  Map,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  HelpCircle,
  Search,
  Shield,
  Smartphone,
  Code2,
  Target,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type NapDetails = {
  nameFound: boolean;
  addressFound: boolean;
  phoneFound: boolean;
  consistent: boolean;
  notes: string;
};

type SchemaDetails = {
  hasLocalBusinessSchema: boolean;
  schemaType: string | null;
  missingFields: string[];
  notes: string;
};

type LocalDetails = {
  hasMapsEmbed: boolean;
  mobileReady: boolean;
  localKeywordsInTitle: boolean;
  localKeywordsInMeta: boolean;
  localKeywordsInH1: boolean;
  notes: string;
};

type Recommendation = {
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
};

type GridCell = {
  zone: string;
  row: number;
  col: number;
  rank: number;
  description: string;
};

type LocalKeyword = {
  keyword: string;
  intent: string;
  difficulty: string;
  volume: string;
};

type AuditResult = {
  id?: string;
  url: string;
  businessName: string;
  city: string;
  napScore: number;
  schemaScore: number;
  localScore: number;
  napDetails: NapDetails;
  schemaDetails: SchemaDetails;
  localDetails: LocalDetails;
  recommendations: Recommendation[];
  gridHeatmap: GridCell[];
  localKeywords: LocalKeyword[];
  signals?: {
    phones: string[];
    addresses: string[];
    schemaBlockCount: number;
    hasMapsEmbed: boolean;
    title: string;
    description: string;
    hasViewport: boolean;
  };
  savedAt: number;
};

/* ------------------------------------------------------------------ */
/*  Sandbox Mock Generator                                             */
/* ------------------------------------------------------------------ */

function generateMockResult(
  url: string,
  businessName: string,
  city: string
): AuditResult {
  const seed = (url.length + businessName.length + city.length) % 10;
  const napScore = 55 + seed * 4;
  const schemaScore = seed > 4 ? 70 + seed * 2 : 25 + seed * 5;
  const localScore = Math.round((napScore + schemaScore) / 2 + seed);

  const zones = [
    "NW", "N-NW", "N", "N-NE", "NE",
    "W-NW", "Inner NW", "Inner N", "Inner NE", "E-NE",
    "W", "Inner W", "Center", "Inner E", "E",
    "W-SW", "Inner SW", "Inner S", "Inner SE", "E-SE",
    "SW", "S-SW", "S", "S-SE", "SE",
  ];

  const gridHeatmap: GridCell[] = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const idx = r * 5 + c;
      const distFromCenter = Math.abs(r - 2) + Math.abs(c - 2);
      const rank =
        distFromCenter === 0
          ? 1 + (seed % 3)
          : distFromCenter <= 1
          ? 2 + (seed % 4) + distFromCenter
          : distFromCenter <= 2
          ? 5 + (seed % 5) + distFromCenter * 2
          : 8 + distFromCenter * 3 + (seed % 4);
      gridHeatmap.push({
        zone: zones[idx],
        row: r,
        col: c,
        rank: Math.min(rank, 20),
        description: `${zones[idx]} ${city}`,
      });
    }
  }

  return {
    url,
    businessName,
    city,
    napScore,
    schemaScore,
    localScore,
    napDetails: {
      nameFound: seed > 2,
      addressFound: seed > 4,
      phoneFound: seed > 3,
      consistent: seed > 5,
      notes: seed > 5
        ? `"${businessName}" name, address, and phone found on page and appear consistent.`
        : `Some NAP elements are missing or inconsistent. Business name ${seed > 2 ? "was" : "was not"} found on the page.`,
    },
    schemaDetails: {
      hasLocalBusinessSchema: seed > 4,
      schemaType: seed > 4 ? "LocalBusiness" : null,
      missingFields: seed > 4
        ? ["openingHours", "geo"]
        : ["@type LocalBusiness", "name", "address", "telephone", "openingHours", "geo", "url"],
      notes: seed > 4
        ? "LocalBusiness schema detected but missing openingHours and geo coordinates."
        : "No LocalBusiness schema.org JSON-LD markup was found on this page.",
    },
    localDetails: {
      hasMapsEmbed: seed > 5,
      mobileReady: true,
      localKeywordsInTitle: seed > 3,
      localKeywordsInMeta: seed > 4,
      localKeywordsInH1: seed > 6,
      notes: `Page ${seed > 5 ? "has" : "is missing"} a Google Maps embed. City name "${city}" ${seed > 3 ? "appears" : "does not appear"} in the title tag.`,
    },
    gridHeatmap,
    recommendations: [
      { priority: "high", title: "Add LocalBusiness Schema", description: `Add a complete schema.org LocalBusiness JSON-LD block with name, address, telephone, openingHours, and geo coordinates for ${businessName}.` },
      { priority: "high", title: "Embed Google Maps", description: `Add an embedded Google Map iframe showing the exact location of ${businessName} in ${city} on the contact or homepage.` },
      { priority: "medium", title: "Optimize Title Tag", description: `Include "${city}" and primary service keywords in the page title tag. Current title could better target local searches.` },
      { priority: "medium", title: "Add NAP to Footer", description: `Ensure consistent Name, Address, Phone (NAP) appears in the site footer on every page for local crawlability.` },
      { priority: "medium", title: "Create Location Pages", description: `If serving multiple areas near ${city}, create dedicated location landing pages targeting each neighborhood.` },
      { priority: "low", title: "Add Opening Hours", description: `Display business hours prominently on the page and include them in the LocalBusiness schema.` },
      { priority: "low", title: "Optimize for 'Near Me' Queries", description: `Add geo-modifier keywords and phrases like "near me", "in ${city}", or specific neighborhood names to your content.` },
    ],
    localKeywords: [
      { keyword: `${businessName.toLowerCase()} ${city.toLowerCase()}`, intent: "navigational", difficulty: "easy", volume: "720" },
      { keyword: `best ${businessName.split(" ")[0]?.toLowerCase() || "business"} in ${city.toLowerCase()}`, intent: "commercial", difficulty: "medium", volume: "1,200" },
      { keyword: `${businessName.split(" ")[0]?.toLowerCase() || "service"} near me ${city.toLowerCase()}`, intent: "transactional", difficulty: "medium", volume: "2,400" },
      { keyword: `${city.toLowerCase()} ${businessName.split(" ")[0]?.toLowerCase() || "business"} reviews`, intent: "commercial", difficulty: "easy", volume: "590" },
      { keyword: `affordable ${businessName.split(" ")[0]?.toLowerCase() || "service"} ${city.toLowerCase()}`, intent: "transactional", difficulty: "hard", volume: "880" },
      { keyword: `top rated ${businessName.split(" ")[0]?.toLowerCase() || "business"} ${city.toLowerCase()}`, intent: "commercial", difficulty: "hard", volume: "1,600" },
      { keyword: `${businessName.split(" ")[0]?.toLowerCase() || "business"} open now ${city.toLowerCase()}`, intent: "transactional", difficulty: "easy", volume: "320" },
      { keyword: `${city.toLowerCase()} ${businessName.split(" ")[0]?.toLowerCase() || "business"} directions`, intent: "navigational", difficulty: "easy", volume: "210" },
      { keyword: `${businessName.split(" ")[0]?.toLowerCase() || "service"} hours ${city.toLowerCase()}`, intent: "informational", difficulty: "easy", volume: "480" },
      { keyword: `${city.toLowerCase()} local ${businessName.split(" ")[0]?.toLowerCase() || "business"} contact`, intent: "navigational", difficulty: "easy", volume: "150" },
    ],
    signals: {
      phones: seed > 3 ? ["+1 (555) 123-4567"] : [],
      addresses: seed > 4 ? [`123 Main Street, ${city}`] : [],
      schemaBlockCount: seed > 4 ? 1 : 0,
      hasMapsEmbed: seed > 5,
      title: `${businessName} — Welcome to our ${city} location`,
      description: `${businessName} provides quality service in ${city}. Visit us today!`,
      hasViewport: true,
    },
    savedAt: Date.now(),
  };
}

/* ------------------------------------------------------------------ */
/*  Score Dial Component                                               */
/* ------------------------------------------------------------------ */

function ScoreDial({
  score,
  label,
  size = 88,
}: {
  score: number;
  label: string;
  size?: number;
}) {
  const r = (size - 16) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (circumference * score) / 100;
  const color =
    score >= 75 ? "#1b9e5f" : score >= 40 ? "#e2b203" : "#c2412a";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          className="w-full h-full transform -rotate-90"
          viewBox={`0 0 ${size} ${size}`}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="transparent"
            stroke="rgba(0,64,63,0.06)"
            strokeWidth="7"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="transparent"
            stroke={color}
            strokeWidth="7"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-hand text-[22px] font-bold leading-none"
            style={{ color }}
          >
            {score}
          </span>
        </div>
      </div>
      <span className="text-[10px] text-ink-soft font-sans uppercase font-medium tracking-wide text-center leading-tight">
        {label}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Grid Heatmap Component                                             */
/* ------------------------------------------------------------------ */

function GridHeatmap({ cells, city }: { cells: GridCell[]; city: string }) {
  function cellColor(rank: number): string {
    if (rank === 0) return "rgba(0,0,0,0.04)";
    if (rank <= 3) return "#16a34a";
    if (rank <= 5) return "#65a30d";
    if (rank <= 7) return "#ca8a04";
    if (rank <= 10) return "#ea580c";
    if (rank <= 15) return "#dc2626";
    return "#991b1b";
  }

  function cellTextColor(rank: number): string {
    if (rank === 0) return "#888";
    if (rank <= 7) return "#fff";
    return "#fff";
  }

  // Build 5x5 grid
  const grid: (GridCell | null)[][] = Array.from({ length: 5 }, () =>
    Array(5).fill(null)
  );
  cells.forEach((c) => {
    if (c.row >= 0 && c.row < 5 && c.col >= 0 && c.col < 5) {
      grid[c.row][c.col] = c;
    }
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h4 className="font-hand text-[19px] text-ink flex items-center gap-1.5">
          <Map className="w-4 h-4 text-teal" /> Local Pack Grid
        </h4>
        <span className="font-sans text-[11px] text-ink-soft">{city}</span>
      </div>

      <div className="grid grid-cols-5 gap-1">
        {grid.map((row, ri) =>
          row.map((cell, ci) => {
            const rank = cell?.rank ?? 0;
            return (
              <div
                key={`${ri}-${ci}`}
                className="aspect-square rounded-md flex flex-col items-center justify-center relative cursor-default group transition-transform hover:scale-105"
                style={{
                  backgroundColor: cellColor(rank),
                  minHeight: 48,
                }}
                title={cell ? `${cell.description}: Rank #${rank || "N/R"}` : ""}
              >
                <span
                  className="font-hand text-[16px] font-bold leading-none"
                  style={{ color: cellTextColor(rank) }}
                >
                  {rank === 0 ? "—" : `#${rank}`}
                </span>
                <span
                  className="text-[7px] font-sans mt-0.5 opacity-80 leading-tight text-center px-0.5 truncate max-w-full"
                  style={{ color: cellTextColor(rank) }}
                >
                  {cell?.zone ?? ""}
                </span>

                {/* Hover tooltip */}
                <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-ink text-paper text-[10px] font-sans px-2 py-1 rounded shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {cell?.description || "No data"}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 flex-wrap text-[10px] font-sans text-ink-soft">
        <span className="font-medium">Legend:</span>
        {[
          { label: "#1-3", color: "#16a34a" },
          { label: "#4-5", color: "#65a30d" },
          { label: "#6-7", color: "#ca8a04" },
          { label: "#8-10", color: "#ea580c" },
          { label: "#11-15", color: "#dc2626" },
          { label: "#16+", color: "#991b1b" },
        ].map((l) => (
          <span key={l.label} className="inline-flex items-center gap-1">
            <span
              className="w-2.5 h-2.5 rounded-sm inline-block"
              style={{ backgroundColor: l.color }}
            />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Check / X indicator                                                */
/* ------------------------------------------------------------------ */

function BoolIndicator({
  ok,
  label,
}: {
  ok: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 text-[13px] font-sans">
      {ok ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 text-red-500 shrink-0" />
      )}
      <span className={ok ? "text-ink" : "text-ink-soft"}>{label}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Priority badge                                                     */
/* ------------------------------------------------------------------ */

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    high: "bg-red-100 text-red-800 border-red-300",
    medium: "bg-amber-100 text-amber-800 border-amber-300",
    low: "bg-blue-100 text-blue-800 border-blue-300",
  };
  return (
    <span
      className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold uppercase ${
        styles[priority] || styles.low
      }`}
    >
      {priority}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */

export default function LocalSeoPage() {
  const [url, setUrl] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [city, setCity] = useState("");
  const [isSandbox, setIsSandbox] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<AuditResult[]>([]);
  const [activeResult, setActiveResult] = useState<AuditResult | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);

  // Load history on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch("/api/me/local-seo");
        if (res.ok) {
          const data = await res.json();
          const formatted = (data.audits || []).map((a: any) => ({
            id: a.id,
            url: a.url,
            businessName: a.businessName,
            city: a.city,
            napScore: a.napScore,
            schemaScore: a.schemaScore,
            localScore: a.localScore,
            ...(a.data || {}),
            savedAt: new Date(a.createdAt).getTime(),
          }));
          setHistory(formatted);
          setIsSignedIn(true);
          if (formatted.length > 0) {
            setActiveResult(formatted[0]);
            setUrl(formatted[0].url);
            setBusinessName(formatted[0].businessName);
            setCity(formatted[0].city);
          }
        } else {
          loadLocalHistory();
        }
      } catch {
        loadLocalHistory();
      }
    }

    function loadLocalHistory() {
      const local = localStorage.getItem("seo-engine:local-seo-history");
      if (local) {
        const parsed = JSON.parse(local) as AuditResult[];
        setHistory(parsed);
        if (parsed.length > 0) {
          setActiveResult(parsed[0]);
          setUrl(parsed[0].url);
          setBusinessName(parsed[0].businessName);
          setCity(parsed[0].city);
        }
      }
    }

    loadHistory();
  }, []);

  async function runAudit() {
    if (!url.trim() || !businessName.trim() || !city.trim()) {
      setError("Please fill in all three fields: URL, business name, and city.");
      return;
    }
    setLoading(true);
    setError(null);

    if (isSandbox) {
      await new Promise((resolve) => setTimeout(resolve, 1800));
      const mockResult = generateMockResult(
        url.trim(),
        businessName.trim(),
        city.trim()
      );
      saveResult(mockResult);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/local-seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          businessName: businessName.trim(),
          city: city.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Audit failed");

      const result: AuditResult = {
        ...data,
        savedAt: Date.now(),
      };
      await saveResult(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function saveResult(result: AuditResult) {
    setActiveResult(result);

    let savedId = result.id;
    if (isSignedIn) {
      try {
        const res = await fetch("/api/me/local-seo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            businessName: result.businessName,
            url: result.url,
            city: result.city,
            napScore: result.napScore,
            schemaScore: result.schemaScore,
            localScore: result.localScore,
            data: {
              napDetails: result.napDetails,
              schemaDetails: result.schemaDetails,
              localDetails: result.localDetails,
              recommendations: result.recommendations,
              gridHeatmap: result.gridHeatmap,
              localKeywords: result.localKeywords,
              signals: result.signals,
            },
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

    const filtered = history.filter(
      (item) =>
        !(
          item.url.toLowerCase() === result.url.toLowerCase() &&
          item.businessName.toLowerCase() === result.businessName.toLowerCase()
        )
    );
    const newHistory = [updatedResult, ...filtered].slice(0, 30);
    setHistory(newHistory);

    if (!isSignedIn) {
      localStorage.setItem(
        "seo-engine:local-seo-history",
        JSON.stringify(newHistory)
      );
    }
  }

  async function deleteItem(itemToDelete: AuditResult, e: React.MouseEvent) {
    e.stopPropagation();
    const confirmed = window.confirm(
      `Delete audit for "${itemToDelete.businessName}"?`
    );
    if (!confirmed) return;

    if (isSignedIn && itemToDelete.id) {
      try {
        await fetch(`/api/me/local-seo/${itemToDelete.id}`, {
          method: "DELETE",
        });
      } catch {
        /* fallback */
      }
    }

    const newHistory = history.filter(
      (h) => h.savedAt !== itemToDelete.savedAt
    );
    setHistory(newHistory);

    if (!isSignedIn) {
      localStorage.setItem(
        "seo-engine:local-seo-history",
        JSON.stringify(newHistory)
      );
    }

    if (activeResult?.savedAt === itemToDelete.savedAt) {
      setActiveResult(newHistory[0] || null);
    }
  }

  const r = activeResult;

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-20 sm:pt-10 pb-10 max-w-6xl">
      <PageHeader
        kicker="local seo"
        title="Local Business SEO Audit"
        subtitle="Audit NAP consistency, schema.org LocalBusiness markup, local keyword optimization, and visualize local pack grid rankings."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ============ Left Column: Form & History (Col 4) ============ */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Audit Form */}
          <div className="dotted-card p-5 relative flex flex-col gap-4">
            <span className="font-hand text-clay text-[18px] absolute -top-3 left-5 bg-paper-50 px-2">
              ~ audit brief ~
            </span>

            <div className="mt-2 flex flex-col gap-3">
              <label className="block">
                <span className="font-hand text-[15px] text-clay block mb-1">
                  Business URL
                </span>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="e.g. https://joespizza.com"
                  className="w-full px-3 py-2 rounded-lg bg-paper-50 border border-ink/20 outline-none text-[14px] focus:ring-2 focus:ring-teal-accent/30 font-sans"
                />
              </label>

              <label className="block">
                <span className="font-hand text-[15px] text-clay block mb-1">
                  Business Name
                </span>
                <input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Joe's Pizza"
                  className="w-full px-3 py-2 rounded-lg bg-paper-50 border border-ink/20 outline-none text-[14px] focus:ring-2 focus:ring-teal-accent/30 font-sans"
                />
              </label>

              <label className="block">
                <span className="font-hand text-[15px] text-clay block mb-1">
                  City / Location
                </span>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. New York"
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
                  <span title="Generates instant simulated audit results. Disable to crawl real URLs via Groq.">
                    <HelpCircle className="w-3.5 h-3.5 text-clay" />
                  </span>
                </span>
              </label>

              <button
                onClick={runAudit}
                disabled={loading}
                className="btn-led inline-flex items-center justify-center gap-2 rounded-full px-6 py-2.5 font-hand text-[18px] shadow-md disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    auditing...
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4" />
                    Run Local Audit →
                  </>
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

          {/* Saved History */}
          <div className="dotted-card p-5 relative flex flex-col gap-3 min-h-[220px]">
            <span className="font-hand text-clay text-[18px] absolute -top-3 left-5 bg-paper-50 px-2">
              ~ audit history ~
            </span>

            <div className="mt-2 flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
              {history.length === 0 ? (
                <p className="text-[12.5px] text-ink-soft font-sans italic text-center mt-6">
                  No previous local audits run.
                </p>
              ) : (
                history.map((item) => (
                  <div
                    key={item.savedAt}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setActiveResult(item);
                      setUrl(item.url);
                      setBusinessName(item.businessName);
                      setCity(item.city);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setActiveResult(item);
                        setUrl(item.url);
                        setBusinessName(item.businessName);
                        setCity(item.city);
                      }
                    }}
                    className={`text-left p-3 rounded-lg border-2 transition-all flex items-start justify-between gap-2 group cursor-pointer ${
                      activeResult?.savedAt === item.savedAt
                        ? "bg-paper-50 border-ink/80 shadow-sm"
                        : "border-transparent hover:bg-paper-50/50 hover:border-ink/20"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-sans font-semibold text-[13px] text-ink truncate">
                        {item.businessName}
                      </div>
                      <div className="font-sans text-[11px] text-ink-soft flex items-center gap-1.5 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        <span>{item.city}</span>
                        <span>·</span>
                        <span className="font-mono text-[9px] px-1 bg-ink/5 rounded">
                          Score: {item.localScore}
                        </span>
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

        {/* ============ Right Column: Dashboard (Col 8) ============ */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {!r ? (
            <div className="sticky-note p-12 border border-ink/15 text-center flex flex-col items-center justify-center min-h-[400px]">
              <MapPin
                className="w-16 h-16 text-clay/40 mb-4"
                strokeWidth={1}
              />
              <h3 className="font-hand text-[26px] text-ink mb-2">
                No Local Audit Active
              </h3>
              <p className="font-sans text-[14px] text-ink-soft max-w-sm mx-auto leading-relaxed">
                Enter a business URL, name, and city above. Click "Run Local
                Audit" to scan NAP consistency, schema markup, and generate a
                local pack grid heatmap.
              </p>
            </div>
          ) : (
            <>
              {/* Score Summary Panel */}
              <div className="sticky-note p-6 border border-ink/15">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="flex items-center gap-5">
                    <ScoreDial score={r.napScore} label="NAP Score" />
                    <ScoreDial score={r.schemaScore} label="Schema" />
                    <ScoreDial
                      score={r.localScore}
                      label="Overall"
                      size={100}
                    />
                  </div>

                  <div className="flex-1 text-center md:text-left">
                    <h3 className="font-hand text-[24px] text-ink leading-tight">
                      Local SEO Report
                    </h3>
                    <p className="font-sans text-[13.5px] text-ink-soft leading-relaxed mt-1">
                      Audit for{" "}
                      <strong>&quot;{r.businessName}&quot;</strong> in{" "}
                      <strong>{r.city}</strong>
                    </p>
                    <div className="font-mono text-[12px] text-teal-dark bg-teal-accent/10 border border-teal-accent/20 rounded px-2.5 py-1.5 mt-2 inline-block max-w-full truncate">
                      {r.url}
                    </div>
                  </div>
                </div>
              </div>

              {/* Findings: NAP + Schema + Local Signals */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* NAP Card */}
                <div className="dotted-card p-5 relative flex flex-col gap-3">
                  <h4 className="font-hand text-[17px] text-ink flex items-center gap-1.5 border-b border-ink/10 pb-2">
                    <Building2 className="w-4 h-4 text-teal" /> NAP Check
                  </h4>
                  <div className="flex flex-col gap-2">
                    <BoolIndicator
                      ok={r.napDetails?.nameFound ?? false}
                      label="Business name found"
                    />
                    <BoolIndicator
                      ok={r.napDetails?.addressFound ?? false}
                      label="Address found"
                    />
                    <BoolIndicator
                      ok={r.napDetails?.phoneFound ?? false}
                      label="Phone found"
                    />
                    <BoolIndicator
                      ok={r.napDetails?.consistent ?? false}
                      label="NAP consistent"
                    />
                  </div>
                  {r.napDetails?.notes && (
                    <p className="text-[11.5px] text-ink-soft font-sans italic mt-1 leading-relaxed">
                      {r.napDetails.notes}
                    </p>
                  )}
                </div>

                {/* Schema Card */}
                <div className="dotted-card p-5 relative flex flex-col gap-3">
                  <h4 className="font-hand text-[17px] text-ink flex items-center gap-1.5 border-b border-ink/10 pb-2">
                    <Code2 className="w-4 h-4 text-teal" /> Schema.org
                  </h4>
                  <div className="flex flex-col gap-2">
                    <BoolIndicator
                      ok={r.schemaDetails?.hasLocalBusinessSchema ?? false}
                      label="LocalBusiness JSON-LD"
                    />
                    {r.schemaDetails?.schemaType && (
                      <div className="text-[12px] font-mono text-ink-soft bg-ink/5 px-2 py-1 rounded">
                        @type: {r.schemaDetails.schemaType}
                      </div>
                    )}
                  </div>
                  {(r.schemaDetails?.missingFields?.length ?? 0) > 0 && (
                    <div className="mt-1">
                      <span className="text-[11px] text-ink-soft font-sans font-medium">
                        Missing fields:
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {r.schemaDetails.missingFields.map((f) => (
                          <span
                            key={f}
                            className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded font-mono"
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Local Signals Card */}
                <div className="dotted-card p-5 relative flex flex-col gap-3">
                  <h4 className="font-hand text-[17px] text-ink flex items-center gap-1.5 border-b border-ink/10 pb-2">
                    <Target className="w-4 h-4 text-teal" /> Local Signals
                  </h4>
                  <div className="flex flex-col gap-2">
                    <BoolIndicator
                      ok={r.localDetails?.hasMapsEmbed ?? false}
                      label="Google Maps embed"
                    />
                    <BoolIndicator
                      ok={r.localDetails?.mobileReady ?? false}
                      label="Mobile viewport"
                    />
                    <BoolIndicator
                      ok={r.localDetails?.localKeywordsInTitle ?? false}
                      label="City in title tag"
                    />
                    <BoolIndicator
                      ok={r.localDetails?.localKeywordsInMeta ?? false}
                      label="City in meta desc"
                    />
                    <BoolIndicator
                      ok={r.localDetails?.localKeywordsInH1 ?? false}
                      label="City in H1"
                    />
                  </div>
                </div>
              </div>

              {/* Grid Heatmap + Detected Signals */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Heatmap */}
                <div className="sticky-note p-5 border border-ink/15">
                  <GridHeatmap
                    cells={r.gridHeatmap || []}
                    city={r.city}
                  />
                </div>

                {/* Detected Signals */}
                <div className="sticky-note p-5 border border-ink/15 flex flex-col gap-4">
                  <h4 className="font-hand text-[19px] text-ink flex items-center gap-1.5 border-b border-ink/10 pb-1">
                    <Search className="w-4 h-4 text-teal" /> Detected Signals
                  </h4>

                  {/* Phones */}
                  <div>
                    <span className="text-[11px] font-sans text-clay font-semibold uppercase tracking-wide flex items-center gap-1">
                      <Phone className="w-3 h-3" /> Phone Numbers
                    </span>
                    <div className="mt-1 flex flex-col gap-0.5">
                      {(r.signals?.phones?.length ?? 0) > 0 ? (
                        r.signals!.phones.map((p) => (
                          <span
                            key={p}
                            className="font-mono text-[12px] text-ink"
                          >
                            {p}
                          </span>
                        ))
                      ) : (
                        <span className="text-[12px] text-ink-soft font-sans italic">
                          None detected
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Addresses */}
                  <div>
                    <span className="text-[11px] font-sans text-clay font-semibold uppercase tracking-wide flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Addresses
                    </span>
                    <div className="mt-1 flex flex-col gap-0.5">
                      {(r.signals?.addresses?.length ?? 0) > 0 ? (
                        r.signals!.addresses.map((a) => (
                          <span
                            key={a}
                            className="font-sans text-[12px] text-ink leading-relaxed"
                          >
                            {a}
                          </span>
                        ))
                      ) : (
                        <span className="text-[12px] text-ink-soft font-sans italic">
                          None detected
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Page Title */}
                  <div>
                    <span className="text-[11px] font-sans text-clay font-semibold uppercase tracking-wide flex items-center gap-1">
                      <Globe className="w-3 h-3" /> Page Title
                    </span>
                    <p className="mt-1 font-sans text-[12px] text-ink leading-relaxed truncate">
                      {r.signals?.title || "—"}
                    </p>
                  </div>

                  {/* Meta Description */}
                  <div>
                    <span className="text-[11px] font-sans text-clay font-semibold uppercase tracking-wide flex items-center gap-1">
                      <Shield className="w-3 h-3" /> Meta Description
                    </span>
                    <p className="mt-1 font-sans text-[12px] text-ink-soft leading-relaxed line-clamp-2">
                      {r.signals?.description || "—"}
                    </p>
                  </div>

                  {/* Mobile & Schema stats */}
                  <div className="flex items-center gap-3 pt-2 border-t border-ink/5 text-[11px] font-sans text-ink-soft">
                    <span className="flex items-center gap-1">
                      <Smartphone className="w-3 h-3" />
                      Viewport: {r.signals?.hasViewport ? "✓" : "✗"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Code2 className="w-3 h-3" />
                      Schema blocks: {r.signals?.schemaBlockCount ?? 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Map className="w-3 h-3" />
                      Maps: {r.signals?.hasMapsEmbed ? "✓" : "✗"}
                    </span>
                  </div>
                </div>
              </div>

              {/* AI Recommendations */}
              {(r.recommendations?.length ?? 0) > 0 && (
                <div className="sticky-note p-5 border border-ink/15 flex flex-col gap-4">
                  <h4 className="font-hand text-[19px] text-ink flex items-center gap-1.5 border-b border-ink/10 pb-1">
                    <ArrowUpRight className="w-4 h-4 text-teal" /> AI
                    Recommendations
                  </h4>
                  <div className="flex flex-col gap-3">
                    {r.recommendations.map((rec, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-3 rounded-lg bg-paper/30 border border-ink/5"
                      >
                        <PriorityBadge priority={rec.priority} />
                        <div className="flex-1 min-w-0">
                          <span className="font-sans font-semibold text-[13px] text-ink">
                            {rec.title}
                          </span>
                          <p className="font-sans text-[12px] text-ink-soft leading-relaxed mt-0.5">
                            {rec.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Local Keywords Table */}
              {(r.localKeywords?.length ?? 0) > 0 && (
                <div className="sticky-note p-5 border border-ink/15 flex flex-col gap-4">
                  <h4 className="font-hand text-[19px] text-ink flex items-center gap-1.5 border-b border-ink/10 pb-1">
                    <Search className="w-4 h-4 text-teal" /> Local Keyword
                    Suggestions
                  </h4>
                  <div className="overflow-x-auto -mx-2">
                    <table className="w-full text-[12.5px] font-sans">
                      <thead>
                        <tr className="text-left text-clay border-b border-ink/10">
                          <th className="pb-2 pl-2 font-medium">Keyword</th>
                          <th className="pb-2 font-medium">Intent</th>
                          <th className="pb-2 font-medium">Difficulty</th>
                          <th className="pb-2 pr-2 font-medium text-right">
                            Est. Volume
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.localKeywords.map((kw, i) => (
                          <tr
                            key={i}
                            className="border-b border-ink/5 last:border-0 hover:bg-paper/40 transition-colors"
                          >
                            <td className="py-2 pl-2 text-ink font-medium">
                              {kw.keyword}
                            </td>
                            <td className="py-2">
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${
                                  kw.intent === "transactional"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : kw.intent === "commercial"
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : kw.intent === "navigational"
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : "bg-gray-50 text-gray-600 border-gray-200"
                                }`}
                              >
                                {kw.intent}
                              </span>
                            </td>
                            <td className="py-2">
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${
                                  kw.difficulty === "hard"
                                    ? "bg-red-50 text-red-700 border-red-200"
                                    : kw.difficulty === "medium"
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                }`}
                              >
                                {kw.difficulty}
                              </span>
                            </td>
                            <td className="py-2 pr-2 text-right font-mono text-ink-soft">
                              {kw.volume}/mo
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
