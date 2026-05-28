"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2, KeyRound, AlertCircle, Download, Save, Trash2, FolderOpen, Cloud } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

type Intent = "informational" | "navigational" | "commercial" | "transactional";
type DifficultyLabel = "easy" | "medium" | "hard";

type KeywordRow = {
  keyword: string;
  intent: Intent;
  words: number;
  questionLike: boolean;
  difficulty: number;
  difficultyLabel: DifficultyLabel;
};
type Cluster = { name: string; keywords: string[] };

type ApiResponse = {
  seed: string;
  total: number;
  keywords: KeywordRow[];
  clusters: Cluster[];
  clusteringEnabled: boolean;
};

type SavedList = {
  id: string;
  seed: string;
  savedAt: number;
  data: ApiResponse;
};

const STORAGE_KEY = "seo-engine:keyword-lists";

const INTENT_TONE: Record<Intent, string> = {
  informational: "bg-paper-200/70 text-ink",
  navigational: "bg-clay/20 text-clay",
  commercial: "bg-sunset/25 text-sunset",
  transactional: "bg-teal-accent/25 text-teal-dark",
};

const DIFF_TONE: Record<DifficultyLabel, string> = {
  easy: "bg-leaf/25 text-leaf-dark border-leaf/40",
  medium: "bg-sunset/20 text-sunset border-sunset/40",
  hard: "bg-clay/25 text-clay border-clay/40",
};

