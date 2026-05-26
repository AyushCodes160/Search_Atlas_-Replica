import Link from "next/link";
import { Logo } from "./Logo";

const GITHUB_URL = "https://github.com/AyushCodes160/SEO_Engine";

const NAV_LINKS: { label: string; href: string; external?: boolean }[] = [
  { label: "Audit", href: "/audit" },
  { label: "Features", href: "/audit#features" },
  { label: "About", href: "/about" },
  { label: "GitHub", href: GITHUB_URL, external: true },
];

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-6 sm:px-10 py-4 bg-paper/85 backdrop-blur-md border-b-2 border-dashed border-ink/20">
      <Link
        href="/"
        aria-label="Home"
        className="flex items-center gap-2.5 group"
      >
        <span className="flex items-center justify-center w-11 h-11 rounded-full bg-paper border-2 border-ink/80 shadow-[2px_2px_0_0_rgba(44,36,23,0.85)] group-hover:rotate-[-8deg] transition-transform duration-300">
          <Logo />
        </span>
        <span className="font-hand text-[22px] text-ink leading-none mt-1 hidden sm:inline">
          SEO Engine
        </span>
      </Link>

      <div className="flex items-center gap-1 sm:gap-2 bg-paper-200/70 border-2 border-ink/70 rounded-full px-2 sm:px-4 py-1 shadow-[3px_3px_0_0_rgba(44,36,23,0.8)]">
        {NAV_LINKS.map((link) =>
          link.external ? (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="font-hand text-[17px] sm:text-[19px] text-ink hover:text-teal-accent transition-colors px-2 sm:px-3 py-1 hover:rotate-[-3deg] inline-block"
            >
              {link.label}
            </a>
          ) : (
            <Link
              key={link.label}
              href={link.href}
              className="font-hand text-[17px] sm:text-[19px] text-ink hover:text-teal-accent transition-colors px-2 sm:px-3 py-1 hover:rotate-[-3deg] inline-block"
            >
              {link.label}
            </Link>
          ),
        )}
      </div>
    </nav>
  );
}
