import Link from "next/link";
import { Navbar } from "@/components/Navbar";

export default function AboutPage() {
  return (
    <div className="relative min-h-screen bg-[#f0f0ee]">
      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />

        <main className="px-6 sm:px-12 md:px-20 lg:px-28 py-10 sm:py-16">
          <section className="mb-12 sm:mb-20 max-w-xl">
            <div className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-blue-500 mb-3">
              About
            </div>
            <h1 className="text-[1.5rem] sm:text-[1.75rem] leading-[1.15] font-medium text-gray-900 tracking-tight mb-3">
              A free, indie SEO toolkit.
            </h1>
            <p className="text-[13px] text-gray-400 font-normal">
              Built for the operator, not the enterprise dashboard.
            </p>
          </section>

          <section className="mb-12 sm:mb-20 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-blue-500 mb-3">
              Story
            </div>
            <h2 className="text-[1.5rem] sm:text-[1.75rem] leading-[1.15] font-medium text-gray-900 tracking-tight mb-3">
              Why this exists.
            </h2>
            <div className="space-y-4 text-[13px] text-gray-400 font-normal leading-relaxed">
              <p>
                Search Atlas Replica is an open-source take on the all-in-one
                SEO platforms that charge agencies hundreds a month. The first
                module pairs Google's free Lighthouse data with Groq to turn
                raw performance audits into actionable, code-aware fix plans.
              </p>
              <p>
                Built for the indie operator — freelancers, in-house engineers,
                anyone who wants one calm tool instead of four enterprise
                dashboards. No paywalls, no upsell, no trial timer.
              </p>
            </div>
          </section>

          <section className="mb-12 sm:mb-20">
            <div className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-blue-500 mb-3">
              Roadmap
            </div>
            <h2 className="text-[1.5rem] sm:text-[1.75rem] leading-[1.15] font-medium text-gray-900 tracking-tight mb-3 max-w-xl">
              Four tools, one toolkit.
            </h2>
            <p className="text-[13px] text-gray-400 font-normal mb-10 max-w-xl">
              Audit is shipping today. Three more modules are sketched out and
              landing one at a time.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <RoadmapCard
                kicker="01"
                status="Live"
                title="Site Audit"
                desc="Lighthouse data plus a Groq-written fix plan."
              />
              <RoadmapCard
                kicker="02"
                status="Next"
                title="AI Content Writer"
                desc="SEO-optimized drafts tuned to intent and snippet shape."
              />
              <RoadmapCard
                kicker="03"
                status="Soon"
                title="Keyword Research"
                desc="Long-tail ideas from Autocomplete and Trends, clustered by Groq."
              />
              <RoadmapCard
                kicker="04"
                status="Soon"
                title="OTTO-lite"
                desc="A script tag that proposes one-click on-page SEO fixes."
              />
            </div>
          </section>

          <section>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/audit"
                className="inline-flex items-center gap-2 text-[13px] font-medium text-blue-500 border border-blue-400 rounded-full px-5 py-2.5 hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all duration-200 group"
              >
                Try a free audit
                <span className="inline-block transition-transform duration-200 group-hover:translate-x-0.5">
                  →
                </span>
              </Link>
              <a
                href="https://github.com/AyushCodes160/Search_Atlas_-Replica"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-[13px] font-medium text-gray-700 border border-gray-300 rounded-full px-5 py-2.5 hover:border-blue-400 hover:text-blue-500 transition-all duration-200 group"
              >
                View source on GitHub
                <span className="inline-block transition-transform duration-200 group-hover:translate-x-0.5">
                  →
                </span>
              </a>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function RoadmapCard({
  kicker,
  status,
  title,
  desc,
}: {
  kicker: string;
  status: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl p-6" style={{ backgroundColor: "#EDEDED" }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11.5px] font-medium text-blue-500 tabular-nums">
          {kicker}
        </span>
        <span className="text-[10.5px] font-medium text-gray-400 uppercase tracking-wide">
          {status}
        </span>
      </div>
      <h3 className="text-[14px] font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-[12.5px] text-gray-400 font-normal leading-relaxed">
        {desc}
      </p>
    </div>
  );
}
