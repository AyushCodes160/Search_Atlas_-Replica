# SEO Engine

A free, AI-powered SEO toolkit — a lightweight, open-source alternative to enterprise SEO platforms (Search Atlas, Ahrefs, SEMrush). Built on Google PageSpeed + Llama 3.3 70B via Groq + SerpAPI, with zero paid APIs required.

**All 18 modules are fully live.** No placeholders, no coming-soon pages.

- **Marketing site** at `/`, `/audit`, `/about` — sketchpad / hand-drawn aesthetic.
- **Dashboard** at `/app/*` — sidebar-driven app with 18 working modules.

## Modules

| Route | Module | What it does |
| --- | --- | --- |
| `/app/dashboard` | Dashboard | Overview with stats, recent audits, recent keyword lists. |
| `/app/site-audit` | Site Audit | Lighthouse audit + Llama fix plan + deep on-page parser. Share link + PDF export. |
| `/app/site-crawl` | Whole-Site Audit | Auto-crawl entire sites. Fast mode (HTML scan) or Deep mode (full Lighthouse per page). |
| `/app/bulk-audit` | Bulk Audit | Audit up to 10 URLs at once with CSV export. |
| `/app/competitor-audit` | Competitor Audit | Side-by-side single-page comparison with AI analysis. |
| `/app/competitor-crawl` | Competitor Site Audit | Whole-site vs whole-site comparison. |
| `/app/keywords` | Keywords | Google Autocomplete + Llama clustering. ~200 keyword ideas with intent + difficulty. |
| `/app/otto-seo` | OTTO SEO | Auto-apply metadata fixes. Generates JS injection script for CMS override. |
| `/app/content` | Content Editor | 14-format AI writer + real-time SEO Grader scoring on every keystroke. |
| `/app/rank-tracker` | Rank Tracker | Track Google keyword rankings via SerpAPI. Volume/CPC estimated by Groq. |
| `/app/local-seo` | Local SEO | NAP audit, schema validation, Maps embed check, 5×5 grid heatmap. |
| `/app/llm-visibility` | LLM Visibility | Track brand mentions in ChatGPT, Claude, Gemini, Perplexity. |
| `/app/backlinks` | Backlinks | AI-estimated backlink profile, anchor text, toxic risk, competitor gap analysis. |
| `/app/smart-ads` | Smart Ads | AI ad copy for Google, Meta, LinkedIn. 3 A/B variants with preview cards. |
| `/app/reports` | Reports | Aggregate all module data into branded SEO report with AI summary + PDF export. |
| `/app/atlas-agent` | Atlas Agent | Llama 3.3 chat with SEO context from your audits. |
| `/app/history` | Audit History | Browse past single-page audits. |
| `/app/crawl-history` | Crawl History | Browse past whole-site crawls. |

## Tech Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Vanilla CSS (custom hand-drawn sketchpad design tokens)
- Google PageSpeed Insights API (free)
- Google Autocomplete (free)
- Groq + Llama 3.3 70B Versatile (free tier — 14,400 calls/day)
- SerpAPI (free tier — 100 searches/month)
- Cheerio for server-side HTML parsing
- Auth.js v5 (GitHub + Google OAuth) + Prisma + Neon Postgres
- MCP server (`mcp-server/`) for loading project context into AI desktop clients

## Getting Started

```bash
# 1. Install deps
npm install --legacy-peer-deps

# 2. Add API keys to .env.local
#    Get free keys at:
#    - Groq:      https://console.groq.com/keys
#    - SerpAPI:   https://serpapi.com/manage-api-key (100 free/month)
#    - PageSpeed: https://developers.google.com/speed/docs/insights/v5/get-started

# 3. Run the dev server
npm run dev
```

Then visit http://localhost:3000 (marketing) or http://localhost:3000/app (dashboard).

## Environment Variables

| Key | Required | Purpose |
| --- | --- | --- |
| `GROQ_API_KEY` | Required | Powers all AI features (fix plans, content, keywords, rank tracker, backlinks, smart ads, reports, OTTO, local SEO, LLM visibility, Atlas Agent). |
| `SERPAPI_API_KEY` | Optional | Real Google SERP data for Rank Tracker (100 free searches/month). Falls back to Groq simulation without it. |
| `PAGESPEED_API_KEY` | Optional | Higher PageSpeed quota. Works without a key for casual use. |
| `DATABASE_URL` | Auth only | Neon Postgres pooled connection string. |
| `DIRECT_URL` | Auth only | Neon direct connection (for Prisma migrations). |
| `AUTH_SECRET` | Auth only | Auth.js session secret. Generate with `openssl rand -base64 32`. |
| `GITHUB_ID` | Auth only | GitHub OAuth app client ID. |
| `GITHUB_SECRET` | Auth only | GitHub OAuth app client secret. |
| `GOOGLE_CLIENT_ID` | Auth only | Google OAuth web client ID. |
| `GOOGLE_CLIENT_SECRET` | Auth only | Google OAuth client secret. |

