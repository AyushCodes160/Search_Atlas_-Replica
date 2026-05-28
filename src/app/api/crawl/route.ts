import { NextRequest, NextResponse } from "next/server";
import { load } from "cheerio";

export const runtime = "nodejs";
export const maxDuration = 45;

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// File extensions we never want to "audit" as pages.
const ASSET_RE = /\.(jpg|jpeg|png|gif|webp|svg|ico|css|js|mjs|json|xml|pdf|zip|mp4|mp3|woff2?|ttf|eot|rss|txt)(\?|$)/i;

function normalizeOrigin(raw: string): URL {
  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return new URL(withProto);
}

function sameSite(a: URL, b: URL): boolean {
  const stripWww = (h: string) => h.replace(/^www\./, "");
  return stripWww(a.hostname) === stripWww(b.hostname);
}

// Query params that are tracking/session noise — strip them so the same page
// with ?utm_... doesn't become a separate "page".
const TRACKING_PARAM_RE = /^(utm_|fbclid|gclid|gbraid|wbraid|mc_|ref$|ref_|source$|_ga|igshid|si$|spm$)/i;

function cleanUrl(u: URL): string {
  u.hash = "";
  // Strip tracking params but keep meaningful ones.
  const keep = new URLSearchParams();
  for (const [k, v] of u.searchParams) {
    if (!TRACKING_PARAM_RE.test(k)) keep.append(k, v);
  }
  u.search = keep.toString();
  let s = u.toString();
  if (s.endsWith("/") && u.pathname !== "/") s = s.slice(0, -1);
  return s;
}

// Path patterns that aren't real content pages worth auditing.
const NOISE_PATH_RE =
  /\/(draft|preview|login|log-in|signin|sign-in|signup|sign-up|register|logout|account|admin|wp-admin|wp-login|cart|checkout|basket|wishlist|compare|thank-you|thankyou)(\/|$)/i;
const ALLZERO_UUID_RE = /0{8}-0{4}-0{4}-0{4}-0{12}/;

// Expects a URL that's already had tracking params stripped (via cleanUrl).
// Any leftover query string is treated as a search/filter/faceted variant —
// for an SEO audit we want canonical clean-path pages, not every filter combo.
function isNoise(u: URL): boolean {
  if (NOISE_PATH_RE.test(u.pathname)) return true;
  if (ALLZERO_UUID_RE.test(u.pathname)) return true;
  if (/\/(new|search|s)$/i.test(u.pathname)) return true;
  if (u.search) return true;
  return false;
}

async function fetchText(url: string, timeoutMs = 12_000): Promise<{ ok: boolean; text: string; contentType: string }> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, {
      headers: { "User-Agent": BROWSER_UA, Accept: "*/*" },
      redirect: "follow",
      cache: "no-store",
      signal: ctrl.signal,
    });
    clearTimeout(t);
    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    if (!res.ok) return { ok: false, text: "", contentType };
    return { ok: true, text: await res.text(), contentType };
  } catch {
    return { ok: false, text: "", contentType: "" };
  }
}

// Pull <loc> entries out of a sitemap. Handles sitemap-index (nested sitemaps).
async function fromSitemap(origin: URL, limit: number): Promise<string[] | null> {
  const candidates = [
    new URL("/sitemap.xml", origin).toString(),
    new URL("/sitemap_index.xml", origin).toString(),
  ];

  for (const sm of candidates) {
    const { ok, text } = await fetchText(sm);
    if (!ok || !text.includes("<loc>")) continue;

    const locs = Array.from(text.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)).map((m) => m[1]);
    const isIndex = /<sitemapindex/i.test(text);

    if (isIndex) {
      // Fetch nested sitemaps (cap how many we expand to stay fast).
      const urls = new Set<string>();
      for (const childSm of locs.slice(0, 8)) {
        if (urls.size >= limit) break;
        const child = await fetchText(childSm);
        if (!child.ok) continue;
        for (const m of child.text.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) {
          urls.add(m[1]);
          if (urls.size >= limit * 3) break;
        }
      }
      return Array.from(urls);
    }
    return locs;
  }
  return null;
}

