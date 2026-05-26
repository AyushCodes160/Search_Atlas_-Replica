import Link from "next/link";
import { Navbar } from "@/components/Navbar";

export default function AboutPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f0f0ee]">
      <Navbar />
      <main className="px-6 sm:px-12 md:px-20 lg:px-28 py-12 sm:py-20 max-w-2xl mx-auto">
        <p className="text-[11.5px] font-medium text-blue-500 mb-3">About</p>
        <h1 className="text-[2rem] sm:text-[2.25rem] leading-[1.1] font-medium text-gray-900 tracking-tight mb-6">
          A free, indie SEO toolkit.
        </h1>

        <div className="space-y-4 text-[14px] text-gray-700 leading-relaxed">
          <p>
            Search Atlas Replica is an open-source take on the all-in-one SEO
            platforms that charge agencies hundreds a month. The first module
            pairs Google's free Lighthouse data with Gemini to turn raw
            performance audits into actionable, code-aware fix plans.
          </p>
          <p>
            Built for the indie operator — freelancers, in-house engineers,
            anyone who wants one clean tool instead of four enterprise
            dashboards.
          </p>
          <p>
            Audit is the first of four planned modules. An AI content writer,
            keyword research, and an OTTO-style on-page fix injector are next.
          </p>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row gap-3">
          <Link
            href="/audit"
            className="inline-flex items-center justify-center gap-2 text-[13px] font-medium text-blue-500 border border-blue-400 rounded-full px-5 py-2.5 hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all duration-200 group"
          >
            Try a free audit
            <span className="transition-transform duration-200 group-hover:translate-x-0.5">
              →
            </span>
          </Link>
          <a
            href="https://github.com/AyushCodes160/Search_Atlas_-Replica"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 text-[13px] font-medium text-gray-700 rounded-full px-5 py-2.5 hover:text-gray-900 transition-colors group"
            style={{ backgroundColor: "#EDEDED" }}
          >
            View source on GitHub
            <span className="transition-transform duration-200 group-hover:translate-x-0.5">
              →
            </span>
          </a>
        </div>
      </main>
    </div>
  );
}
