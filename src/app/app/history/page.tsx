"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Activity,
  Clock,
  Trash2,
  ExternalLink,
  RotateCw,
  AlertCircle,
  Cloud,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import {
  readHistory,
  clearHistory,
  deleteFromHistory,
  type StoredAudit,
} from "@/lib/auditContext";

type HistoryItem = StoredAudit & { id?: string };
type SourceFilter = "all" | "web" | "api";
type SortKey = "newest" | "oldest" | "worstPerf" | "bestPerf";

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

export default function HistoryPage() {
  const { status } = useSession();
  const authed = status === "authenticated";
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [source, setSource] = useState<SourceFilter>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [confirmClear, setConfirmClear] = useState(false);

  // Load from the cloud when signed in, else from localStorage.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (status === "loading") return;
      if (authed) {
        try {
          const res = await fetch("/api/me/audits");
          const data = await res.json();
          if (!cancelled && res.ok) setHistory(data.audits || []);
        } catch {
          if (!cancelled) setHistory([]);
        }
      } else {
        if (!cancelled) setHistory(readHistory());
      }
      if (!cancelled) setMounted(true);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [status, authed]);

  async function refresh() {
    if (authed) {
      try {
        const res = await fetch("/api/me/audits");
        const data = await res.json();
        if (res.ok) setHistory(data.audits || []);
      } catch {
        /* ignore */
      }
    } else {
      setHistory(readHistory());
    }
  }

  async function onDelete(item: HistoryItem) {
    if (authed && item.id) {
      await fetch(`/api/me/audits/${item.id}`, { method: "DELETE" }).catch(() => {});
      refresh();
    } else {
      deleteFromHistory(item.url, item.ranAt);
      setHistory(readHistory());
    }
  }

  async function onClearAll() {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 4000);
      return;
    }
    if (authed) {
      await fetch("/api/me/audits", { method: "DELETE" }).catch(() => {});
      refresh();
    } else {
      clearHistory();
      setHistory(readHistory());
    }
    setConfirmClear(false);
  }

  const filtered = useMemo(() => {
    let list = source === "all" ? history : history.filter((h) => h.sourceType === source);
    if (sort === "newest") list = [...list].sort((a, b) => b.ranAt - a.ranAt);
    else if (sort === "oldest") list = [...list].sort((a, b) => a.ranAt - b.ranAt);
    else if (sort === "worstPerf")
      list = [...list].sort((a, b) => (a.scores?.performance ?? 200) - (b.scores?.performance ?? 200));
    else if (sort === "bestPerf")
      list = [...list].sort((a, b) => (b.scores?.performance ?? -1) - (a.scores?.performance ?? -1));
    return list;
  }, [history, source, sort]);

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-20 sm:pt-10 pb-10 max-w-6xl">
      <PageHeader
        kicker="audit history"
        title="Everything you've audited."
        subtitle={
          authed
            ? "Synced to your account — your last 50 audits, available on any device. Re-run any URL, share a link, or wipe the slate."
            : "Your last 10 audits, kept locally in this browser. Sign in to sync them to your account across devices."
        }
      />

      <div className="dotted-card p-4 sm:p-5 relative mb-8">
        <span className="font-hand text-clay text-[18px] absolute -top-3 left-5 bg-paper px-2">
          ~ filters ~
        </span>
        <div className="flex flex-wrap gap-2 mt-2">
          {(["all", "web", "api"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setSource(f)}
              className={`font-hand text-[14px] px-3 py-1 rounded-full border-2 transition-colors capitalize ${
                source === f
                  ? "bg-paper border-ink text-ink"
                  : "border-ink/40 text-ink-soft hover:border-ink"
              }`}
            >
              {f === "all" ? "all sources" : f === "web" ? "web only" : "JSON APIs only"}
            </button>
          ))}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="font-hand text-[14px] px-3 py-1 rounded-full border-2 border-ink/40 bg-paper text-ink-soft hover:border-ink ml-auto"
          >
            <option value="newest">sort: newest first</option>
            <option value="oldest">sort: oldest first</option>
            <option value="worstPerf">sort: worst performance</option>
            <option value="bestPerf">sort: best performance</option>
          </select>
          {history.length > 0 && (
            <button
              onClick={onClearAll}
              className={`font-hand text-[14px] px-3 py-1 rounded-full border-2 transition-colors inline-flex items-center gap-1.5 ${
                confirmClear
                  ? "bg-sunset/20 border-sunset text-sunset"
                  : "border-ink/40 text-ink-soft hover:border-sunset hover:text-sunset"
              }`}
            >
              {confirmClear ? <AlertCircle className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
              {confirmClear ? "tap again to wipe" : "clear all"}
            </button>
          )}
        </div>
        <p className="font-sans text-[12.5px] text-ink-soft mt-3 leading-relaxed inline-flex items-center gap-1.5">
          {authed ? (
            <>
              <Cloud className="w-3.5 h-3.5 text-teal-accent" /> Synced to your account.
            </>
          ) : (
            <>Saved to your browser as <code>seo-engine:audit-history</code>. Sign in to sync across devices.</>
          )}
        </p>
      </div>

      {mounted && filtered.length === 0 ? (
        <div className="dotted-card p-8 text-center">
          <Activity className="w-8 h-8 mx-auto text-ink-soft mb-3" strokeWidth={1.6} />
          <p className="font-hand text-[22px] text-ink mb-2">
            {history.length === 0 ? "Nothing here yet." : "No audits match this filter."}
          </p>
          <p className="font-sans text-[13px] text-ink-soft mb-4">
            {history.length === 0
              ? "Run an audit and it lands here automatically."
              : "Try a different filter combo above."}
          </p>
          {history.length === 0 && (
            <Link
              href="/app/site-audit"
              className="btn-led inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 font-hand text-[16px] shadow-[3px_3px_0_0_rgba(44,36,23,0.85)]"
            >
              Run your first audit →
            </Link>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((a) => (
            <li
              key={`${a.url}-${a.ranAt}`}
              className="sticky-note rounded-md p-4 border-2 border-ink/80 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <span className="w-10 h-10 shrink-0 rounded-full bg-paper border-2 border-ink/85 flex items-center justify-center">
                <Activity className="w-4 h-4 text-ink" strokeWidth={2} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-sans text-[13.5px] text-ink truncate">{a.url}</p>
                <p className="font-hand text-[13px] text-clay inline-flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-3 h-3" />
                  {timeAgo(a.ranAt)} · {a.sourceType === "api" ? "JSON API" : "web page"}
                  {a.onPage && ` · ${a.onPage.words} words`}
                </p>
              </div>
              {a.scores && (
                <div className="flex gap-1.5 shrink-0 flex-wrap">
                  <ScorePill label="perf" value={a.scores.performance} />
                  <ScorePill label="seo" value={a.scores.seo} />
                  <ScorePill label="a11y" value={a.scores.accessibility} />
                  <ScorePill label="BP" value={a.scores.bestPractices} />
                </div>
              )}
              <div className="flex gap-1.5 shrink-0">
                <Link
                  href={`/app/site-audit?url=${encodeURIComponent(a.url)}`}
                  aria-label="re-run audit"
                  title="re-run audit"
                  className="p-2 rounded-md border-2 border-ink/40 text-ink-soft hover:border-ink hover:text-ink"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </Link>
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="open URL"
                  title="open URL"
                  className="p-2 rounded-md border-2 border-ink/40 text-ink-soft hover:border-ink hover:text-ink"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => onDelete(a)}
                  aria-label="remove from history"
                  title="remove"
                  className="p-2 rounded-md border-2 border-ink/40 text-ink-soft hover:border-sunset hover:text-sunset"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ScorePill({ label, value }: { label: string; value: number }) {
  return (
    <span
      className="font-hand text-[11.5px] rounded-full px-2 py-0.5 border tabular-nums"
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
