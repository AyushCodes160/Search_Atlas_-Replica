import Link from "next/link";
import { Navbar } from "@/components/Navbar";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden paper-bg">
      <Navbar />

      <main className="relative">
        <section className="relative max-w-6xl mx-auto px-6 sm:px-10 pt-10 pb-24">
          {/* ambient brand glows */}
          <div className="pointer-events-none absolute -top-10 -left-20 w-80 h-80 watercolor-teal" />
          <div className="pointer-events-none absolute -bottom-20 -right-10 w-96 h-96 watercolor-sunset" />
          <div className="pointer-events-none absolute top-40 right-1/4 w-72 h-72 watercolor-leaf opacity-70" />

          {/* badge, top-right */}
          <div className="absolute right-6 sm:right-12 top-4 hidden md:block">
            <span className="font-sans text-[12px] font-medium bg-sunset/15 text-sunset border border-sunset/30 rounded-full px-3 py-1">
              Part of GoToStudio.ai
            </span>
          </div>

          {/* headline */}
          <div className="relative pt-12 sm:pt-16 max-w-3xl">
            <p className="font-sans text-[13px] font-medium tracking-wide uppercase text-clay mb-4">
              AI-first SEO for service businesses
            </p>
            <h1 className="font-hand font-bold text-[3rem] sm:text-[4.5rem] md:text-[5.25rem] leading-[0.98] text-ink mb-6 tracking-tight">
              Real Lighthouse,
              <br />
              <span className="text-teal-dark hand-underline">AI-powered fixes.</span>
            </h1>
            <p className="font-sans text-[15px] sm:text-[17px] text-ink-soft leading-relaxed max-w-xl mb-8">
              Drop a URL, get the same Lighthouse data Chrome uses, and a fix plan
              written by Llama 3.3 in plain language — all on free APIs, all in about
              forty seconds.
            </p>

            <div className="flex flex-wrap items-center gap-5">
              <Link
                href="/app"
                className="btn-led inline-flex items-center gap-2 rounded-full px-7 py-3.5 font-hand font-medium text-[18px] shadow-md"
              >
                Open dashboard
                <span className="inline-block">→</span>
              </Link>
              <Link
                href="/about"
                className="font-sans font-medium text-[16px] text-ink-soft hover:text-teal-dark underline underline-offset-4 decoration-ink/20 hover:decoration-teal-dark transition-colors"
              >
                What is this anyway?
              </Link>
            </div>
          </div>

          {/* demo video — clean glass frame */}
          <div className="relative mt-16 sm:mt-20 mx-auto max-w-4xl">
            <div className="relative rounded-[24px] overflow-hidden border border-ink/12 shadow-2xl bg-paper-50">
              <video
                autoPlay
                muted
                loop
                playsInline
                className="block w-full h-[260px] sm:h-[360px] md:h-[420px] object-cover"
              >
                <source
                  src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260508_215831_c6a8989c-d716-4d8d-8745-e972a2eec711.mp4"
                  type="video/mp4"
                />
              </video>
              <div className="absolute left-4 bottom-4 sm:left-6 sm:bottom-6 max-w-[16rem]">
                <p className="font-hand font-medium text-[18px] sm:text-[22px] text-white leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
                  watch a real audit
                  <br />
                  unfold in seconds →
                </p>
              </div>
            </div>
          </div>

          {/* three quick talking points */}
          <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-6 mt-16">
            <Talker n="01" title="Free APIs, free forever" body="PageSpeed (25k/day) + Groq Llama 3.3 (14.4k/day). No card." />
            <Talker n="02" title="API auto-detect" body="JSON endpoints skip Lighthouse and get a backend review instead." />
            <Talker n="03" title="Code-aware fixes" body="Top 3 priorities, quick wins, SEO recs — all specific to your audit." />
          </div>
        </section>
      </main>
    </div>
  );
}

function Talker({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="sticky-note rounded-2xl p-6 border border-ink/12">
      <div className="font-hand font-semibold text-teal-dark text-[18px] mb-1">{n}</div>
      <h3 className="font-hand font-semibold text-[22px] text-ink leading-tight mb-2">{title}</h3>
      <p className="font-sans text-[13.5px] text-ink-soft leading-relaxed">{body}</p>
    </div>
  );
}
