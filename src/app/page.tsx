import Link from "next/link";
import { Navbar } from "@/components/Navbar";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden paper-bg">
      <Navbar />

      <main className="relative">
        <section className="relative max-w-6xl mx-auto px-6 sm:px-10 pt-10 pb-24">
          {/* watercolor blobs in the corners */}
          <div className="pointer-events-none absolute -top-10 -left-20 w-80 h-80 watercolor-teal" />
          <div className="pointer-events-none absolute -bottom-20 -right-10 w-96 h-96 watercolor-sunset" />
          <div className="pointer-events-none absolute top-40 right-1/4 w-72 h-72 watercolor-leaf opacity-70" />

          {/* sticker label, top-right */}
          <div className="absolute right-6 sm:right-12 top-2 hidden md:block rotate-[6deg]">
            <span className="font-hand text-sm bg-sunset/90 text-paper-50 border-2 border-ink/80 px-3 py-1 shadow-[2px_2px_0_0_rgba(44,36,23,0.8)]">
              Prototype v1
            </span>
          </div>

          {/* headline */}
          <div className="relative pt-12 sm:pt-16 max-w-3xl">
            <p className="font-hand text-lg text-clay mb-4">— for indie SEO operators —</p>
            <h1 className="font-hand text-[3rem] sm:text-[4.5rem] md:text-[5.5rem] leading-[0.95] text-ink mb-6">
              Real Lighthouse,
              <br />
              <span className="text-teal-accent hand-underline">AI‑powered fixes.</span>
            </h1>
            <p className="font-sans text-[15px] sm:text-[16px] text-ink-soft leading-relaxed max-w-xl mb-8">
              Drop a URL, get the same Lighthouse data Chrome uses,
              and a fix plan written by Llama 3.3 in plain language —
              all on free APIs, all in about forty seconds.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/app"
                className="btn-led inline-flex items-center gap-2 rounded-full px-6 py-3 font-hand text-[19px] shadow-[3px_3px_0_0_rgba(44,36,23,0.85)]"
              >
                Open dashboard
                <span className="inline-block">→</span>
              </Link>
              <Link
                href="/about"
                className="font-hand text-[18px] text-ink hover:text-teal-accent border-b-2 border-dotted border-ink/40 hover:border-teal-accent transition-colors"
              >
                What is this anyway?
              </Link>
            </div>
          </div>

          {/* video card — sketch frame around the audit demo */}
          <div className="relative mt-16 sm:mt-20 mx-auto max-w-4xl">
            <div className="relative rounded-[28px] overflow-hidden border-[3px] border-ink/90 shadow-[6px_6px_0_0_rgba(44,36,23,0.85)] rotate-[-1.5deg] bg-paper-100">
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
              {/* handwritten caption overlay */}
              <div className="absolute left-4 bottom-4 sm:left-6 sm:bottom-6 max-w-[16rem] rotate-[-2deg]">
                <p className="font-hand text-[18px] sm:text-[22px] text-paper-50 leading-tight drop-shadow-[2px_2px_0_rgba(0,0,0,0.55)]">
                  watch a real audit
                  <br />
                  unfold in seconds →
                </p>
              </div>
              {/* sticky pin in the corner */}
              <div className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-sunset border-2 border-ink shadow-[2px_2px_0_0_rgba(44,36,23,0.8)] rotate-12" />
            </div>
            {/* paper clips */}
            <div className="hidden sm:block absolute -top-6 left-12 w-12 h-12 rotate-[-15deg]">
              <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
                <path
                  d="M14 8 a4 4 0 0 1 4-4 h12 a4 4 0 0 1 4 4 v32 a4 4 0 0 1-4 4 h-12 a4 4 0 0 1-4-4 v-26 a3 3 0 0 1 6 0 v18"
                  stroke="#2c2417"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            </div>
          </div>

          {/* three quick talking points */}
          <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-6 mt-16">
            <Talker n="01" title="Free APIs, free forever" body="PageSpeed (25k/day) + Groq Llama 3.3 (14.4k/day). No card." tilt="-2deg" />
            <Talker n="02" title="API auto‑detect" body="JSON endpoints skip Lighthouse and get a backend review instead." tilt="1.5deg" />
            <Talker n="03" title="Code‑aware fixes" body="Top 3 priorities, quick wins, SEO recs — all specific to your audit." tilt="-1deg" />
          </div>
        </section>
      </main>
    </div>
  );
}

function Talker({ n, title, body, tilt }: { n: string; title: string; body: string; tilt: string }) {
  return (
    <div
      className="sticky-note rounded-md p-5 border-2 border-ink/85"
      style={{ transform: `rotate(${tilt})` }}
    >
      <div className="font-hand text-teal-accent text-[20px] mb-1">{n}</div>
      <h3 className="font-hand text-[24px] text-ink leading-tight mb-2">{title}</h3>
      <p className="font-sans text-[13.5px] text-ink-soft leading-relaxed">{body}</p>
    </div>
  );
}
