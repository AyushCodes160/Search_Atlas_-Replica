# SEO Engine

A free, AI-powered SEO toolkit — a lightweight, open-source take on enterprise SEO platforms. The first module is a **Site Audit + AI Fix Suggester** that pairs Google PageSpeed Insights with Llama 3.3 70B on Groq to turn raw Lighthouse data into a code-aware fix plan.

## Features (v0.1)

- **Site Audit** — Real Lighthouse scores (Performance, SEO, Accessibility, Best Practices) plus Core Web Vitals (LCP, CLS, FCP, TBT, Speed Index).
- **AI Fix Plan** — Groq + Llama 3.3 reads the audit and writes prioritized, copy-paste-ready fixes scoped to your actual scores.
- **Source Classifier** — Auto-detects whether the URL is a web page or a JSON API. APIs skip Lighthouse and get a backend-focused review (timing, schema, completeness) instead of misleading SEO scores.
- **Quick-test buttons** — One-click audit for `gotoretreats.com`, `app.aibridge.one`, and a sample API endpoint.
- **Zero paid services** — Free Google PageSpeed (25,000 audits/day) + free Groq tier (14,400 fix reports/day). No card, no signup, no paywall.

## Tech Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS
- Google PageSpeed Insights API (free)
- Groq + Llama 3.3 70B Versatile (free tier)

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

Then visit http://localhost:3000.

## Environment Variables

| Key | Required | Purpose |
| --- | --- | --- |
| `GROQ_API_KEY` | Recommended | AI fix plan. Without it, audits still run but the AI section is disabled. |
| `PAGESPEED_API_KEY` | Optional | Higher PageSpeed quota. Works without a key for casual use. |

## Project Structure

```
src/
  app/
    page.tsx              # landing (video hero)
    audit/page.tsx        # audit + features + about + roadmap
    about/page.tsx        # standalone about
    api/audit/route.ts    # source classifier + audit pipeline
  components/
    AuditTool.tsx         # URL input, results renderer (web + api branches)
    Navbar.tsx, Logo.tsx  # shared chrome
mcp-server/
  index.js                # MCP server exposing project context to Claude chats
```

## Roadmap

- [ ] AI content writer (SEO-optimized drafts)
- [ ] Keyword research (Google Autocomplete + AI expansion)
- [ ] OTTO-lite — JS snippet that auto-applies on-page SEO fixes
- [ ] Backlink overview (Common Crawl)
- [ ] Rank tracker
