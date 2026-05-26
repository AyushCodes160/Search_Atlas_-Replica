import Link from "next/link";
import { Logo } from "./Logo";

const GITHUB_URL = "https://github.com/AyushCodes160/Search_Atlas_-Replica";

const NAV_LINKS: { label: string; href: string; external?: boolean }[] = [
  { label: "Audit", href: "/audit" },
  { label: "Features", href: "/audit#features" },
  { label: "About", href: "/audit#about" },
  { label: "GitHub", href: GITHUB_URL, external: true },
];

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 flex items-center justify-center pt-4 sm:pt-6 pb-4 sm:pb-5 px-4 sm:px-8 gap-2 sm:gap-3 bg-[#f0f0ee]/70 backdrop-blur-xl">
      <Link
        href="/"
        aria-label="Home"
        className="flex items-center justify-center rounded-full w-10 h-10 sm:w-11 sm:h-11 shrink-0 hover:opacity-80 transition-opacity duration-200"
        style={{ backgroundColor: "#EDEDED" }}
      >
        <Logo />
      </Link>
      <div
        className="flex items-center gap-4 sm:gap-10 rounded-xl px-4 sm:px-8 py-2.5 sm:py-3"
        style={{ backgroundColor: "#EDEDED" }}
      >
        {NAV_LINKS.map((link) =>
          link.external ? (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="text-[12px] sm:text-[14px] font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200"
            >
              {link.label}
            </a>
          ) : (
            <Link
              key={link.label}
              href={link.href}
              className="text-[12px] sm:text-[14px] font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200"
            >
              {link.label}
            </Link>
          ),
        )}
      </div>
    </nav>
  );
}
