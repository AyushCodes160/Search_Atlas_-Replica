# SEO Engine

A free, AI-powered SEO toolkit — a lightweight, open-source take on enterprise SEO platforms (Search Atlas, Ahrefs, SEMrush). Built on Google PageSpeed + Llama 3.3 70B via Groq, with zero paid APIs.

The product is split into two halves:

- **Marketing site** at `/`, `/audit`, `/about` — sketchpad / hand-drawn aesthetic, introduces the project.
- **Dashboard** at `/app/*` — sidebar-driven app. 9 modules ship working, 7 are scaffolded placeholders that document exactly what each one needs (paid APIs / OAuth) to ship.

## Live modules

| Route | What it does |
| --- | --- |
| `/app/dashboard` | Overview with real stats pulled from `localStorage` (audits run, avg performance, saved keyword lists) + recent-activity cards. |
| `/app/site-audit` | Real Lighthouse audit + Llama-written fix plan + deep on-page parser (words, readability, headings, alt text, links, schema, meta). Issues are impact-sorted. Share-by-URL link + one-click Export PDF. Auto-detects JSON APIs and switches to a backend review (timing, schema, completeness). |
| `/app/site-crawl` | **Whole-site audit.** Auto-discovers every page (sitemap first, deep BFS link-crawl as fallback, noise-filtered, capped at 150). Fast mode: HTML SEO scan on all pages in seconds. Deep mode: full Lighthouse + AI fix plan per page. Site SEO health score, site-wide rollup, Llama site report, expandable per-page detail, CSV export. |
| `/app/bulk-audit` | Audit up to 10 URLs at once (concurrency 2), live progress, sortable result table, CSV export. |
| `/app/competitor-audit` | Side-by-side audit of your URL vs a competitor with per-metric deltas + a Llama-written comparison (where they win, where you win, what to copy). |
| `/app/keywords` | Google Autocomplete expansion (~200 ideas) + Llama topic clustering + heuristic intent classification + heuristic difficulty + long-tail/question filters + CSV export + saved lists. No paid keyword API needed. |
| `/app/content` | Fourteen-format AI writer: blog, buyer's guide, landing page, LinkedIn, YouTube script, TikTok script, Instagram caption, email, cold outreach, Google Ad, press release, Amazon listing, product description, meta tags. Plus point-of-view, 8 output languages, and 1–3 variations per draft. |
| `/app/atlas-agent` | Llama 3.3 chat with an SEO system prompt. Auto-loads your last audit from `localStorage` and injects it as context, so answers reference your real numbers. Adaptive starter prompts. |
| `/app/history` | Last 10 audits stored locally — filter (all / web / api), sort (newest, oldest, worst/best perf), one-tap re-run, open-in-tab, delete. |

## Scaffolded modules

Each ships a placeholder page that documents the exact dependency (paid API, OAuth, infra) needed to make it live:

`/app/otto-seo` · `/app/rank-tracker` · `/app/local-seo` · `/app/backlinks` · `/app/llm-visibility` · `/app/smart-ads` · `/app/reports`

## Tech Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS (custom hand-drawn sketchpad design tokens)
- Google PageSpeed Insights API (free)
- Google Autocomplete (free, unofficial)
- Groq + Llama 3.3 70B Versatile (free tier — 14,400 calls/day)
- Cheerio for server-side HTML parsing (on-page scan + crawl link extraction)
- MCP server (`mcp-server/`) for loading project context into Claude desktop clients

## Getting Started

```bash
# 1. Install deps
npm install --legacy-peer-deps

# 2. Add API keys to .env.local
#    Get free keys at:
#    - Groq:      https://console.groq.com/keys
#    - PageSpeed: https://developers.google.com/speed/docs/insights/v5/get-started
#                 (optional — works without a key, but rate-limited)

# 3. Run the dev server
npm run dev
```

Then visit http://localhost:3000 (marketing) or http://localhost:3000/app (dashboard).

## Environment Variables

| Key | Required | Purpose |
| --- | --- | --- |
| `GROQ_API_KEY` | Required | Powers the AI fix plan, Atlas Agent, Content Writer, Keyword clustering, Competitor comparison, and the whole-site report. |
| `PAGESPEED_API_KEY` | Optional | Higher PageSpeed quota. Works without a key for casual use. |

## How the whole-site audit works

