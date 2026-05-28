"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import { Menu, X, LogIn, LogOut, UserPlus, ChevronDown } from "lucide-react";
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
  const { data: session, status } = useSession();
  const user = session?.user;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the account dropdown on outside click.
  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  // Close dropdown on route change.
  useEffect(() => {
    setMenuOpen(false);
  }, [path]);

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

        {/* Desktop auth control */}
        <div className="hidden md:flex items-center">
          {status === "loading" ? null : user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="flex items-center gap-2 bg-paper border-2 border-ink/80 rounded-full pl-1.5 pr-2.5 py-1 shadow-[2px_2px_0_0_rgba(44,36,23,0.8)] hover:-translate-y-0.5 transition-transform"
              >
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.image} alt={user.name || "you"} className="w-7 h-7 rounded-full border border-ink/70" />
                ) : (
                  <span className="w-7 h-7 rounded-full bg-paper-200 border border-ink/70 flex items-center justify-center font-hand text-[13px]">
                    {(user.name || user.email || "?").charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="font-hand text-[17px] text-ink leading-none">
                  {(user.name || user.email || "").split(" ")[0]}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-ink-soft transition-transform ${menuOpen ? "rotate-180" : ""}`} />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-56 bg-paper border-2 border-ink/80 rounded-lg shadow-[3px_3px_0_0_rgba(44,36,23,0.8)] overflow-hidden z-50"
                >
                  <div className="px-4 py-3 border-b-2 border-dashed border-ink/15">
                    <div className="font-sans text-[13px] text-ink truncate">{user.name}</div>
                    <div className="font-sans text-[11.5px] text-ink-soft truncate">{user.email}</div>
                  </div>
                  <button
                    role="menuitem"
                    onClick={() => signIn("google", { callbackUrl: "/" })}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 font-hand text-[16px] text-ink hover:bg-paper-50/70"
                  >
                    <UserPlus className="w-4 h-4 text-teal-accent" /> Use a different account
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 font-hand text-[16px] text-ink hover:bg-paper-50/70 border-t-2 border-dashed border-ink/15"
                  >
                    <LogOut className="w-4 h-4 text-sunset" /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => signIn("google", { callbackUrl: "/" })}
              className="btn-led inline-flex items-center gap-2 rounded-full px-4 py-2 font-hand text-[18px] shadow-[2px_2px_0_0_rgba(44,36,23,0.85)]"
            >
              <LogIn className="w-4 h-4" /> Sign in
            </button>
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

        {/* Mobile account section */}
        <div className="px-5 py-4 mt-2 border-t-2 border-dashed border-ink/15">
          {status === "loading" ? null : user ? (
            <div className="flex items-center gap-3">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt={user.name || "you"} className="w-9 h-9 rounded-full border-2 border-ink/80" />
              ) : (
                <span className="w-9 h-9 rounded-full bg-paper-200 border-2 border-ink/80 flex items-center justify-center font-hand text-[15px]">
                  {(user.name || user.email || "?").charAt(0).toUpperCase()}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-sans text-[13px] text-ink truncate">{user.name || user.email}</div>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="font-hand text-[14px] text-ink-soft hover:text-sunset inline-flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" /> sign out
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => signIn("google", { callbackUrl: "/" })}
              className="btn-led w-full inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 font-hand text-[19px] shadow-[2px_2px_0_0_rgba(44,36,23,0.85)]"
            >
              <LogIn className="w-4 h-4" /> Sign in with Google
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
