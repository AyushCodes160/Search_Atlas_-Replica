"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Logo } from "./Logo";

const GITHUB_URL = "https://github.com/AyushCodes160/SEO_Engine";

const NAV_LINKS: { label: string; href: string; external?: boolean }[] = [
  { label: "Dashboard", href: "/app" },
  { label: "Features", href: "/audit#features" },
  { label: "About", href: "/about" },
  { label: "GitHub", href: GITHUB_URL, external: true },
];

export function Navbar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [path]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  return (
    <>
      <nav className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-10 py-3 sm:py-4 bg-paper/85 backdrop-blur-md border-b-2 border-dashed border-ink/20">
        <Link href="/" aria-label="Home" className="flex items-center gap-2.5 group">
          <span className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-paper border-2 border-ink/80 shadow-[2px_2px_0_0_rgba(44,36,23,0.85)] group-hover:rotate-[-8deg] transition-transform duration-300">
            <Logo />
          </span>
          <span className="font-hand text-[20px] sm:text-[22px] text-ink leading-none mt-1">
            SEO Engine
          </span>
        </Link>

        {/* Desktop nav pill */}
        <div className="hidden md:flex items-center gap-1 sm:gap-2 bg-paper-200/70 border-2 border-ink/70 rounded-full px-2 sm:px-4 py-1 shadow-[3px_3px_0_0_rgba(44,36,23,0.8)]">
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

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="md:hidden w-10 h-10 rounded-full bg-paper border-2 border-ink/85 shadow-[2px_2px_0_0_rgba(44,36,23,0.85)] flex items-center justify-center"
        >
          <Menu className="w-5 h-5 text-ink" strokeWidth={2.2} />
        </button>
      </nav>

      {/* Mobile drawer + backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          aria-hidden
          className="md:hidden fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm"
        />
      )}
      <aside
        className={`md:hidden fixed top-0 right-0 bottom-0 z-50 w-72 max-w-[85vw] bg-paper border-l-2 border-dashed border-ink/30 shadow-xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!open}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
          className="absolute top-3 right-3 w-10 h-10 rounded-full bg-paper border-2 border-ink/85 flex items-center justify-center"
        >
          <X className="w-5 h-5 text-ink" strokeWidth={2.2} />
        </button>

        <div className="px-5 pt-6 pb-4 border-b-2 border-dashed border-ink/15">
          <span className="font-hand text-clay text-[15px]">~ menu ~</span>
          <h2 className="font-hand text-[28px] text-ink leading-tight mt-1">SEO Engine</h2>
        </div>

        <nav className="px-3 py-4 space-y-1">
          {NAV_LINKS.map((link) =>
            link.external ? (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="block font-hand text-[20px] text-ink hover:text-teal-accent transition-colors px-3 py-2 rounded-lg hover:bg-paper-50/60"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.label}
                href={link.href}
                className="block font-hand text-[20px] text-ink hover:text-teal-accent transition-colors px-3 py-2 rounded-lg hover:bg-paper-50/60"
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>
      </aside>
    </>
  );
}
