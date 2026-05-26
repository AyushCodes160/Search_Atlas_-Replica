# Conversation Notes — Search Atlas Replica Build

> Captured 2026-05-26. This file preserves the planning + decisions made while building this project, so future sessions (and you) can pick up right where we left off.

---

## TL;DR

We're building a free, open-source replica of [Search Atlas](https://searchatlas.com) — an all-in-one SEO platform. First tool shipped: **Site Audit + AI Fix Suggester** (Google PageSpeed + Gemini AI). Built for Ayush's intern work at **gotoretreats.com** and **app.aibridge.one**.

---

## Context I Should Remember Next Time

- **User:** Ayush, working as an intern. Two client sites to optimize:
  - https://www.gotoretreats.com/
  - https://app.aibridge.one/
- **Repo:** https://github.com/AyushCodes160/Search_Atlas_-Replica.git (cloned to `~/Desktop/Search_Atlas_Replica`)
- **Build philosophy:** Free-tier only for now. No paid APIs. Pay for scale later.
- **Communication style during this session:** "caveman mode" — terse, bullet-heavy, low token count. Switch back on when asked.

---

## Background: What is SEO (the primer we walked through)

SEO = improving a website so it ranks higher in organic (unpaid) search results.

**Three pillars:**
1. **On-page SEO** — title tags, meta descriptions, headings, URL structure, internal links, alt text, schema markup, content quality (E-E-A-T).
2. **Off-page SEO** — backlinks (still the strongest ranking factor), domain authority, brand mentions.
3. **Technical SEO** — site speed (Core Web Vitals: LCP, INP, CLS), mobile-friendliness, HTTPS, robots.txt, XML sitemap, canonical tags, crawl budget, indexability.

**Key concepts:**
- **Search intent** — match content format to what searcher actually wants (informational/navigational/transactional/commercial).
- **Keyword research** — pick long-tail keywords with right intent. Tools: Google Keyword Planner (free), Ahrefs, SEMrush, DataForSEO API.
- **Content strategy** — pillar pages + topic clusters; update old content; avoid thin content.

**2026 reality:** AI search (Google AI Overviews, ChatGPT search, Perplexity) is changing the game. Optimize to be *cited by AI answers*, not just blue-link rankings.

**Measurement:** Google Search Console + GA4 + PageSpeed Insights are the free essentials.

---

## What is Search Atlas (the thing we're cloning)

All-in-one SEO suite by LinkGraph. Competitor to Ahrefs / SEMrush / Surfer. ~$99–$399/mo.

**Their feature set:**
- Site Explorer / Backlink Analyzer
- Keyword Researcher
- **OTTO SEO** — flagship AI agent that auto-applies on-page SEO fixes via JS snippet (their big differentiator)
- Content Genius / AI Writer
- Site Auditor
- Rank Tracker
- Local SEO tools
- White-label reporting

**Strengths:** all-in-one, OTTO is genuinely innovative, affordable.
**Weaknesses:** backlink data shallower than Ahrefs, support quality mixed.

---

## Our Strategy: Free-Tier Replica

| Need | Free option we chose / can use |
| --- | --- |
| Frontend hosting | Vercel free tier |
| Backend hosting | Render / Railway / Fly.io free |
| Database | Supabase free (500MB) or Neon free Postgres |
| Crawler | Python + Playwright |
| Keyword data | Google Autocomplete scrape + Google Trends |
| SERP data | DuckDuckGo API or scrape Google with proxies |
| Backlinks | Common Crawl (free dataset) |
| AI brain | **Gemini API free tier** (chosen), Groq, Ollama, Hugging Face |
| Site audit | **Google PageSpeed API** (chosen), Lighthouse |
| Auth | Supabase auth free |

**Realistic free MVP = 4 tools:**
1. ✅ Site audit + AI fix suggestions ← **BUILT FIRST**
2. ⏳ AI content writer w/ SEO score
3. ⏳ Keyword research (free sources)
4. ⏳ OTTO-lite snippet (JS snippet + AI fix injector)

**Differentiator:** Don't fight Ahrefs on data. Win on **automation + AI agent** (OTTO-style). That gap is still open in 2026.

---

## What's Built (v0.1)

**Stack:** Next.js 16 (App Router) + TypeScript + Tailwind + Gemini 1.5 Flash + PageSpeed Insights API.

**Files:**
- `src/app/page.tsx` — landing page with hero, audit tool, features grid
- `src/app/layout.tsx` — root layout
- `src/app/globals.css` — Tailwind + glass / gradient utilities
- `src/components/AuditTool.tsx` — URL input, quick-test buttons, score rings, results
- `src/app/api/audit/route.ts` — server route: PageSpeed → parse → Gemini → return JSON
- `.env.local` + `.env.example` — placeholder keys
- `README.md` — setup steps
- `package.json` / `tsconfig.json` / `tailwind.config.ts` / `postcss.config.mjs` / `next.config.mjs` — configs

**Features working:**
- URL input + audit trigger
- Quick-test buttons pre-wired for gotoretreats.com + app.aibridge.one
- 4 Lighthouse score rings (Performance, SEO, Accessibility, Best Practices)
- Core Web Vitals display (LCP, CLS, FCP, TBT, Speed Index)
- Top issues list (from Lighthouse audit IDs)
- AI Fix Suggestions section (Gemini-powered)
- Graceful fallback if Gemini key missing

---

## API Keys Needed (BOTH FREE)

User still needs to fill these in `.env.local`:

| Key | Where to get | Free quota |
| --- | --- | --- |
| `GEMINI_API_KEY` | https://aistudio.google.com/app/apikey | 15 RPM, 1500/day |
| `PAGESPEED_API_KEY` | https://developers.google.com/speed/docs/insights/v5/get-started | 25,000/day |

Without keys, UI loads but audit hits anonymous IP quota and Gemini section shows "add key" message.

---

## How to Run

```bash
cd ~/Desktop/Search_Atlas_Replica
npm install --legacy-peer-deps   # if not done
npm run dev
# → http://localhost:3000
```

---

## Next Steps (when ready)

1. ⏳ User adds real Gemini + PageSpeed keys to `.env.local`
2. ⏳ Test full audit flow on gotoretreats.com and app.aibridge.one
3. ⏳ User gives UI prompt → make it look 🔥
4. ⏳ Pick next tool to build: AI content writer / keyword research / **OTTO-lite** (the cool one)
5. ⏳ Deploy to Vercel free
6. ⏳ Push to GitHub repo

---

## Open Questions / Decisions Deferred

- **Demo mode?** User asked about testing without keys. Option to add fake-data demo mode for UI showcasing (not built yet).
- **Alternative to PageSpeed API?** Could run Lighthouse via npm package locally — no key, but slower and heavier. Not built; PageSpeed API is fine.
- **OTTO-lite design.** Not started. Approach: client installs a `<script>` tag → script scans DOM → server endpoint suggests meta/schema/alt fixes via Gemini → script injects into page. Needs auth + per-site dashboards eventually.
- **Database not yet added.** v0.1 is stateless. Will need Supabase for saving past audits, multi-user, OTTO sites.

---

## Conversation Style Notes

- Ayush asked for **caveman mode** ("ok caveman to save tokens") — terse, bullet-heavy. Use it when he asks.
- Otherwise: short and concise default.
- He's hands-on — wants me to actually code, not just plan. ✅