Auth keys are optional. Without them the app runs fully — sign-in just won't be available and data stays in localStorage.

## Auth & Accounts (optional)

Sign-in is **optional** — every tool works anonymously (data in `localStorage`). Signing in with GitHub or Google persists audits, keyword lists, rank tracker data, and crawls to your account across devices.

```bash
# Create the tables in your Neon DB
npm run db:push
```

## How the Whole-Site Audit Works

The browser orchestrates multiple small API calls to stay within Vercel's 60-second function timeout:

1. **`/api/crawl`** discovers pages: tries sitemap first, falls back to BFS link crawl. Capped at 150 pages.
2. **Fast mode** calls `/api/scan` (~1s/page) on all pages at concurrency 6.
3. **Deep mode** calls `/api/audit` (~25s/page) with full Lighthouse + AI fix plan.
4. **`/api/site-summary`** generates a Groq-powered site-wide health report.

## Project Structure

```
src/
  app/
    page.tsx                    # marketing landing
    audit/page.tsx              # public audit page
    about/page.tsx              # about page
    api/
      audit/route.ts            # Lighthouse + on-page + AI pipeline
      scan/route.ts             # fast HTML SEO scan
      crawl/route.ts            # page discovery
      site-summary/route.ts     # AI site health report
      compare/route.ts          # competitor comparison
      keywords/route.ts         # Autocomplete + clustering
      content/route.ts          # 14-format AI writer
      agent/route.ts            # Atlas Agent chat
      rank-tracker/route.ts     # SerpAPI + Groq volume estimation
      smart-ads/generate/       # AI ad copy generator
      backlinks/analyze/        # AI backlink profile analyzer
      reports/summary/          # AI executive summary for reports
      otto/                     # OTTO SEO fix generation
      local-seo/                # Local SEO analysis
      llm-visibility/           # LLM brand tracking
      me/                       # per-user CRUD (audits, keywords, crawls, etc.)
    app/
      layout.tsx                # dashboard shell (sidebar + main)
      dashboard/                # overview
      site-audit/               # single-page audit
      site-crawl/               # whole-site audit
      bulk-audit/               # up to 10 URLs
      competitor-audit/         # you vs them
      competitor-crawl/         # site vs site
      keywords/                 # keyword research
      otto-seo/                 # auto-apply fixes
      content/                  # AI content writer
      rank-tracker/             # SERP tracking
      local-seo/                # NAP + heatmap
      llm-visibility/           # AI brand tracking
      backlinks/                # backlink analysis
      smart-ads/                # ad copy generator
      reports/                  # aggregated reports
      atlas-agent/              # AI chat
      history/                  # audit history
      crawl-history/            # crawl history
  components/
    Sidebar.tsx                 # responsive sidebar
    AuditTool.tsx               # audit UI (web + API branches)
    PageHeader.tsx, Logo.tsx    # shared chrome
  lib/
    onPage.ts                   # cheerio on-page parser
    auditContext.ts             # localStorage audit helpers
    prisma.ts                   # PrismaClient singleton
prisma/
  schema.prisma                 # DB schema
mcp-server/
  index.js                      # MCP server for AI desktop clients
```

## Data Transparency

Every metric in the platform falls into one of three tiers:

**Tier 1 — Deterministic (Real Data)**
Lighthouse scores, Core Web Vitals, SERP ranking positions, SERP features, on-page DOM data (word count, headings, alts, links, schema, meta tags), and keyword ideas from Google Autocomplete. These come from Google's own APIs or our Cheerio HTML parser — 100% factual.

**Tier 2 — AI Estimation (Groq / Llama 3.3 70B)**
Search Volume, CPC, Backlink profiles (DA, referring domains, anchor text), Local SEO grid heatmap rankings, LLM Visibility scores, and Keyword Difficulty. These are generated by prompting Llama 3.3 with calibrated reference data. Useful for strategy, not ground truth. Upgrading to DataForSEO (~$50/mo) or Ahrefs ($129/mo) would make these deterministic.

**Tier 3 — Heuristic Fallback (No API)**
When Groq is rate-limited, Vol/CPC fall back to keyword-aware heuristics (word count analysis, brand/tech detection, commercial intent signals, string hash for per-keyword variation). Deterministic and varied, but not real data.

The platform's core value — **Lighthouse auditing + AI fix plans + SERP tracking — runs on 100% real data.**

## Roadmap

All 18 modules are live. Future enhancements:

- [ ] DataForSEO integration for deterministic Vol/CPC/Backlink data
- [ ] Groq paid tier or model routing (Groq for speed, GPT-4o for complex reasoning)
- [ ] Scheduled re-crawls + email alerts
- [ ] Google Ads API integration for Smart Ads campaign publishing
- [ ] Stripe integration for monetization
- [ ] Team/agency multi-user accounts
- [ ] More export formats (CSV, XLSX)
