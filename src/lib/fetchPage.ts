// Shared page-fetching helpers for every audit feature (crawl / scan / audit).
//
// Goal: look like a real modern browser so lightly-protected sites don't serve
// us a stripped bot shell or redirect to the homepage. This does NOT defeat
// enterprise WAFs (Cloudflare, Akamai, PerimeterX, Incapsula, DataDome) — those
// fingerprint TLS and run JS challenges that a server-side fetch cannot pass.
// For those, detectFirewallBlock() lets callers report an honest block instead
// of silently returning inaccurate results.

const CHROME_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const DEFAULT_ACCEPT =
  "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8";

// Realistic Chrome request headers. Note: we deliberately do NOT set
// Accept-Encoding — Node's fetch (undici) negotiates and decompresses on its
// own, and overriding it can hand us undecoded bytes.
export function browserHeaders(accept: string = DEFAULT_ACCEPT): Record<string, string> {
  return {
    "User-Agent": CHROME_UA,
    Accept: accept,
    "Accept-Language": "en-US,en;q=0.9",
    Connection: "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
  };
}

export type BlockResult = { blocked: boolean; status: number; vendor: string | null };

const WAF_MARKERS: { vendor: string; re: RegExp }[] = [
  { vendor: "Cloudflare", re: /just a moment\.\.\.|cf-browser-verification|cf-mitigated|attention required.{0,40}cloudflare|cloudflare ray id|challenge-platform|_cf_chl/i },
  { vendor: "Akamai", re: /akamaighost|errors\.edgesuite\.net|access denied.{0,40}reference #|\breference #\d{2}/i },
  { vendor: "PerimeterX / HUMAN", re: /px-captcha|perimeterx|human challenge|_pxhd/i },
  { vendor: "Imperva / Incapsula", re: /incapsula incident|_incapsula_|request unsuccessful\. incapsula|pardon our interruption/i },
  { vendor: "DataDome", re: /datadome|geo\.captcha-delivery\.com|dd_cookie/i },
  { vendor: "Sucuri", re: /sucuri website firewall|cloudproxy/i },
];

// Decide whether a response is a firewall/anti-bot block. WAF challenge pages
// often return HTTP 200 with a challenge body, so we check the body too — not
// just the status code.
export function detectFirewallBlock(status: number, bodySample: string): BlockResult {
  const body = (bodySample || "").slice(0, 8000);
  for (const m of WAF_MARKERS) {
    if (m.re.test(body)) return { blocked: true, status, vendor: m.vendor };
  }
  if (status === 401 || status === 403 || status === 429 || status === 503) {
    return { blocked: true, status, vendor: null };
  }
  return { blocked: false, status, vendor: null };
}

// Human-readable description for the frontend.
export function blockMessage(vendor: string | null, status: number): string {
  const who = vendor ? `${vendor}` : "an anti-bot firewall";
  return `This site is protected by ${who} (HTTP ${status || "challenge"}) and blocks automated audits. Try a site you own, or one without enterprise bot protection.`;
}

// Randomized human-like delay to avoid tripping rate limits between requests.
export function humanDelay(minMs = 1000, maxMs = 3000): Promise<void> {
  const ms = Math.floor(minMs + Math.random() * Math.max(0, maxMs - minMs));
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type FetchedPage = {
  ok: boolean;
  status: number;
  finalUrl: string;
  contentType: string;
  body: string;
  block: BlockResult;
  error?: string;
};

// Unified fetch used by crawl / scan / audit. Always returns a result object
// (never throws) and always reports block + status so callers can react.
export async function fetchPage(
  url: string,
  opts: { timeoutMs?: number; accept?: string; maxBytes?: number } = {},
): Promise<FetchedPage> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 12_000);
  try {
    const res = await fetch(url, {
      headers: browserHeaders(opts.accept),
      redirect: "follow",
      cache: "no-store",
      signal: ctrl.signal,
    });
    clearTimeout(t);
    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    let body = await res.text();
    if (opts.maxBytes && body.length > opts.maxBytes) body = body.slice(0, opts.maxBytes);
    return {
      ok: res.ok,
      status: res.status,
      finalUrl: res.url,
      contentType,
      body,
      block: detectFirewallBlock(res.status, body),
    };
  } catch (e: unknown) {
    clearTimeout(t);
    const aborted = e instanceof Error && e.name === "AbortError";
    return {
      ok: false,
      status: 0,
      finalUrl: url,
      contentType: "",
      body: "",
      block: { blocked: false, status: 0, vendor: null },
      error: aborted ? "timed out" : "fetch failed",
    };
  }
}
