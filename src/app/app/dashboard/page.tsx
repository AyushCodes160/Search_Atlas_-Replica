"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { readHistory, type StoredAudit } from "@/lib/auditContext";
import {
  Activity,
  Layers,
  Swords,
  KeyRound,
  Wand2,
  Bot,
  Pencil,
  TrendingUp,
  MapPin,
  Link2,
  Eye,
  Megaphone,
  FileBarChart2,
  Clock,
} from "lucide-react";

const QUICK_LINKS = [
  { label: "Site Audit", href: "/app/site-audit", Icon: Activity, ready: true, note: "Lighthouse + Llama" },
  { label: "Bulk Audit", href: "/app/bulk-audit", Icon: Layers, ready: true, note: "Up to 10 URLs · CSV export" },
  { label: "Competitor Audit", href: "/app/competitor-audit", Icon: Swords, ready: true, note: "You vs them, side by side" },
  { label: "Keywords", href: "/app/keywords", Icon: KeyRound, ready: true, note: "Free Autocomplete + Llama" },
  { label: "Atlas Agent", href: "/app/atlas-agent", Icon: Bot, ready: true, note: "Llama chat" },
  { label: "OTTO SEO", href: "/app/otto-seo", Icon: Wand2, ready: false, note: "Needs OAuth" },
  { label: "Content", href: "/app/content", Icon: Pencil, ready: true, note: "Llama-powered writer" },
  { label: "Rank Tracker", href: "/app/rank-tracker", Icon: TrendingUp, ready: false, note: "Needs SerpAPI" },
  { label: "Local SEO", href: "/app/local-seo", Icon: MapPin, ready: false, note: "Needs GBP OAuth" },
  { label: "Backlinks", href: "/app/backlinks", Icon: Link2, ready: false, note: "Needs Ahrefs" },
  { label: "LLM Visibility", href: "/app/llm-visibility", Icon: Eye, ready: false, note: "ChatGPT/Claude/Gemini" },
  { label: "Smart Ads", href: "/app/smart-ads", Icon: Megaphone, ready: false, note: "Needs Google Ads OAuth" },
  { label: "Reports", href: "/app/reports", Icon: FileBarChart2, ready: false, note: "Pulls all sources" },
];

const KEYWORD_LISTS_KEY = "seo-engine:keyword-lists";

type SavedKeywordList = {
  id: string;
  seed: string;
  savedAt: number;
  data: { total: number };
};

