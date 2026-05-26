"use client";

import { useState } from "react";
import { Loader2, KeyRound, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

type Intent = "informational" | "navigational" | "commercial" | "transactional";

type KeywordRow = { keyword: string; intent: Intent; words: number; questionLike: boolean };
type Cluster = { name: string; keywords: string[] };

type ApiResponse = {
  seed: string;
  total: number;
  keywords: KeywordRow[];
  clusters: Cluster[];
  clusteringEnabled: boolean;
};

const INTENT_TONE: Record<Intent, string> = {
  informational: "bg-paper-200/70 text-ink",
  navigational: "bg-clay/20 text-clay",
  commercial: "bg-sunset/25 text-sunset",
  transactional: "bg-teal-accent/25 text-teal-dark",
};

export default function KeywordsPage() {
  const [seed, setSeed] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [filter, setFilter] = useState<"all" | Intent>("all");

  async function run() {
    if (!seed.trim()) {
      setError("Type a seed keyword first.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Expansion failed");
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const filtered = result
    ? filter === "all"
      ? result.keywords
      : result.keywords.filter((k) => k.intent === filter)
    : [];

  const intentCounts = result
    ? result.keywords.reduce<Record<Intent, number>>(
        (acc, k) => ({ ...acc, [k.intent]: (acc[k.intent] || 0) + 1 }),
        { informational: 0, navigational: 0, commercial: 0, transactional: 0 },
      )
    : null;

  return (
    <div className="px-8 sm:px-12 py-10 max-w-6xl">
      <PageHeader
        kicker="keywords"
        title="Keyword ideas, fast and free."
        subtitle="Google Autocomplete + question prefixes + Llama clustering. No DataForSEO bill, no API key required (beyond Groq for clusters)."
      />

      <div className="dotted-card p-5 sm:p-6 relative mb-8">
        <span className="font-hand text-clay text-[18px] absolute -top-3 left-5 bg-paper px-2">
          ~ seed ~
        </span>
        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <div className="flex-1 relative">
            <KeyRound
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/60"
              strokeWidth={2.2}
            />
            <input
              type="text"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              placeholder="e.g. yoga retreat, ai content writer, vibe coding"
              className="w-full pl-10 pr-3 py-3 rounded-lg bg-paper-50 border-2 border-ink/80 outline-none text-[14px] text-ink placeholder:text-ink/40 focus:ring-2 focus:ring-teal-accent/30 font-sans"
              onKeyDown={(e) => e.key === "Enter" && run()}
            />
          </div>
          <button
            onClick={run}
            disabled={loading}
            className="btn-led inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-hand text-[20px] shadow-[3px_3px_0_0_rgba(44,36,23,0.85)] disabled:opacity-60 disabled:cursor-not-allowed self-start"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> expanding...
              </>
            ) : (
              "Expand →"
            )}
          </button>
        </div>
        {error && (
          <div className="mt-4 flex items-start gap-2 text-[14px] text-sunset font-sans">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <p className="mt-4 font-sans text-[12.5px] text-ink-soft leading-relaxed">
          Suggestions pulled live from Google. No search-volume numbers (that's a paid API) — but every term is a real query someone is typing.
        </p>
      </div>

      {result && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
            <Stat label="Total ideas" value={String(result.total)} />
            {intentCounts &&
              (["informational", "commercial", "navigational", "transactional"] as Intent[]).map((i) => (
                <Stat key={i} label={i} value={String(intentCounts[i])} />
              ))}
          </div>

          {result.clusters.length > 0 && (
            <section className="mb-10">
              <p className="font-hand text-clay text-[16px] mb-2">~ topic clusters ~</p>
              <h2 className="font-hand text-[28px] text-ink leading-tight mb-5">
                Grouped by Llama 3.3
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.clusters.map((c, i) => (
                  <div
                    key={c.name + i}
                    className="sticky-note rounded-md p-4 border-2 border-ink/80"
                    style={{ transform: `rotate(${i % 2 === 0 ? -1 : 1}deg)` }}
                  >
                    <h3 className="font-hand text-[22px] text-ink leading-tight mb-2">
                      {c.name}
                    </h3>
                    <ul className="space-y-1">
                      {c.keywords.slice(0, 12).map((k) => (
                        <li key={k} className="font-sans text-[13px] text-ink-soft flex items-start gap-2">
                          <span className="text-teal-accent mt-0.5">•</span>
                          <span>{k}</span>
                        </li>
                      ))}
                      {c.keywords.length > 12 && (
                        <li className="font-hand text-[13px] text-clay">
                          + {c.keywords.length - 12} more
                        </li>
                      )}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}

          {!result.clusteringEnabled && (
            <div className="mb-8 p-4 dotted-card font-sans text-[13px] text-ink-soft">
              <strong>Llama clustering disabled.</strong> Add your <code>GROQ_API_KEY</code> to
              <code> .env.local</code> to group these ideas into topic clusters.
            </div>
          )}

          <section>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
              <p className="font-hand text-clay text-[16px]">~ all suggestions ~</p>
              <div className="flex flex-wrap gap-2">
                {(["all", "informational", "commercial", "transactional", "navigational"] as const).map(
                  (f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`font-hand text-[14px] px-3 py-1 rounded-full border-2 transition-colors ${
                        filter === f
                          ? "bg-paper border-ink text-ink"
                          : "border-ink/40 text-ink-soft hover:border-ink"
                      }`}
                    >
                      {f}
                    </button>
                  ),
                )}
              </div>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {filtered.map((k) => (
                <li
                  key={k.keyword}
                  className="bg-paper-50/70 border border-ink/30 rounded-md p-3 flex items-start justify-between gap-2"
                >
                  <span className="font-sans text-[13px] text-ink truncate">{k.keyword}</span>
                  <span
                    className={`font-hand text-[11px] rounded-full px-2 py-0.5 shrink-0 ${INTENT_TONE[k.intent]}`}
                  >
                    {k.intent}
                  </span>
                </li>
              ))}
            </ul>
            {filtered.length === 0 && (
              <p className="font-sans text-[13px] text-ink-soft">No keywords match this filter.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="sticky-note rounded-md p-3 border-2 border-ink/80">
      <div className="font-hand text-clay text-[12px] capitalize">{label}</div>
      <div className="font-hand text-[28px] text-ink leading-none mt-1">{value}</div>
    </div>
  );
}
