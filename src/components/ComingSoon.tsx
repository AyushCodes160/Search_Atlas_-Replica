import Link from "next/link";
import { PageHeader } from "./PageHeader";

export function ComingSoon({
  kicker,
  title,
  subtitle,
  why,
  needs,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
  why: string;
  needs: string[];
}) {
  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-20 sm:pt-10 pb-10 max-w-4xl">
      <PageHeader kicker={kicker} title={title} subtitle={subtitle} />

      <div className="dotted-card p-6 relative mb-6">
        <span className="font-hand text-clay text-[18px] absolute -top-3 left-5 bg-paper-50 px-2">
          ~ coming next ~
        </span>
        <p className="font-sans text-[14px] text-ink-soft leading-relaxed mb-5 mt-2">
          {why}
        </p>
        <div>
          <p className="font-hand text-clay text-[15px] mb-2">what me need to ship it:</p>
          <ul className="space-y-1.5">
            {needs.map((n) => (
              <li
                key={n}
                className="font-sans text-[13.5px] text-ink-soft flex items-start gap-2"
              >
                <span className="text-teal-accent mt-0.5">•</span>
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Link
        href="/app/dashboard"
        className="font-hand text-[17px] text-ink hover:text-teal-accent inline-flex items-center gap-1.5 group"
      >
        <span className="inline-block group-hover:-translate-x-0.5 transition-transform">←</span>
        back to dashboard
      </Link>
    </div>
  );
}