function extractLinks(html: string, base: URL, origin: URL): string[] {
  const $ = load(html);
  const out: string[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    try {
      const abs = new URL(href, base);
      if (abs.protocol !== "http:" && abs.protocol !== "https:") return;
      if (!sameSite(abs, origin)) return;
      if (ASSET_RE.test(abs.pathname)) return;
      const c = cleanUrl(abs);
      if (isNoise(new URL(c))) return;
      out.push(c);
    } catch {
      /* skip bad href */
    }
  });
  return out;
}

// Fallback when there's no sitemap: breadth-first crawl the site by following
// internal links, level by level, time-boxed so the serverless function never
// times out. Discovers the whole site structure, not just the homepage.
async function fromLinkCrawl(origin: URL, limit: number): Promise<string[]> {
  const deadline = Date.now() + 28_000; // stay inside the 45s function budget
  const home = cleanUrl(origin);
  const discovered = new Set<string>([home]);
  const visited = new Set<string>();
  let frontier: string[] = [home];

  while (frontier.length && discovered.size < limit && Date.now() < deadline) {
    // Fetch this level in parallel batches of 5.
    const batch = frontier.filter((u) => !visited.has(u)).slice(0, 12);
    frontier = frontier.slice(batch.length);
    const nextFrontier: string[] = [];

    for (let i = 0; i < batch.length; i += 5) {
      if (Date.now() >= deadline) break;
      const slice = batch.slice(i, i + 5);
      const results = await Promise.all(
        slice.map(async (u) => {
          visited.add(u);
          const { ok, text, contentType } = await fetchText(u, 9_000);
          if (!ok || !contentType.includes("text/html")) return [];
          return extractLinks(text, new URL(u), origin);
        }),
      );
      for (const links of results) {
        for (const link of links) {
          if (!discovered.has(link)) {
            discovered.add(link);
            nextFrontier.push(link);
            if (discovered.size >= limit) break;
          }
        }
      }
    }
    frontier.push(...nextFrontier);
  }
  return Array.from(discovered);
}

export async function POST(req: NextRequest) {
  try {
    const { url, maxPages } = (await req.json()) as { url?: string; maxPages?: number };
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "url required" }, { status: 400 });
    }
    let origin: URL;
    try {
      origin = normalizeOrigin(url.trim());
    } catch {
      return NextResponse.json({ error: "invalid url" }, { status: 400 });
    }

    // Safety ceiling so a giant site (or a crawler trap) can't run for hours
    // or burn the daily PageSpeed quota. Not surfaced as a knob — automatic.
    const limit = Math.max(1, Math.min(150, Math.floor(maxPages || 150)));

    let source: "sitemap" | "links" = "sitemap";
    let pages = await fromSitemap(origin, limit);
    if (!pages || pages.length === 0) {
      source = "links";
      pages = await fromLinkCrawl(origin, limit);
    }

    // Normalize, filter assets + cross-site, dedupe, ensure homepage is first.
    const seen = new Set<string>();
    const clean: string[] = [];
    const home = cleanUrl(origin);
    seen.add(home);
    clean.push(home);
    for (const p of pages) {
      try {
        const u = new URL(p);
        if (!sameSite(u, origin)) continue;
        if (ASSET_RE.test(u.pathname)) continue;
        const c = cleanUrl(u);
        if (isNoise(new URL(c))) continue;
        if (seen.has(c)) continue;
        seen.add(c);
        clean.push(c);
      } catch {
        /* skip */
      }
    }

    const total = clean.length;
    const limited = clean.slice(0, limit);

    return NextResponse.json({
      origin: origin.origin,
      source,
      total,
      capped: total > limit,
      cap: limit,
      pages: limited,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Crawl failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
