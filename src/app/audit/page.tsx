import Link from "next/link";
import AuditTool from "@/components/AuditTool";
import { Navbar } from "@/components/Navbar";

export default function AuditPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f0f0ee]">
      <Navbar />
      <main className="px-6 sm:px-12 md:px-20 lg:px-28 py-12 sm:py-16 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-10 max-w-md">
          <p className="text-[11.5px] font-medium text-blue-500 mb-3">
            Site Audit
          </p>
          <h1 className="text-[1.75rem] sm:text-[2rem] leading-[1.1] font-medium text-gray-900 tracking-tight mb-3">
            See what's holding your site back.
          </h1>
          <p className="text-[13px] text-gray-500 leading-relaxed">
            Real Lighthouse scores. Gemini-written fixes. Forty seconds.
          </p>
        </div>

        {/* Tool */}
        <AuditTool />

        {/* Features */}
        <section
          id="features"
          className="mt-24 pt-12 border-t border-gray-200/70"
        >
          <p className="text-[11.5px] font-medium text-blue-500 mb-3">
            Features
          </p>
          <h2 className="text-[1.5rem] leading-[1.15] font-medium text-gray-900 tracking-tight mb-8 max-w-md">
            Built on free Google APIs. Nothing else.
          </h2>
          <div className="grid sm:grid-cols-3 gap-3">
            <FeatureCard
              kicker="01"
              title="Lightning Audit"
              desc="Real Lighthouse data — performance, SEO, accessibility, and best practices."
            />
            <FeatureCard
              kicker="02"
              title="AI Fix Suggester"
              desc="Gemini reads your audit and writes specific, copy-paste-ready fixes."
            />
            <FeatureCard
              kicker="03"
              title="100% Free"
              desc="Both APIs have generous free tiers. No paywall, no signup, no nonsense."
            />
          </div>

          <div className="mt-10">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-[12px] font-medium text-gray-700 hover:text-gray-900 transition-colors group"
            >
              <span className="inline-block transition-transform duration-200 group-hover:-translate-x-0.5">
                ←
              </span>
              Back to home
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function FeatureCard({
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
      className="rounded-2xl p-5 sm:p-6"
      style={{ backgroundColor: "#EDEDED" }}
    >
      <div className="text-[11.5px] font-medium text-blue-500 mb-3 tabular-nums">
        {kicker}
      </div>
      <h3 className="text-[14px] font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-[12.5px] text-gray-600 leading-relaxed">{desc}</p>
    </div>
  );
}
