# SEO Engine

A free, AI-powered SEO toolkit — a lightweight, open-source take on enterprise SEO platforms (Search Atlas, Ahrefs, SEMrush). Built on Google PageSpeed + Llama 3.3 70B via Groq, with zero paid APIs in v0.1.

The product is split into two halves:

- **Marketing site** at `/`, `/audit`, `/about` — sketchpad / hand-drawn aesthetic, introduces the project.
- **Dashboard** at `/app/*` — sidebar-driven app with 12 module routes. 5 modules ship working, 7 are scaffolded placeholders that document exactly what each one needs (paid APIs / OAuth) to ship.

## Live modules (v0.1)

| Route | What it does |
| --- | --- |
| `/app/dashboard` | Overview, module grid, stat tiles. |
| `/app/site-audit` | Real Lighthouse audit + Llama-written fix plan. Auto-detects JSON APIs and switches to a backend review (timing, schema, completeness). |
| `/app/keywords` | Google Autocomplete expansion (~200 ideas) + Llama topic clustering + heuristic intent classification. No paid keyword API needed. |
| `/app/content` | Six-format AI writer: blog post, LinkedIn, Google Ad, email, meta tags, product description. Strict prompt + char-counted output. |
| `/app/atlas-agent` | Llama 3.3 chat with an SEO system prompt + starter prompts. |

## Scaffolded modules

Each ships a placeholder page that documents the exact dependency (paid API, OAuth, infra) needed to make it live:

`/app/otto-seo` · `/app/rank-tracker` · `/app/local-seo` · `/app/backlinks` · `/app/llm-visibility` · `/app/smart-ads` · `/app/reports`

## Tech Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS
- Google PageSpeed Insights API (free)
- Google Autocomplete (free, unofficial)
- Groq + Llama 3.3 70B Versatile (free tier — 14,400 calls/day)
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
| `GROQ_API_KEY` | Required | Powers the AI fix plan, Atlas Agent, Content Writer, Keyword clustering. |
| `PAGESPEED_API_KEY` | Optional | Higher PageSpeed quota. Works without a key for casual use. |

## Project Structure

```
src/
  app/
    page.tsx                       # marketing landing (video hero)
    audit/page.tsx                 # public audit + features + about + roadmap
    about/page.tsx                 # standalone about narrative
    api/
      audit/route.ts               # source classifier + audit pipeline
      keywords/route.ts            # Autocomplete + Llama clustering
      content/route.ts             # six-format AI writer
      agent/route.ts               # Atlas Agent chat
    app/
      layout.tsx                   # dashboard shell (sidebar + main)
      page.tsx                     # redirect -> /app/dashboard
      dashboard/page.tsx           # overview + module grid
      site-audit/page.tsx          # site audit inside dashboard
      keywords/page.tsx            # keyword research UI
      content/page.tsx             # content writer UI
      atlas-agent/page.tsx         # chat UI
      otto-seo/                    # ┐
      rank-tracker/                # │
      local-seo/                   # │
      backlinks/                   # │ placeholder pages with what each
      llm-visibility/              # │ module needs to ship
      smart-ads/                   # │
      reports/                     # ┘
  components/
    AuditTool.tsx                  # URL input + results (web + api branches)
    RoadmapCarousel.tsx            # marketing roadmap carousel
    Sidebar.tsx                    # responsive sidebar (hamburger on mobile)
    Navbar.tsx                     # responsive marketing nav (hamburger on mobile)
    Logo.tsx, PageHeader.tsx       # shared chrome
    ComingSoon.tsx                 # placeholder template for gated modules
mcp-server/
  index.js                         # MCP server exposing project context to Claude chats
```

## Roadmap

- [x] Site Audit + AI fix plan
- [x] AI Content Writer (six formats)
- [x] Keyword research (Autocomplete + Llama clustering)
- [x] Atlas Agent (Llama chat)
- [x] Responsive sidebar + marketing nav (mobile drawer)
- [ ] OTTO-lite — JS snippet that auto-applies on-page SEO fixes
- [ ] Rank Tracker — needs paid SerpAPI / DataForSEO
- [ ] Local SEO + GBP — needs Google Business Profile OAuth
- [ ] Backlinks — needs Ahrefs / Majestic
- [ ] LLM Visibility (ChatGPT / Claude / Gemini / Perplexity tracking)
- [ ] Smart Ads (Google Ads automation)
- [ ] Reports (white-label PDF export)
