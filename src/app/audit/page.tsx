import Link from "next/link";
import AuditTool from "@/components/AuditTool";
import { Navbar } from "@/components/Navbar";
import RoadmapCarousel from "@/components/RoadmapCarousel";

export default function AuditPage() {
  return (
    <div className="relative min-h-screen paper-bg">
      <Navbar />

      <main className="relative max-w-7xl mx-auto px-6 sm:px-10 py-10 sm:py-14">
        <div className="pointer-events-none absolute -top-10 right-0 w-96 h-96 watercolor-teal opacity-70" />
        <div className="pointer-events-none absolute bottom-40 -left-20 w-80 h-80 watercolor-sunset opacity-60" />

        <header className="mb-12 max-w-2xl relative">
          <p className="font-hand text-clay text-[18px] mb-2">~ site audit ~</p>
          <h1 className="font-hand text-[3rem] sm:text-[4rem] leading-[0.95] text-ink mb-3">
            What's holding
            <br />
            <span className="text-teal-accent hand-underline">your page back?</span>
          </h1>
          <p className="font-sans text-[14.5px] text-ink-soft leading-relaxed">
            Paste a URL on the left. Real Lighthouse scores plus a Llama 3.3 fix
            plan land on the right in about forty seconds. JSON APIs auto-route
            to a backend review.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-8 mb-20 relative">
          <div>
            <AuditTool />
          </div>

          <aside className="space-y-6">
            <section id="features">
              <p className="font-hand text-clay text-[16px] mb-2">~ features ~</p>
              <h2 className="font-hand text-[32px] text-ink leading-tight mb-4">
                The whole toolkit, on a sticky note.
              </h2>
              <div className="space-y-4">
                <Sticky tilt="-2deg" kicker="01" title="Lightning audit" body="Real Lighthouse scores: Performance, SEO, A11y, Best Practices + Core Web Vitals." />
                <Sticky tilt="1.5deg" kicker="02" title="API auto-detect" body="URL with /api, /v1/, /graphql or JSON content-type skips Lighthouse and gets a backend review." />
                <Sticky tilt="-1deg" kicker="03" title="Latency + schema" body="3-sample timing, payload size, root + item keys, null-field completeness." />
                <Sticky tilt="2deg" kicker="04" title="AI fix plan" body="Llama 3.3 70B (via Groq) writes Top 3 priorities, Quick Wins, SEO recs — specific to your scores." />
              </div>
            </section>

            <section id="about" className="dotted-card p-5">
              <p className="font-hand text-clay text-[15px] mb-1">~ about ~</p>
              <h3 className="font-hand text-[24px] text-ink leading-tight mb-2">
                Built for indie operators.
              </h3>
              <p className="font-sans text-[13.5px] text-ink-soft leading-relaxed mb-3">
                GoToSEO is open-source and free forever. No paywalls, no
                signup, no card. Use your own API keys, keep your data.
              </p>
              <Link
                href="/about"
                className="font-hand text-[17px] text-teal-accent hover:text-teal-dark inline-flex items-center gap-1.5 group"
              >
                Read the story
                <span className="inline-block group-hover:translate-x-0.5 transition-transform">→</span>
              </Link>
            </section>
          </aside>
        </div>

        <section id="coming-next" className="mb-12 relative">
          <p className="font-hand text-clay text-[18px] mb-2">~ the toolkit ~</p>
          <h2 className="font-hand text-[40px] sm:text-[46px] text-ink leading-tight mb-2 max-w-2xl">
            Three notebooks live,
            <br />
            one still on the workbench.
          </h2>
          <p className="font-sans text-[14.5px] text-ink-soft leading-relaxed mb-8 max-w-xl">
            Drag the stack to flip through. Site Audit, Content Writer, and
            Keyword Research all ship today. OTTO-lite is up next.
          </p>
          <RoadmapCarousel />
        </section>

        <div className="pb-4">
          <Link
            href="/"
            className="font-hand text-[18px] text-ink hover:text-teal-accent inline-flex items-center gap-1.5 group"
          >
            <span className="inline-block group-hover:-translate-x-1 transition-transform">←</span>
            back to home
          </Link>
        </div>
      </main>
    </div>
  );
}

function Sticky({
  tilt,
  kicker,
  title,
  body,
}: {
  tilt: string;
  kicker: string;
  title: string;
  body: string;
}) {
  return (
    <div
      className="sticky-note rounded-md p-4 border border-ink/20"
      style={{ transform: `rotate(${tilt})` }}
    >
      <div className="font-hand text-teal-accent text-[18px] mb-1">{kicker}</div>
      <h4 className="font-hand text-[22px] text-ink leading-tight mb-1.5">{title}</h4>
      <p className="font-sans text-[13px] text-ink-soft leading-relaxed">{body}</p>
    </div>
  );
}