The hard constraint is Vercel's 60-second function timeout — you can't audit a whole site in one server call — so the browser orchestrates, calling small API routes per page:

1. **`/api/crawl`** discovers pages: tries `sitemap.xml` / `sitemap_index.xml` first, falls back to a time-boxed breadth-first link crawl. Strips tracking params and filters out search/filter/admin/draft noise URLs, deduped and capped at 150.
2. **Fast mode** calls **`/api/scan`** (HTML skim, ~1s/page, no Lighthouse) on every page at concurrency 6 — title, meta, headings, alt, links, schema, derived issues.
3. **Deep mode** calls **`/api/audit`** (full Lighthouse + on-page + AI plan, ~25s/page) on every page at concurrency 2.
4. **`/api/site-summary`** makes one Groq call to write the site-wide health report.

## Project Structure

```
src/
  app/
    page.tsx                       # marketing landing (video hero)
    audit/page.tsx                 # public audit + features + about + roadmap
    about/page.tsx                 # standalone about narrative
    api/
      audit/route.ts               # source classifier + Lighthouse + on-page + AI pipeline
      scan/route.ts                # fast Lighthouse-free HTML SEO scan (whole-site fast mode)
      crawl/route.ts               # page discovery (sitemap + BFS link crawl + noise filter)
      site-summary/route.ts        # Llama whole-site health report
      compare/route.ts             # Llama competitor comparison
      keywords/route.ts            # Autocomplete + Llama clustering + difficulty
      content/route.ts             # fourteen-format AI writer
      agent/route.ts               # Atlas Agent chat (accepts audit context)
    app/
      layout.tsx                   # dashboard shell (sidebar + main)
      page.tsx                     # redirect -> /app/dashboard
      dashboard/page.tsx           # overview + real localStorage stats + recent activity
      site-audit/page.tsx          # single-page audit
      site-crawl/page.tsx          # whole-site audit (fast/deep modes)
      bulk-audit/page.tsx          # up to 10 URLs
      competitor-audit/page.tsx    # you vs them
      keywords/page.tsx            # keyword research UI
      content/page.tsx             # content writer UI
      atlas-agent/page.tsx         # context-aware chat UI
      history/page.tsx             # audit history
      otto-seo/                    # ┐
      rank-tracker/                # │
      local-seo/                   # │
      backlinks/                   # │ placeholder pages with what each
      llm-visibility/              # │ module needs to ship
      smart-ads/                   # │
      reports/                     # ┘
  components/
    AuditTool.tsx                  # URL input + results (web + api branches), share + PDF
    RoadmapCarousel.tsx            # marketing roadmap carousel
    Sidebar.tsx                    # responsive sidebar (hamburger on mobile)
    Navbar.tsx                     # responsive marketing nav (hamburger on mobile)
    Logo.tsx, PageHeader.tsx       # shared chrome
    ComingSoon.tsx                 # placeholder template for gated modules
  lib/
    onPage.ts                      # cheerio on-page parser (words, readability, headings, etc.)
    auditContext.ts                # localStorage audit context + rolling history helpers
mcp-server/
  index.js                         # MCP server exposing project context to Claude chats
```

## Roadmap

- [x] Site Audit + AI fix plan + deep on-page parser
- [x] Whole-site audit (auto-crawl, fast + deep modes)
- [x] Bulk Audit (up to 10 URLs)
- [x] Competitor Audit (side-by-side + AI comparison)
- [x] AI Content Writer (fourteen formats, POV, languages, variations)
- [x] Keyword research (Autocomplete + clustering + difficulty + saved lists)
- [x] Atlas Agent (context-aware Llama chat)
- [x] Audit History + share link + Export PDF
- [x] Responsive sidebar + marketing nav (mobile drawer)
- [ ] Auth + database (per-user saved audits, scheduled re-crawls)
- [ ] OTTO-lite — JS snippet that auto-applies on-page SEO fixes
- [ ] Rank Tracker — needs paid SerpAPI / DataForSEO
- [ ] Local SEO + GBP — needs Google Business Profile OAuth
- [ ] Backlinks — needs Ahrefs / Majestic
- [ ] LLM Visibility (ChatGPT / Claude / Gemini / Perplexity tracking)
- [ ] Smart Ads (Google Ads automation)
- [ ] Reports (white-label PDF export)
