"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wand2,
  KeyRound,
  Activity,
  Pencil,
  TrendingUp,
  MapPin,
  Link2,
  Eye,
  Megaphone,
  FileBarChart2,
  Bot,
} from "lucide-react";
import { Logo } from "./Logo";

const NAV = [
  { label: "Dashboard", href: "/app/dashboard", Icon: LayoutDashboard, ready: true },
  { label: "OTTO SEO", href: "/app/otto-seo", Icon: Wand2, ready: false },
  { label: "Keywords", href: "/app/keywords", Icon: KeyRound, ready: true },
  { label: "Site Audit", href: "/app/site-audit", Icon: Activity, ready: true },
  { label: "Content", href: "/app/content", Icon: Pencil, ready: true },
  { label: "Rank Tracker", href: "/app/rank-tracker", Icon: TrendingUp, ready: false },
  { label: "Local SEO", href: "/app/local-seo", Icon: MapPin, ready: false },
  { label: "Backlinks", href: "/app/backlinks", Icon: Link2, ready: false },
  { label: "LLM Visibility", href: "/app/llm-visibility", Icon: Eye, ready: false },
  { label: "Smart Ads", href: "/app/smart-ads", Icon: Megaphone, ready: false },
  { label: "Reports", href: "/app/reports", Icon: FileBarChart2, ready: false },
  { label: "Atlas Agent", href: "/app/atlas-agent", Icon: Bot, ready: true },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="w-60 shrink-0 border-r-2 border-dashed border-ink/15 bg-paper-100/30 backdrop-blur-sm flex flex-col">
      <div className="px-5 py-5 border-b-2 border-dashed border-ink/15">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-9 h-9 rounded-full bg-paper border-2 border-ink/85 shadow-[2px_2px_0_0_rgba(44,36,23,0.85)]">
            <Logo />
          </span>
          <span className="font-hand text-[20px] leading-none mt-1">SEO Engine</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV.map(({ label, href, Icon, ready }) => {
          const active = path === href || path?.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] transition-colors ${
                active
                  ? "bg-paper border-2 border-ink/80 shadow-[2px_2px_0_0_rgba(44,36,23,0.65)]"
                  : "border-2 border-transparent hover:bg-paper-50/60"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <Icon
                className={`w-4 h-4 ${active ? "text-teal-accent" : "text-ink-soft group-hover:text-ink"}`}
                strokeWidth={2}
              />
              <span className={`font-sans ${active ? "text-ink font-medium" : "text-ink-soft"}`}>
                {label}
              </span>
              {!ready && (
                <span className="ml-auto font-hand text-[11px] text-clay border border-ink/30 rounded-full px-1.5 py-0">
                  soon
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t-2 border-dashed border-ink/15">
        <Link
          href="/"
          className="font-hand text-[15px] text-ink-soft hover:text-teal-accent inline-flex items-center gap-1.5 group"
        >
          <span className="inline-block group-hover:-translate-x-0.5 transition-transform">←</span>
          back to landing
        </Link>
      </div>
    </aside>
  );
}
