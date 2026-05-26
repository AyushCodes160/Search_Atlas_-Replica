# Search Atlas Replica

A free, AI-powered SEO toolkit — a lightweight, open-source take on Search Atlas. The first tool is a **Site Audit + AI Fix Suggester** that pairs Google PageSpeed Insights with Gemini to turn raw Lighthouse data into actionable fixes.

## Features (v0.1)

- **Site Audit** — Real Lighthouse scores (Performance, SEO, Accessibility, Best Practices) plus Core Web Vitals.
- **AI Fix Suggestions** — Gemini reads the audit and writes a prioritized, code-aware fix plan.
- **Quick-test buttons** — One-click audit for `gotoretreats.com` and `app.aibridge.one`.
- **Zero paid services** — Built entirely on free APIs (Google PageSpeed + Gemini free tier).

## Tech Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS
- Google PageSpeed Insights API (free)
- Google Gemini 1.5 Flash (free tier)

## Getting Started

```bash
# 1. Install deps
npm install --legacy-peer-deps

# 2. Add API keys to .env.local
#    (the file already exists with placeholders)
#    Get free keys at:
#    - Gemini:    https://aistudio.google.com/app/apikey
#    - PageSpeed: https://developers.google.com/speed/docs/insights/v5/get-started
#                 (optional — works without a key, but rate-limited)

# 3. Run the dev server
npm run dev
```

Then visit http://localhost:3000.

## Environment Variables

| Key | Required | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | Recommended | AI fix suggestions. Without it, audits still work but the AI section is disabled. |
| `PAGESPEED_API_KEY` | Optional | Higher PageSpeed quota. Works without a key for casual use. |

## Roadmap

- [ ] AI content writer (SEO-optimized drafts)
- [ ] Keyword research (Google Autocomplete + AI expansion)
- [ ] OTTO-lite — JS snippet that auto-applies on-page SEO fixes
- [ ] Backlink overview (Common Crawl)
- [ ] Rank tracker

## License

MIT.
