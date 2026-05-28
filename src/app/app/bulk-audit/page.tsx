"use client";

import { useMemo, useState } from "react";
import {
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Download,
  Layers,
  ShieldAlert,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

const MAX_URLS = 10;
const CONCURRENCY = 2;

type RowStatus = "queued" | "running" | "done" | "error";

type Row = {
  url: string;
  status: RowStatus;
  scores?: { performance: number; seo: number; accessibility: number; bestPractices: number };
  metrics?: { lcp: string; cls: string; fcp: string; tbt: string; speedIndex: string };
  sourceType?: "web" | "api";
  error?: string;
  blocked?: boolean;
};

function parseUrls(text: string): string[] {
  const raw = text
    .split(/\r?\n|,/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_URLS);
  const valid: string[] = [];
  const seen = new Set<string>();
  for (const u of raw) {
    try {
      const url = new URL(u.startsWith("http") ? u : `https://${u}`).toString();
      if (!seen.has(url)) {
        seen.add(url);
        valid.push(url);
      }
    } catch {
      /* skip */
    }
  }
  return valid;
}

function scoreColor(s: number): string {
  if (s >= 90) return "text-leaf-dark";
  if (s >= 50) return "text-sunset";
  return "text-red-600";
}

function scoreCellBg(s: number): string {
  if (s >= 90) return "bg-leaf/20";
  if (s >= 50) return "bg-sunset/20";
  return "bg-red-500/15";
}

async function runAudit(url: string): Promise<Partial<Row>> {
  try {
    const res = await fetch("/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { status: "error", error: data.error || `HTTP ${res.status}` };
    }
    if (data.isBlockedByFirewall) {
      const who = data.blockVendor ? ` (${data.blockVendor})` : "";
      return { status: "error", blocked: true, error: `Blocked by firewall${who} — HTTP ${data.blockStatus || "challenge"}` };
    }
    if (data.sourceType === "api") {
      return { status: "done", sourceType: "api", error: undefined };
    }
    return {
      status: "done",
      sourceType: "web",
      scores: data.scores,
      metrics: data.metrics,
    };
  } catch (e: unknown) {
    return { status: "error", error: e instanceof Error ? e.message : "Request failed" };
  }
}

export default function BulkAuditPage() {
  const [text, setText] = useState(
    "https://www.gotoretreats.com/\nhttps://app.aibridge.one/",
  );
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);

  const stats = useMemo(() => {
    const done = rows.filter((r) => r.status === "done").length;
    const errored = rows.filter((r) => r.status === "error").length;
    const inflight = rows.filter((r) => r.status === "running").length;
    const queued = rows.filter((r) => r.status === "queued").length;
    return { total: rows.length, done, errored, inflight, queued };
  }, [rows]);

  async function start() {
    const urls = parseUrls(text);
    if (urls.length === 0) return;
    const initial: Row[] = urls.map((u) => ({ url: u, status: "queued" }));
    setRows(initial);
    setRunning(true);

    let idx = 0;

    async function worker() {
      while (idx < urls.length) {
        const myIdx = idx++;
        if (myIdx >= urls.length) break;
        setRows((prev) => {
          const next = [...prev];
          next[myIdx] = { ...next[myIdx], status: "running" };
          return next;
        });
        const result = await runAudit(urls[myIdx]);
        setRows((prev) => {
          const next = [...prev];
          next[myIdx] = { ...next[myIdx], ...result };
          return next;
        });
      }
    }

    const workers = Array.from({ length: Math.min(CONCURRENCY, urls.length) }, () =>
      worker(),
    );
    await Promise.all(workers);
    setRunning(false);
  }

  function exportCsv() {
    const header = [
      "URL",
      "Source",
      "Performance",
      "SEO",
      "Accessibility",
      "Best Practices",
      "LCP",
      "CLS",
      "FCP",
      "TBT",
      "Speed Index",
      "Status",
      "Error",
    ];
    const lines = [header.join(",")];
    for (const r of rows) {
      const row = [
        `"${r.url}"`,
        r.sourceType ?? "",
        r.scores?.performance ?? "",
        r.scores?.seo ?? "",
        r.scores?.accessibility ?? "",
        r.scores?.bestPractices ?? "",
        `"${r.metrics?.lcp ?? ""}"`,
        `"${r.metrics?.cls ?? ""}"`,
        `"${r.metrics?.fcp ?? ""}"`,
        `"${r.metrics?.tbt ?? ""}"`,
        `"${r.metrics?.speedIndex ?? ""}"`,
        r.status,
        `"${(r.error ?? "").replace(/"/g, "'")}"`,
      ];
      lines.push(row.join(","));
    }
    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bulk-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const sortedRows = useMemo(() => {
    if (rows.every((r) => r.status === "queued")) return rows;
    return [...rows].sort((a, b) => {
      const aScore = a.scores?.performance ?? -1;
      const bScore = b.scores?.performance ?? -1;
      if (a.status !== "done" && b.status === "done") return 1;
      if (b.status !== "done" && a.status === "done") return -1;
      return aScore - bScore;
    });
  }, [rows]);

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-20 sm:pt-10 pb-10 max-w-6xl">
      <PageHeader
        kicker="bulk audit"
        title="Audit ten URLs at once."
        subtitle="Paste up to 10 URLs (one per line). Two run in parallel. JSON APIs auto-skip Lighthouse and only count as completed. Export the result as CSV when you're done."
      />

      <div className="dotted-card p-5 sm:p-6 relative mb-8">
        <span className="font-hand text-clay text-[18px] absolute -top-3 left-5 bg-paper-50 px-2">
          ~ urls (max 10) ~
        </span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={running}
          rows={6}
          placeholder={"https://example.com\nhttps://example.com/blog/something\nhttps://api.example.com/v1/items"}
          className="w-full px-3 py-2.5 rounded-lg bg-paper-50 border border-ink/20 outline-none text-[13px] font-mono focus:ring-2 focus:ring-teal-accent/30 mt-2 resize-y"
        />
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <button
            onClick={start}
            disabled={running || parseUrls(text).length === 0}
            className="btn-led inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-hand text-[20px] shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {running ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" /> Run {parseUrls(text).length || 0} audits →
              </>
            )}
          </button>
          {rows.length > 0 && !running && stats.done > 0 && (
            <button
              onClick={exportCsv}
              className="font-hand text-[16px] text-ink border border-ink/20 rounded-full px-4 py-2 hover:bg-paper-50 inline-flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          )}
          <p className="font-sans text-[12px] text-ink-soft">
            Tip: each web audit takes 30-45s. Ten URLs at concurrency 2 ≈ 4-7 minutes.
          </p>
        </div>
      </div>

      {rows.length > 0 && (
        <section className="sticky-note rounded-lg p-5 sm:p-6 border border-ink/15">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <p className="font-hand text-clay text-[15px] mb-1">~ progress ~</p>
              <h2 className="font-hand text-[26px] text-ink leading-tight">
                {stats.done + stats.errored}/{stats.total} done
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Tag label="queued" n={stats.queued} tone="clay" />
              <Tag label="running" n={stats.inflight} tone="teal" />
              <Tag label="done" n={stats.done} tone="leaf" />
              <Tag label="error" n={stats.errored} tone="sunset" />
            </div>
          </div>

          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-[13px] font-sans">
              <thead>
                <tr className="text-left font-hand text-[14px] text-clay">
                  <th className="py-2 pr-3">URL</th>
                  <th className="py-2 pr-3 w-16">Source</th>
                  <th className="py-2 pr-3 w-14">Perf</th>
                  <th className="py-2 pr-3 w-14">SEO</th>
                  <th className="py-2 pr-3 w-14">A11y</th>
                  <th className="py-2 pr-3 w-14">BP</th>
                  <th className="py-2 pr-3 w-20">LCP</th>
                  <th className="py-2 pr-3 w-20">TBT</th>
                  <th className="py-2 pr-3 w-24">Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((r) => (
                  <tr key={r.url} className="border-t border-ink/15">
                    <td className="py-2.5 pr-3 max-w-[20rem]">
                      <span className="typewriter text-[12.5px] text-ink break-all">
                        {r.url.replace(/^https?:\/\//, "")}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3">
                      {r.sourceType ? (
                        <span className="typewriter text-[11px] text-clay">
                          {r.sourceType}
                        </span>
                      ) : (
                        <span className="text-ink-soft">—</span>
                      )}
                    </td>
                    <ScoreCell s={r.scores?.performance} />
                    <ScoreCell s={r.scores?.seo} />
                    <ScoreCell s={r.scores?.accessibility} />
                    <ScoreCell s={r.scores?.bestPractices} />
                    <td className="py-2.5 pr-3 typewriter text-[12px] text-ink-soft">
                      {r.metrics?.lcp ?? "—"}
                    </td>
                    <td className="py-2.5 pr-3 typewriter text-[12px] text-ink-soft">
                      {r.metrics?.tbt ?? "—"}
                    </td>
                    <td className="py-2.5 pr-3">
                      <StatusBadge status={r.status} error={r.error} blocked={r.blocked} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function ScoreCell({ s }: { s: number | undefined }) {
  if (s == null) return <td className="py-2.5 pr-3 text-ink-soft">—</td>;
  return (
    <td className="py-2.5 pr-3">
      <span
        className={`inline-flex items-center justify-center w-9 h-7 rounded-md font-hand text-[15px] tabular-nums ${scoreCellBg(
          s,
        )} ${scoreColor(s)}`}
      >
        {s}
      </span>
    </td>
  );
}

function StatusBadge({ status, error, blocked }: { status: RowStatus; error?: string; blocked?: boolean }) {
  if (blocked) {
    return (
      <span className="inline-flex items-center gap-1 font-hand text-[12px] text-amber-700" title={error}>
        <ShieldAlert className="w-3.5 h-3.5" /> blocked
      </span>
    );
  }
  if (status === "done") {
    return (
      <span className="inline-flex items-center gap-1 font-hand text-[12px] text-leaf-dark">
        <CheckCircle2 className="w-3.5 h-3.5" /> done
      </span>
    );
  }
  if (status === "running") {
    return (
      <span className="inline-flex items-center gap-1 font-hand text-[12px] text-teal-dark">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> running
      </span>
    );
  }
  if (status === "error") {
    return (
      <span
        className="inline-flex items-center gap-1 font-hand text-[12px] text-sunset"
        title={error}
      >
        <XCircle className="w-3.5 h-3.5" /> error
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 font-hand text-[12px] text-clay">
      <Layers className="w-3.5 h-3.5" /> queued
    </span>
  );
}

function Tag({ label, n, tone }: { label: string; n: number; tone: "clay" | "teal" | "leaf" | "sunset" }) {
  const cls = {
    clay: "bg-paper-200 text-clay border-clay/40",
    teal: "bg-teal-accent/15 text-teal-dark border-teal-accent/40",
    leaf: "bg-leaf/15 text-leaf-dark border-leaf/40",
    sunset: "bg-sunset/15 text-sunset border-sunset/40",
  }[tone];
  return (
    <span className={`font-hand text-[14px] border-2 rounded-full px-3 py-0.5 ${cls}`}>
      {label} · <span className="tabular-nums">{n}</span>
    </span>
  );
}
