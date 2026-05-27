import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import {
  Activity,
  Layers,
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
} from "lucide-react";

const QUICK_LINKS = [
  { label: "Site Audit", href: "/app/site-audit", Icon: Activity, ready: true, note: "Lighthouse + Llama" },
  { label: "Bulk Audit", href: "/app/bulk-audit", Icon: Layers, ready: true, note: "Up to 10 URLs · CSV export" },
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

export default function DashboardPage() {
  return (
    <div className="px-8 sm:px-12 py-10 max-w-6xl">
      <PageHeader
        kicker="dashboard"
        title="Welcome back."
        subtitle="Pick a module from the sidebar or jump straight in from below. Modules tagged 'soon' need paid APIs or OAuth that aren't wired yet."
      />

      {/* Stats — placeholders for now (would come from DB once auth is added) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        <Stat label="Audits run" value="—" hint="connect a project" />
        <Stat label="Site health" value="—" hint="needs a recent audit" />
        <Stat label="Keywords tracked" value="—" hint="add seeds in Keywords" />
        <Stat label="LLM mentions" value="—" hint="add brand queries" />
      </section>

      {/* Module grid */}
      <section className="mb-12">
        <p className="font-hand text-clay text-[16px] mb-2">~ modules ~</p>
        <h2 className="font-hand text-[28px] text-ink leading-tight mb-6">
          Twelve tools, one toolkit.
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

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="sticky-note rounded-md p-4 border-2 border-ink/80">
      <div className="font-hand text-clay text-[13px] mb-1">{label}</div>
      <div className="font-hand text-[36px] text-ink leading-none mb-1.5">{value}</div>
      <div className="font-sans text-[11.5px] text-ink-soft">{hint}</div>
    </div>
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
