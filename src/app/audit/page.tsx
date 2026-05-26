import Link from "next/link";
import AuditTool from "@/components/AuditTool";
import { Sparkles, Zap, Search, Bot, ArrowLeft } from "lucide-react";

export default function AuditPage() {
  return (
    <main className="min-h-screen gradient-bg">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="flex items-center justify-between mb-12">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
              <Search className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-semibold text-lg tracking-tight">
              Search Atlas <span className="text-brand-600">Replica</span>
            </span>
          </div>
        </header>

        <section className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-medium mb-4 border border-brand-100">
            <Sparkles className="w-3.5 h-3.5" />
            AI-Powered SEO Audit
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            See what's holding your <span className="text-brand-600">SEO</span> back.
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Free site audit powered by Google PageSpeed + Gemini AI. Get
            performance scores and clear, actionable fixes in seconds.
          </p>
        </section>

        <section>
          <AuditTool />
        </section>

        <section className="mt-20 grid md:grid-cols-3 gap-6">
          <FeatureCard
            icon={<Zap className="w-5 h-5" />}
            title="Lightning Audit"
            desc="Real Lighthouse data — performance, SEO, accessibility, best practices."
          />
          <FeatureCard
            icon={<Bot className="w-5 h-5" />}
            title="AI Fix Suggester"
            desc="Gemini reads your audit and writes specific, copy-paste-ready fixes."
          />
          <FeatureCard
            icon={<Search className="w-5 h-5" />}
            title="100% Free"
            desc="Built on free Google APIs. No paywall, no signup, no nonsense."
          />
        </section>

        <footer className="mt-20 text-center text-xs text-gray-500">
          Built with Next.js + Tailwind + Gemini. © {new Date().getFullYear()}
        </footer>
      </div>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="glass rounded-2xl p-6 border border-white/40 shadow-sm">
      <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center mb-3">
        {icon}
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
    </div>
  );
}