export default function KeywordsPage() {
  const { status } = useSession();
  const authed = status === "authenticated";
  const [seed, setSeed] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [filter, setFilter] = useState<"all" | Intent>("all");
  const [longTailOnly, setLongTailOnly] = useState(false);
  const [questionsOnly, setQuestionsOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"default" | "diffAsc" | "diffDesc" | "wordsDesc">("default");
  const [saved, setSaved] = useState<SavedList[]>([]);
  const [showSaved, setShowSaved] = useState(false);

  // Load saved lists from the cloud when signed in, else from localStorage.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (status === "loading") return;
      if (authed) {
        try {
          const res = await fetch("/api/me/keyword-lists");
          const data = await res.json();
          if (!cancelled && res.ok) setSaved(data.lists || []);
        } catch {
          /* ignore */
        }
      } else {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (!cancelled && raw) setSaved(JSON.parse(raw));
        } catch {
          /* ignore */
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [status, authed]);

  async function refreshSaved() {
    if (!authed) return;
    try {
      const res = await fetch("/api/me/keyword-lists");
      const data = await res.json();
      if (res.ok) setSaved(data.lists || []);
    } catch {
      /* ignore */
    }
  }

  function persistLocal(next: SavedList[]) {
    setSaved(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

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

  async function saveCurrent() {
    if (!result) return;
    if (authed) {
      await fetch("/api/me/keyword-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seed: result.seed, total: result.total, data: result }),
      }).catch(() => {});
      refreshSaved();
    } else {
      const entry: SavedList = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        seed: result.seed,
        savedAt: Date.now(),
        data: result,
      };
      persistLocal([entry, ...saved].slice(0, 25));
    }
  }

  function loadSaved(s: SavedList) {
    setSeed(s.seed);
    setResult(s.data);
    setShowSaved(false);
    setError(null);
  }

  async function deleteSaved(id: string) {
    if (authed) {
      await fetch(`/api/me/keyword-lists/${id}`, { method: "DELETE" }).catch(() => {});
      refreshSaved();
    } else {
      persistLocal(saved.filter((s) => s.id !== id));
    }
  }

  function exportCsv() {
    if (!result) return;
    const header = ["keyword", "intent", "words", "question", "difficulty", "difficulty_label"];
    const rows = result.keywords.map((k) => [
      `"${k.keyword.replace(/"/g, '""')}"`,
      k.intent,
      String(k.words),
      k.questionLike ? "yes" : "no",
      String(k.difficulty),
      k.difficultyLabel,
    ]);
    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `keywords-${result.seed.replace(/\s+/g, "-")}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = useMemo(() => {
    if (!result) return [];
    let list = filter === "all" ? result.keywords : result.keywords.filter((k) => k.intent === filter);
    if (longTailOnly) list = list.filter((k) => k.words >= 4);
    if (questionsOnly) list = list.filter((k) => k.questionLike);
    if (sortBy === "diffAsc") list = [...list].sort((a, b) => a.difficulty - b.difficulty);
    else if (sortBy === "diffDesc") list = [...list].sort((a, b) => b.difficulty - a.difficulty);
    else if (sortBy === "wordsDesc") list = [...list].sort((a, b) => b.words - a.words);
    return list;
  }, [result, filter, longTailOnly, questionsOnly, sortBy]);

  const intentCounts = result
    ? result.keywords.reduce<Record<Intent, number>>(
        (acc, k) => ({ ...acc, [k.intent]: (acc[k.intent] || 0) + 1 }),
        { informational: 0, navigational: 0, commercial: 0, transactional: 0 },
      )
    : null;

  const diffCounts = result
    ? result.keywords.reduce<Record<DifficultyLabel, number>>(
        (acc, k) => ({ ...acc, [k.difficultyLabel]: (acc[k.difficultyLabel] || 0) + 1 }),
        { easy: 0, medium: 0, hard: 0 },
      )
    : null;

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-20 sm:pt-10 pb-10 max-w-6xl">
      <PageHeader
        kicker="keywords"
        title="Keyword ideas, fast and free."
        subtitle="Google Autocomplete + question prefixes + Llama clustering + heuristic difficulty. No DataForSEO bill, no API key required (beyond Groq for clusters)."
      />

      <div className="dotted-card p-5 sm:p-6 relative mb-8">
        <span className="font-hand text-clay text-[18px] absolute -top-3 left-5 bg-paper-50 px-2">
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
              className="w-full pl-10 pr-3 py-3 rounded-lg bg-paper-50 border border-ink/20 outline-none text-[14px] text-ink placeholder:text-ink/40 focus:ring-2 focus:ring-teal-accent/30 font-sans"
              onKeyDown={(e) => e.key === "Enter" && run()}
            />
          </div>
          <button
            onClick={run}
            disabled={loading}
            className="btn-led inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-hand text-[20px] shadow-md disabled:opacity-60 disabled:cursor-not-allowed self-start"
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
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowSaved((v) => !v)}
            className="font-hand text-[14px] inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-ink/15 text-ink-soft hover:border-ink"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            saved ({saved.length})
          </button>
          {result && (
            <>
              <button
                onClick={saveCurrent}
                className="font-hand text-[14px] inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-ink/15 text-ink-soft hover:border-ink"
              >
                <Save className="w-3.5 h-3.5" />
                save list
              </button>
              <button
                onClick={exportCsv}
                className="font-hand text-[14px] inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-ink/15 text-ink-soft hover:border-ink"
              >
                <Download className="w-3.5 h-3.5" />
                export CSV
              </button>
            </>
          )}
        </div>
        {error && (
          <div className="mt-4 flex items-start gap-2 text-[14px] text-sunset font-sans">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {showSaved && (
          <div className="mt-4 border-t border-ink/10 pt-4">
            {saved.length === 0 ? (
              <p className="font-sans text-[13px] text-ink-soft">No saved lists yet. Run an expansion, then hit “save list”.</p>
            ) : (
              <ul className="space-y-2">
                {saved.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-3 p-2 rounded-md bg-paper-50/70 border border-ink/20"
                  >
                    <button
                      onClick={() => loadSaved(s)}
                      className="text-left flex-1"
                    >
                      <div className="font-hand text-[17px] text-ink leading-tight">{s.seed}</div>
                      <div className="font-sans text-[11.5px] text-ink-soft">
                        {s.data.total} ideas · saved {new Date(s.savedAt).toLocaleDateString()}
                      </div>
                    </button>
                    <button
                      onClick={() => deleteSaved(s.id)}
                      aria-label={`delete ${s.seed}`}
                      className="p-1.5 rounded-md border border-ink/30 hover:border-sunset hover:text-sunset text-ink-soft"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <p className="mt-4 font-sans text-[12.5px] text-ink-soft leading-relaxed">
          Suggestions pulled live from Google. No search-volume numbers (that's a paid API) — but every term is a real query someone is typing.
        </p>
      </div>

      {result && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
            <Stat label="total" value={String(result.total)} />
            {diffCounts &&
              (["easy", "medium", "hard"] as DifficultyLabel[]).map((d) => (
                <Stat key={d} label={d} value={String(diffCounts[d])} />
              ))}
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
                    className="sticky-note rounded-md p-4 border border-ink/20"
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
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <button
                onClick={() => setLongTailOnly((v) => !v)}
                className={`font-hand text-[13px] px-3 py-1 rounded-full border-2 transition-colors ${
                  longTailOnly
                    ? "bg-paper border-ink text-ink"
                    : "border-ink/40 text-ink-soft hover:border-ink"
                }`}
              >
                long-tail only (4+ words)
              </button>
              <button
                onClick={() => setQuestionsOnly((v) => !v)}
                className={`font-hand text-[13px] px-3 py-1 rounded-full border-2 transition-colors ${
                  questionsOnly
                    ? "bg-paper border-ink text-ink"
                    : "border-ink/40 text-ink-soft hover:border-ink"
                }`}
              >
                questions only
              </button>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="font-hand text-[13px] px-3 py-1 rounded-full border border-ink/15 bg-paper text-ink-soft hover:border-ink"
              >
                <option value="default">sort: default</option>
                <option value="diffAsc">sort: easiest first</option>
                <option value="diffDesc">sort: hardest first</option>
                <option value="wordsDesc">sort: longest first</option>
              </select>
              <span className="font-sans text-[12.5px] text-ink-soft ml-auto">
                showing {filtered.length} / {result.total}
              </span>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {filtered.map((k) => (
                <li
                  key={k.keyword}
                  className="bg-paper-50/70 border border-ink/30 rounded-md p-3 flex flex-col gap-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-sans text-[13px] text-ink truncate">{k.keyword}</span>
                    <span
                      className={`font-hand text-[11px] rounded-full px-2 py-0.5 shrink-0 ${INTENT_TONE[k.intent]}`}
                    >
                      {k.intent}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-sans">
                    <span className={`px-1.5 py-0.5 rounded border ${DIFF_TONE[k.difficultyLabel]}`}>
                      {k.difficultyLabel} · {k.difficulty}
                    </span>
                    <span className="text-ink-soft">{k.words} words{k.questionLike ? " · ?" : ""}</span>
                  </div>
                </li>
              ))}
            </ul>
            {filtered.length === 0 && (
              <p className="font-sans text-[13px] text-ink-soft">No keywords match these filters.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="sticky-note rounded-md p-3 border border-ink/20">
      <div className="font-hand text-clay text-[12px] capitalize">{label}</div>
      <div className="font-hand text-[28px] text-ink leading-none mt-1">{value}</div>
    </div>
  );
}
