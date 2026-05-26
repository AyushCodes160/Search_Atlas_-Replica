import Link from "next/link";
import AuditTool from "@/components/AuditTool";
import { Navbar } from "@/components/Navbar";

export default function AuditPage() {
  return (
    <div className="relative min-h-screen bg-[#f0f0ee]">
      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />

        <main className="px-6 sm:px-12 md:px-20 lg:px-28 py-10 sm:py-16">
          <section className="mb-12 sm:mb-20 max-w-xl">
            <div className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-blue-500 mb-3">
              Site Audit
            </div>
            <h1 className="text-[1.5rem] sm:text-[1.75rem] leading-[1.15] font-medium text-gray-900 tracking-tight mb-3">
              See what's holding your site back.
            </h1>
            <p className="text-[13px] text-gray-400 font-normal">
              Real Lighthouse scores. Gemini-written fix plans. Forty seconds
              from URL to action items.
            </p>
          </section>

          <section className="mb-12 sm:mb-20">
            <AuditTool />
          </section>

          <section id="features" className="mb-12 sm:mb-20">
            <div className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-blue-500 mb-3">
              Features
            </div>
            <h2 className="text-[1.5rem] sm:text-[1.75rem] leading-[1.15] font-medium text-gray-900 tracking-tight mb-3 max-w-xl">
              Free Google APIs, behind a calm interface.
            </h2>
            <p className="text-[13px] text-gray-400 font-normal mb-10 max-w-xl">
              Everything below runs on your own free API keys. No paywall, no
              quota games, no signup. Read the source and self-host if you'd
              rather.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <FeatureCard
                kicker="01"
                title="Lightning Audit"
                desc="Real Lighthouse scores from Google's own engine. Same data Chrome uses — no proxies, no estimations."
                bullets={[
                  "Performance, SEO, Accessibility, Best Practices",
                  "Core Web Vitals (LCP, CLS, FCP, TBT, Speed Index)",
                  "Mobile-first by default",
                  "Top failing audits surfaced automatically",
                ]}
              />
              <FeatureCard
                kicker="02"
                title="AI Fix Suggester"
                desc="Most tools tell you what's wrong. This one tells you exactly what to change, scoped to your actual scores."
                bullets={[
                  "Top 3 priorities, ranked by impact",
                  "Quick wins under 30 minutes each",
                  "Copy-paste-ready code snippets",
                  "Specific to your audit, not generic advice",
                ]}
              />
              <FeatureCard
                kicker="03"
                title="Free Forever"
                desc="Built on Google's generous free tiers. Use your own keys, keep your data, owe nothing."
                bullets={[
                  "25,000 PageSpeed audits per day",
                  "1,500 Gemini fix reports per day",
                  "No card, no signup, no paywall",
                  "Open source — fork it, self-host it",
                ]}
              />
            </div>
          </section>

          <section id="about" className="mb-12 sm:mb-20">
            <div className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-blue-500 mb-3">
              About
            </div>
            <h2 className="text-[1.5rem] sm:text-[1.75rem] leading-[1.15] font-medium text-gray-900 tracking-tight mb-3 max-w-xl">
              A free, indie SEO toolkit.
            </h2>
            <p className="text-[13px] text-gray-400 font-normal mb-10 max-w-xl">
              Built for the operator, not the enterprise dashboard.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div
                className="rounded-2xl p-6 lg:col-span-2"
                style={{ backgroundColor: "#EDEDED" }}
              >
                <div className="text-[11.5px] font-medium text-blue-500 mb-3">
                  Story
                </div>
                <h3 className="text-[15px] font-medium text-gray-900 mb-3">
                  Why this exists.
                </h3>
                <div className="space-y-4 text-[13px] text-gray-400 font-normal leading-relaxed">
                  <p>
                    Search Atlas Replica is an open-source take on the
                    all-in-one SEO platforms that charge agencies hundreds a
                    month. The first module pairs Google's free Lighthouse
                    data with Gemini to turn raw performance audits into
                    actionable, code-aware fix plans.
                  </p>
                  <p>
                    Built for the indie operator — freelancers, in-house
                    engineers, anyone who wants one calm tool instead of four
                    enterprise dashboards. No paywalls, no upsell, no trial
                    timer.
                  </p>
                </div>
              </div>

              <div
                className="rounded-2xl p-6 flex flex-col gap-4"
                style={{ backgroundColor: "#EDEDED" }}
              >
                <div className="text-[11.5px] font-medium text-blue-500">
                  Principles
                </div>
                <ul className="space-y-2.5">
                  {[
                    "Free APIs over paid data",
                    "Local-first, your keys, your data",
                    "Plain HTML, no enterprise jargon",
                    "One calm tool, not a dashboard zoo",
                  ].map((p) => (
                    <li
                      key={p}
                      className="text-[13px] text-gray-700 font-normal leading-relaxed flex items-start gap-2"
                    >
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2">
                  <a
                    href="https://github.com/AyushCodes160/Search_Atlas_-Replica"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-[13px] font-medium text-blue-500 hover:text-blue-600 transition-colors duration-200 group"
                  >
                    View source
                    <span className="inline-block transition-transform duration-200 group-hover:translate-x-0.5">
                      →
                    </span>
                  </a>
                </div>
              </div>
            </div>
          </section>

          <section id="coming-next" className="mb-12 sm:mb-20">
            <div className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-blue-500 mb-3">
              Coming next
            </div>
            <h2 className="text-[1.5rem] sm:text-[1.75rem] leading-[1.15] font-medium text-gray-900 tracking-tight mb-3 max-w-xl">
              Three more tools, one quiet toolkit.
            </h2>
            <p className="text-[13px] text-gray-400 font-normal mb-10 max-w-xl">
              Audit is the first module. The rest fill out a full Search-Atlas-class
              workflow without the enterprise price tag.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <RoadmapCard
                kicker="04"
                title="AI Content Writer"
                desc="SEO-optimized drafts from a target keyword and intent. Tunes for E-E-A-T and search snippet formats."
              />
              <RoadmapCard
                kicker="05"
                title="Keyword Research"
                desc="Long-tail keyword ideas from Google Autocomplete and Trends, expanded and clustered by Gemini."
              />
              <RoadmapCard
                kicker="06"
                title="OTTO-lite"
                desc="A single script tag that scans your live site and proposes on-page fixes — meta, schema, alt text — for one-click apply."
              />
            </div>
          </section>

          <section className="pb-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-[13px] font-medium text-gray-700 hover:text-blue-500 transition-colors duration-200 group"
            >
              <span className="inline-block transition-transform duration-200 group-hover:-translate-x-0.5">
                ←
              </span>
              Back to home
            </Link>
          </section>
        </main>
      </div>
    </div>
  );
}

function FeatureCard({
  kicker,
  title,
  desc,
  bullets,
}: {
  kicker: string;
  title: string;
  desc: string;
  bullets: string[];
}) {
  return (
    <div
      className="rounded-2xl p-6 flex flex-col gap-4"
      style={{ backgroundColor: "#EDEDED" }}
    >
      <div className="text-[11.5px] font-medium text-blue-500 tabular-nums">
        {kicker}
      </div>
      <div>
        <h3 className="text-[15px] font-medium text-gray-900 mb-2">{title}</h3>
        <p className="text-[13px] text-gray-400 font-normal leading-relaxed">
          {desc}
        </p>
      </div>
      <ul className="mt-1 space-y-1.5">
        {bullets.map((b) => (
          <li
            key={b}
            className="text-[12.5px] text-gray-700 font-normal leading-relaxed flex items-start gap-2"
          >
            <span className="text-blue-500 mt-0.5">•</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RoadmapCard({
  kicker,
  title,
  desc,
}: {
  kicker: string;
  title: string;
  desc: string;
}) {
  return (
    <div
      className="rounded-2xl p-6"
      style={{ backgroundColor: "#EDEDED" }}
    >
      <div className="text-[11.5px] font-medium text-blue-500 mb-3 tabular-nums">
        {kicker}
      </div>
      <h3 className="text-[15px] font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-[13px] text-gray-400 font-normal leading-relaxed">
        {desc}
      </p>
    </div>
  );
}