function avgPerformance(history: StoredAudit[]): number | null {
  const scored = history.filter((h) => h.scores).slice(0, 5);
  if (scored.length === 0) return null;
  const sum = scored.reduce((a, h) => a + (h.scores?.performance ?? 0), 0);
  return Math.round(sum / scored.length);
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const m = Math.round(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

function scoreColor(s: number): string {
  if (s >= 90) return "#6b7a3f";
  if (s >= 50) return "#d97706";
  return "#dc2626";
}

export default function DashboardPage() {
  const [history, setHistory] = useState<StoredAudit[]>([]);
  const [keywordLists, setKeywordLists] = useState<SavedKeywordList[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setHistory(readHistory());
    try {
      const raw = localStorage.getItem(KEYWORD_LISTS_KEY);
      if (raw) setKeywordLists(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setMounted(true);
  }, []);

  const avgPerf = avgPerformance(history);
  const totalKeywordIdeas = keywordLists.reduce((a, l) => a + (l.data?.total ?? 0), 0);

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-20 sm:pt-10 pb-10 max-w-6xl">
      <PageHeader
        kicker="dashboard"
        title="Welcome back."
        subtitle="Pick a module from the sidebar or jump straight in from below. Modules tagged 'soon' need paid APIs or OAuth that aren't wired yet."
      />

      {/* Stats — pulled from localStorage. Empty state shows the placeholders until the user runs something. */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        <Stat
          label="Audits run"
          value={mounted ? String(history.length) : "—"}
          hint={history.length === 0 ? "run your first audit" : history.length < 10 ? "history (max 10)" : "history full — older drops off"}
        />
        <Stat
          label="Avg performance"
          value={avgPerf !== null ? String(avgPerf) : "—"}
          hint={avgPerf !== null ? "across last 5 audits" : "needs a recent audit"}
          accent={avgPerf !== null ? scoreColor(avgPerf) : undefined}
        />
        <Stat
          label="Keyword lists"
          value={mounted ? String(keywordLists.length) : "—"}
          hint={
            keywordLists.length === 0
              ? "save a list from Keywords"
              : `${totalKeywordIdeas.toLocaleString()} ideas saved`
          }
        />
        <Stat label="LLM mentions" value="—" hint="needs LLM Visibility (soon)" />
      </section>

      {/* Recent audits — only shown when something exists. */}
      {history.length > 0 && (
        <section className="mb-12">
          <p className="font-hand text-clay text-[16px] mb-2">~ recent audits ~</p>
          <h2 className="font-hand text-[28px] text-ink leading-tight mb-5">
            Last {history.length} you ran.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {history.slice(0, 6).map((a) => (
              <Link
                key={a.url + a.ranAt}
                href="/app/site-audit"
                className="sticky-note rounded-md p-3 border-2 border-ink/80 flex items-start gap-3 hover:-translate-y-0.5 transition-transform"
              >
                <span className="w-9 h-9 shrink-0 rounded-full bg-paper border-2 border-ink/85 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-ink" strokeWidth={2} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-[13px] text-ink truncate">{a.url}</p>
                  <p className="font-hand text-[12.5px] text-clay inline-flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" /> {timeAgo(a.ranAt)} · {a.sourceType === "api" ? "JSON API" : "web"}
                  </p>
                </div>
                {a.scores && (
                  <div className="flex gap-1.5 shrink-0">
                    <ScorePill label="P" value={a.scores.performance} />
                    <ScorePill label="S" value={a.scores.seo} />
                  </div>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Saved keyword lists — same treatment. */}
      {keywordLists.length > 0 && (
        <section className="mb-12">
          <p className="font-hand text-clay text-[16px] mb-2">~ saved keyword lists ~</p>
          <h2 className="font-hand text-[28px] text-ink leading-tight mb-5">
            {keywordLists.length} {keywordLists.length === 1 ? "list" : "lists"} on file.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {keywordLists.slice(0, 6).map((l) => (
              <Link
                key={l.id}
                href="/app/keywords"
                className="sticky-note rounded-md p-3 border-2 border-ink/80 flex items-start gap-3 hover:-translate-y-0.5 transition-transform"
              >
                <span className="w-9 h-9 shrink-0 rounded-full bg-paper border-2 border-ink/85 flex items-center justify-center">
                  <KeyRound className="w-4 h-4 text-ink" strokeWidth={2} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-hand text-[17px] text-ink leading-tight truncate">{l.seed}</p>
                  <p className="font-sans text-[12px] text-ink-soft">
                    {l.data?.total ?? 0} ideas · saved {timeAgo(l.savedAt)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Module grid */}
      <section className="mb-12">
        <p className="font-hand text-clay text-[16px] mb-2">~ modules ~</p>
        <h2 className="font-hand text-[28px] text-ink leading-tight mb-6">
          Thirteen tools, one toolkit.
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {QUICK_LINKS.map((m) => (
            <ModuleCard key={m.href} {...m} />
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: string;
}) {
  return (
    <div className="sticky-note rounded-md p-4 border-2 border-ink/80">
      <div className="font-hand text-clay text-[13px] mb-1">{label}</div>
      <div
        className="font-hand text-[36px] leading-none mb-1.5"
        style={{ color: accent ?? "var(--color-ink, #2c2417)" }}
      >
        {value}
      </div>
      <div className="font-sans text-[11.5px] text-ink-soft">{hint}</div>
    </div>
  );
}

function ScorePill({ label, value }: { label: string; value: number }) {
  return (
    <span
      className="font-hand text-[11px] rounded-full px-1.5 py-0.5 border"
      style={{
        color: scoreColor(value),
        borderColor: scoreColor(value),
        backgroundColor: `${scoreColor(value)}14`,
      }}
    >
      {label} {value}
    </span>
  );
}

function ModuleCard({
  label,
  href,
  Icon,
  ready,
  note,
}: {
  label: string;
  href: string;
  Icon: typeof Activity;
  ready: boolean;
  note: string;
}) {
  return (
    <Link
      href={href}
      className={`sticky-note rounded-md p-5 border-2 border-ink/80 flex flex-col gap-2 ${ready ? "" : "opacity-90"}`}
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-paper border-2 border-ink/85">
          <Icon className="w-4 h-4 text-ink" strokeWidth={2} />
        </span>
        {!ready && (
          <span className="font-hand text-[12px] text-clay border border-ink/30 rounded-full px-2 py-0.5">
            soon
          </span>
        )}
      </div>
      <h3 className="font-hand text-[22px] text-ink leading-tight">{label}</h3>
      <p className="font-sans text-[12.5px] text-ink-soft leading-relaxed">{note}</p>
    </Link>
  );
}
