"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Network,
  Clock,
  Trash2,
  AlertCircle,
  Cloud,
  Gauge,
  FileStack,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

const CRAWL_STORE = "seo-engine:site-crawls";

type CrawlItem = {
  id: string;
  origin: string;
  pages: number;
  mode: "fast" | "deep";
  healthScore: number | null;
  summary: string | null;
  ranAt: number;
};

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

function host(origin: string): string {
  try {
    return new URL(origin).host.replace(/^www\./, "");
  } catch {
    return origin;
  }
}

// Strip light markdown so the summary excerpt reads as plain text.
function plain(s: string): string {
  return s
    .replace(/[#*_`>~]/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function readLocal(): CrawlItem[] {
  try {
    const raw = localStorage.getItem(CRAWL_STORE);
    return raw ? (JSON.parse(raw) as CrawlItem[]) : [];
  } catch {
    return [];
  }
}

export default function CrawlHistoryPage() {
  const { status } = useSession();
  const authed = status === "authenticated";
  const [crawls, setCrawls] = useState<CrawlItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (status === "loading") return;
      if (authed) {
        try {
          const res = await fetch("/api/me/crawls");
          const data = await res.json();
          if (!cancelled && res.ok) setCrawls(data.crawls || []);
        } catch {
          if (!cancelled) setCrawls([]);
        }
      } else {
        if (!cancelled) setCrawls(readLocal());
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
        const res = await fetch("/api/me/crawls");
        const data = await res.json();
        if (res.ok) setCrawls(data.crawls || []);
      } catch {
        /* ignore */
      }
    } else {
      setCrawls(readLocal());
    }
  }

  async function onDelete(item: CrawlItem) {
    if (authed) {
      await fetch(`/api/me/crawls/${item.id}`, { method: "DELETE" }).catch(() => {});
      refresh();
    } else {
      const next = readLocal().filter((c) => c.id !== item.id);
      localStorage.setItem(CRAWL_STORE, JSON.stringify(next));
      setCrawls(next);
    }
  }

  async function onClearAll() {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 4000);
      return;
    }
    if (authed) {
      await fetch("/api/me/crawls", { method: "DELETE" }).catch(() => {});
      refresh();
    } else {
      localStorage.removeItem(CRAWL_STORE);
      setCrawls([]);
    }
    setConfirmClear(false);
  }

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-20 sm:pt-10 pb-10 max-w-6xl">
      <PageHeader
        kicker="crawl history"
        title="Every site you've crawled."
        subtitle={
          authed
            ? "Synced to your account — your last 30 whole-site audits, available on any device."
            : "Your last 20 whole-site audits, kept locally in this browser. Sign in to sync them across devices."
        }
      />

      <div className="dotted-card p-4 sm:p-5 relative mb-8">
        <span className="font-hand text-clay text-[18px] absolute -top-3 left-5 bg-paper-50 px-2">
          ~ saved crawls ~
        </span>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <Link
            href="/app/site-crawl"
            className="font-hand text-[14px] px-3 py-1 rounded-full border border-ink/15 text-ink-soft hover:border-ink hover:text-ink inline-flex items-center gap-1.5"
          >
            <Network className="w-3.5 h-3.5" /> new whole-site audit
          </Link>
          {crawls.length > 0 && (
            <button
              onClick={onClearAll}
              className={`font-hand text-[14px] px-3 py-1 rounded-full border-2 transition-colors inline-flex items-center gap-1.5 ml-auto ${
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
            <>Saved to your browser as <code>{CRAWL_STORE}</code>. Sign in to sync across devices.</>
          )}
        </p>
      </div>

      {mounted && crawls.length === 0 ? (
        <div className="dotted-card p-8 text-center">
          <Network className="w-8 h-8 mx-auto text-ink-soft mb-3" strokeWidth={1.6} />
          <p className="font-hand text-[22px] text-ink mb-2">No crawls yet.</p>
          <p className="font-sans text-[13px] text-ink-soft mb-4">
            Run a whole-site audit and it lands here automatically.
          </p>
          <Link
            href="/app/site-crawl"
            className="btn-led inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 font-hand text-[16px] shadow-md"
          >
            Crawl your first site →
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {crawls.map((c) => (
            <li
              key={c.id}
              className="sticky-note rounded-md p-4 border border-ink/20 flex flex-col gap-3"
            >
              <div className="flex items-start gap-3">
                <span className="w-10 h-10 shrink-0 rounded-full bg-paper border border-ink/20 flex items-center justify-center">
                  <Network className="w-4 h-4 text-ink" strokeWidth={2} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-[14px] text-ink truncate">{host(c.origin)}</p>
                  <p className="font-hand text-[13px] text-clay inline-flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <Clock className="w-3 h-3" />
                    {timeAgo(c.ranAt)}
                    <span className="inline-flex items-center gap-1">
                      <FileStack className="w-3 h-3" /> {c.pages} pages
                    </span>
                    <span className="rounded-full border border-ink/30 px-1.5 capitalize">
                      {c.mode} scan
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {c.healthScore !== null && (
                    <span
                      className="font-hand text-[13px] rounded-full px-2.5 py-0.5 border tabular-nums inline-flex items-center gap-1"
                      style={{
                        color: scoreColor(c.healthScore),
                        borderColor: scoreColor(c.healthScore),
                        backgroundColor: `${scoreColor(c.healthScore)}14`,
                      }}
                    >
                      <Gauge className="w-3 h-3" /> {c.healthScore}
                    </span>
                  )}
                  <button
                    onClick={() => onDelete(c)}
                    aria-label="remove crawl"
                    title="remove"
                    className="p-2 rounded-md border border-ink/15 text-ink-soft hover:border-sunset hover:text-sunset"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {c.summary && (
                <p className="font-sans text-[12.5px] text-ink-soft leading-relaxed line-clamp-3 pl-[52px]">
                  {plain(c.summary)}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
