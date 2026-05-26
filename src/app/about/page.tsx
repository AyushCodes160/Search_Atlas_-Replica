import Link from "next/link";
import { Github } from "lucide-react";
import { Navbar } from "@/components/Navbar";

export default function AboutPage() {
  return (
    <div className="relative min-h-screen paper-bg">
      <Navbar />

      <main className="relative max-w-4xl mx-auto px-6 sm:px-10 py-12 sm:py-16">
        <div className="pointer-events-none absolute top-10 -right-16 w-80 h-80 watercolor-leaf opacity-70" />
        <div className="pointer-events-none absolute bottom-10 -left-20 w-96 h-96 watercolor-teal opacity-50" />

        <header className="mb-14 relative">
          <p className="font-hand text-clay text-[18px] mb-2">~ about ~</p>
          <h1 className="font-hand text-[3rem] sm:text-[4.5rem] leading-[0.95] text-ink mb-4">
            A small toolkit,
            <br />
            <span className="text-teal-accent hand-underline">built in the open.</span>
          </h1>
          <p className="font-sans text-[15px] text-ink-soft leading-relaxed max-w-2xl">
            SEO Engine is what happens when an indie operator decides not to pay
            three hundred dollars a month for an SEO dashboard and asks an
            LLM to do the heavy lifting instead.
          </p>
        </header>

        <section className="mb-16 grid grid-cols-1 md:grid-cols-2 gap-6 relative">
          <div className="sticky-note rounded-lg p-6 border-[2.5px] border-ink/85" style={{ transform: "rotate(-1deg)" }}>
            <p className="font-hand text-clay text-[15px] mb-1">~ story ~</p>
            <h2 className="font-hand text-[28px] text-ink leading-tight mb-3">Why this exists.</h2>
            <p className="font-sans text-[14px] text-ink-soft leading-relaxed mb-3">
              Most SEO platforms charge agencies hundreds a month for tools
              that mostly wrap Google's free data. The interesting work — turning
              a Lighthouse report into a concrete fix plan — is something an
              LLM can do well, for free.
            </p>
            <p className="font-sans text-[14px] text-ink-soft leading-relaxed">
              So this is the small, open version: PageSpeed on one side, Llama
              3.3 on the other, a calm UI in the middle. Plus a strict source
              classifier so APIs don't get fake Lighthouse scores.
            </p>
          </div>

          <div className="sticky-note rounded-lg p-6 border-[2.5px] border-ink/85" style={{ transform: "rotate(1.2deg)" }}>
            <p className="font-hand text-clay text-[15px] mb-1">~ principles ~</p>
            <h2 className="font-hand text-[28px] text-ink leading-tight mb-3">House rules.</h2>
            <ul className="space-y-2 font-sans text-[14px] text-ink-soft leading-relaxed">
              <li className="flex gap-2"><span className="text-teal-accent">✦</span> Free APIs over paid data.</li>
              <li className="flex gap-2"><span className="text-teal-accent">✦</span> Local-first — your keys, your data.</li>
              <li className="flex gap-2"><span className="text-teal-accent">✦</span> Plain HTML, no enterprise jargon.</li>
              <li className="flex gap-2"><span className="text-teal-accent">✦</span> One calm tool, not a dashboard zoo.</li>
              <li className="flex gap-2"><span className="text-teal-accent">✦</span> Honest about what doesn't apply (looking at you, APIs).</li>
            </ul>
          </div>
        </section>

        <section className="mb-16 relative">
          <p className="font-hand text-clay text-[18px] mb-2">~ the roadmap ~</p>
          <h2 className="font-hand text-[2.5rem] sm:text-[3rem] text-ink leading-[1] mb-6">
            Four tools, one notebook.
          </h2>
          <RoadmapGraphic />
        </section>

        <section className="text-center relative">
          <p className="font-hand text-clay text-[18px] mb-2">~ contribute ~</p>
          <h2 className="font-hand text-[2.5rem] text-ink leading-tight mb-3">
            Build the next page with me.
          </h2>
          <p className="font-sans text-[14.5px] text-ink-soft leading-relaxed max-w-xl mx-auto mb-6">
            It's open source on GitHub. Fork it, file an issue, send a PR,
            or just star it if you want to follow along.
          </p>
          <a
            href="https://github.com/AyushCodes160/SEO_Engine"
            target="_blank"
            rel="noreferrer"
            className="btn-shake inline-flex items-center gap-3 bg-ink text-paper-50 border-2 border-ink rounded-full px-6 py-3 font-hand text-[20px] shadow-[3px_3px_0_0_rgba(26,164,154,0.85)] hover:bg-teal-dark transition-colors"
          >
            <Github className="w-5 h-5" strokeWidth={2} />
            View on GitHub
            <span>→</span>
          </a>
        </section>

        <div className="mt-16">
          <Link
            href="/audit"
            className="font-hand text-[18px] text-ink hover:text-teal-accent inline-flex items-center gap-1.5 group"
          >
            <span className="inline-block group-hover:-translate-x-1 transition-transform">←</span>
            run an audit
          </Link>
        </div>
      </main>
    </div>
  );
}

function RoadmapGraphic() {
  const items = [
    { n: "01", title: "Site Audit", status: "Live", tilt: -3, body: "Lighthouse + Llama fix plan." },
    { n: "02", title: "AI Content Writer", status: "Next", tilt: 2, body: "Drafts tuned to intent + snippet shape." },
    { n: "03", title: "Keyword Research", status: "Soon", tilt: -2, body: "Autocomplete + Trends, LLM-clustered." },
    { n: "04", title: "OTTO-lite", status: "Soon", tilt: 3, body: "Script tag → one-click on-page fixes." },
  ];

  return (
    <div className="relative">
      <svg viewBox="0 0 800 80" className="absolute left-0 right-0 top-[45%] -translate-y-1/2 hidden md:block" aria-hidden>
        <path
          d="M 40 40 Q 200 5, 380 40 T 760 40"
          stroke="#2c2417"
          strokeWidth="2.5"
          strokeDasharray="6 6"
          fill="none"
          strokeLinecap="round"
        />
      </svg>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 relative">
        {items.map((it) => (
          <div
            key={it.n}
            className="sticky-note rounded-md p-5 border-[2.5px] border-ink/85 relative"
            style={{ transform: `rotate(${it.tilt}deg)` }}
          >
            <div className="absolute -top-3 -right-3 w-9 h-9 rounded-full border-2 border-ink bg-paper-50 flex items-center justify-center font-hand text-[14px] text-ink shadow-[2px_2px_0_0_rgba(44,36,23,0.7)]">
              {it.status === "Live" ? "✓" : it.status === "Next" ? "→" : "…"}
            </div>
            <div className="font-hand text-teal-accent text-[20px] mb-1">{it.n}</div>
            <h3 className="font-hand text-[24px] text-ink leading-tight mb-2">{it.title}</h3>
            <p className="font-sans text-[12.5px] text-ink-soft leading-relaxed mb-2">{it.body}</p>
            <span className="font-hand text-[13px] uppercase tracking-wide text-clay">{it.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
