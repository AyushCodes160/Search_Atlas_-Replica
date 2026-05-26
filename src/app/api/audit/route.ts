import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// classifier

type Classification = {
  type: "api" | "web";
  reasoning: string;
  signals: string[];
  allowedMetrics: string[];
  blockedMetrics: string[];
};

type SourceProbe = {
  classification: Classification;
  contentType: string;
  status: number;
  finalUrl: string;
  bodySample: string;
};

const API_ALLOWED_METRICS = [
  "Response time (avg / min / max)",
  "Payload size",
  "HTTP status code",
  "JSON schema correctness",
  "Data completeness (null / missing fields)",
  "Pagination behavior",
  "Relevance ranking quality",
];

const API_BLOCKED_METRICS = [
  "Lighthouse Performance score",
  "Lighthouse SEO score",
  "Lighthouse Accessibility score",
  "Lighthouse Best Practices score",
  "Core Web Vitals (LCP, CLS, FCP, TBT, Speed Index)",
  "On-page SEO (meta, headings, alt, canonical, robots)",
];

const WEB_ALLOWED_METRICS = [
  "Lighthouse Performance / SEO / Accessibility / Best Practices",
  "Core Web Vitals (LCP, CLS, FCP, TBT, Speed Index)",
  "On-page SEO (meta, headings, alt, canonical, robots)",
];

const WEB_BLOCKED_METRICS = [
  "JSON schema inspection (no structured payload to parse)",
  "Raw API timing (Lighthouse provides its own timing)",
];

function classifyUrlOnly(url: URL): string | null {
  const path = url.pathname;
  if (path.includes("/api")) return "URL path contains '/api'";
  if (path.includes("/v1/")) return "URL path contains '/v1/'";
  if (path.includes("/v2/")) return "URL path contains '/v2/'";
  if (path.includes("/graphql")) return "URL path contains '/graphql'";
  if (path.endsWith(".json")) return "URL path ends with '.json'";
  if (path.endsWith(".xml")) return "URL path ends with '.xml'";
  return null;
}

async function classifySource(rawUrl: string): Promise<SourceProbe> {
  const target = new URL(rawUrl);
  const urlSignal = classifyUrlOnly(target);

  const res = await fetch(rawUrl, {
    method: "GET",
    redirect: "follow",
    cache: "no-store",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; SearchAtlasReplica/1.0; +https://github.com/AyushCodes160/Search_Atlas_-Replica)",
      Accept: "*/*",
    },
  });

  const contentType = (res.headers.get("content-type") || "").toLowerCase();
  const text = await res.text();
  const sample = text.length > 2_000_000 ? text.slice(0, 2_000_000) : text;

  const isJsonCT =
    contentType.includes("application/json") ||
    contentType.includes("ld+json") ||
    contentType.includes("text/json");
  const isXmlCT =
    contentType.includes("application/xml") ||
    contentType.includes("text/xml");

  let bodyIsJson = false;
  try {
    if (sample.trim().length) {
      JSON.parse(sample);
      bodyIsJson = true;
    }
  } catch {
    bodyIsJson = false;
  }

  const signals: string[] = [];
  if (urlSignal) signals.push(urlSignal);
  if (isJsonCT) signals.push("Content-Type is application/json");
  if (isXmlCT) signals.push("Content-Type is application/xml");
  if (bodyIsJson && !isJsonCT) signals.push("Response body parses as JSON");
  if (!signals.length && contentType.includes("text/html")) {
    signals.push("Content-Type is text/html");
  }

  let type: "api" | "web";
  let reasoning: string;

  if (urlSignal) {
    type = "api";
    reasoning = `Hard override — ${urlSignal}. URL pattern wins over Content-Type.`;
  } else if (isJsonCT || isXmlCT) {
    type = "api";
    reasoning = `Content-Type signals a structured-data response (${contentType}).`;
  } else if (bodyIsJson) {
    type = "api";
    reasoning =
      "Response body parses as valid JSON — treating as structured data API.";
  } else if (contentType.includes("text/html")) {
    type = "web";
    reasoning = "Content-Type is text/html — analyzing as a web page.";
  } else {
    type = "web";
    reasoning =
      "No API signals detected and no HTML content-type — defaulting to web-page analysis.";
  }

  const classification: Classification = {
    type,
    reasoning,
    signals,
    allowedMetrics: type === "api" ? API_ALLOWED_METRICS : WEB_ALLOWED_METRICS,
    blockedMetrics: type === "api" ? API_BLOCKED_METRICS : WEB_BLOCKED_METRICS,
  };

  return {
    classification,
    contentType,
    status: res.status,
    finalUrl: res.url,
    bodySample: sample,
  };
}

// web path

type LighthouseAudit = {
  id: string;
  title: string;
  description?: string;
  score: number | null;
  displayValue?: string;
};

type PageSpeedResponse = {
  lighthouseResult: {
    finalUrl: string;
    categories: Record<string, { score: number | null }>;
    audits: Record<string, LighthouseAudit>;
  };
};

function pct(score: number | null): number {
  if (score == null) return 0;
  return Math.round(score * 100);
}

async function callPageSpeed(url: string): Promise<PageSpeedResponse> {
  const key = process.env.PAGESPEED_API_KEY;
  const base = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
  const params = new URLSearchParams({
    url,
    strategy: "mobile",
    category: "performance",
  });
  ["seo", "accessibility", "best-practices"].forEach((c) =>
    params.append("category", c),
  );
  if (key && key !== "PLACEHOLDER_PAGESPEED_KEY") {
    params.set("key", key);
  }

  const res = await fetch(`${base}?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `PageSpeed API error (${res.status}): ${text.slice(0, 200)}`,
    );
  }
  return res.json();
}

// api path

type SchemaSummary = {
  rootType: "object" | "array" | "primitive" | "null";
  itemCount: number | null;
  keys: string[];
  sampleItemKeys: string[];
  maxDepth: number;
};

function inferSchema(parsed: unknown): SchemaSummary {
  if (parsed === null) {
    return { rootType: "null", itemCount: null, keys: [], sampleItemKeys: [], maxDepth: 0 };
  }
  let rootType: SchemaSummary["rootType"];
  if (Array.isArray(parsed)) rootType = "array";
  else if (typeof parsed === "object") rootType = "object";
  else rootType = "primitive";

  const depth = (v: unknown, d = 0): number => {
    if (v === null || typeof v !== "object") return d;
    if (Array.isArray(v)) return v.length ? Math.max(...v.slice(0, 5).map((x) => depth(x, d + 1))) : d + 1;
    return Math.max(d, ...Object.values(v as Record<string, unknown>).slice(0, 10).map((x) => depth(x, d + 1)));
  };

  let keys: string[] = [];
  let sampleItemKeys: string[] = [];
  let itemCount: number | null = null;

  if (rootType === "array") {
    const arr = parsed as unknown[];
    itemCount = arr.length;
    const first = arr.find((x) => x && typeof x === "object" && !Array.isArray(x));
    if (first) sampleItemKeys = Object.keys(first as Record<string, unknown>).slice(0, 24);
  } else if (rootType === "object") {
    keys = Object.keys(parsed as Record<string, unknown>).slice(0, 24);
    for (const k of ["hits", "items", "data", "results", "records"]) {
      const v = (parsed as Record<string, unknown>)[k];
      if (Array.isArray(v) && v.length) {
        itemCount = v.length;
        const first = v.find((x) => x && typeof x === "object" && !Array.isArray(x));
        if (first) sampleItemKeys = Object.keys(first as Record<string, unknown>).slice(0, 24);
        break;
      }
    }
  }

  return { rootType, itemCount, keys, sampleItemKeys, maxDepth: depth(parsed) };
}

function checkCompleteness(parsed: unknown, sampleKeys: string[]): {
  totalChecked: number;
  nullFields: { field: string; nullCount: number }[];
} {
  let items: unknown[] | null = null;
  if (Array.isArray(parsed)) items = parsed;
  else if (parsed && typeof parsed === "object") {
    for (const k of ["hits", "items", "data", "results", "records"]) {
      const v = (parsed as Record<string, unknown>)[k];
      if (Array.isArray(v)) {
        items = v;
        break;
      }
    }
  }
  if (!items || items.length === 0 || sampleKeys.length === 0) {
    return { totalChecked: 0, nullFields: [] };
  }
  const checked = items.slice(0, 50);
  const counts: Record<string, number> = {};
  for (const key of sampleKeys) counts[key] = 0;
  for (const item of checked) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const rec = item as Record<string, unknown>;
    for (const key of sampleKeys) {
      const v = rec[key];
      if (v === null || v === undefined || v === "") counts[key]++;
    }
  }
  const nullFields = Object.entries(counts)
    .filter(([, n]) => n > 0)
    .map(([field, nullCount]) => ({ field, nullCount }))
    .sort((a, b) => b.nullCount - a.nullCount)
    .slice(0, 8);
  return { totalChecked: checked.length, nullFields };
}

async function timeRequests(url: string, samples = 3): Promise<{
  avgMs: number;
  minMs: number;
  maxMs: number;
  status: number;
  bytes: number;
}> {
  const times: number[] = [];
  let lastStatus = 0;
  let lastBytes = 0;
  for (let i = 0; i < samples; i++) {
    const t0 = Date.now();
    const r = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": "SearchAtlasReplica/1.0", Accept: "*/*" },
    });
    const text = await r.text();
    const ms = Date.now() - t0;
    times.push(ms);
    lastStatus = r.status;
    lastBytes = text.length;
  }
  return {
    avgMs: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
    minMs: Math.min(...times),
    maxMs: Math.max(...times),
    status: lastStatus,
    bytes: lastBytes,
  };
}

// gemini

async function callGemini(prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === "PLACEHOLDER_GEMINI_KEY") {
    return `<p class="text-amber-700"><strong>Gemini API key not set.</strong> Add your free key to <code>.env.local</code> as <code>GEMINI_API_KEY</code> to get AI-powered fix suggestions. Get one at <a href="https://aistudio.google.com/app/apikey" target="_blank" class="underline">aistudio.google.com</a>.</p>`;
  }
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 1500 },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    return `<p class="text-red-600">Gemini API error: ${text.slice(0, 300)}</p>`;
  }
  const data = await res.json();
  const text: string =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "No suggestions returned.";
  return mdToHtml(text);
}

function mdToHtml(md: string): string {
  let html = md.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  html = html.replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code}</code></pre>`);
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");
  html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>");
  html = html.replace(/^# (.*$)/gim, "<h2>$1</h2>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/^\s*[-*] (.+)$/gim, "<li>$1</li>");
  html = html.replace(/(<li>[\s\S]+?<\/li>)/g, "<ul>$1</ul>");
  html = html.replace(/<\/ul>\s*<ul>/g, "");
  html = html
    .split(/\n{2,}/)
    .map((block) =>
      /^<(h\d|ul|pre|li)/.test(block.trim())
        ? block
        : `<p>${block.replace(/\n/g, "<br/>")}</p>`,
    )
    .join("\n");
  return html;
}

// route

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL required" }, { status: 400 });
    }
    let target: URL;
    try {
      target = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const probe = await classifySource(target.toString());

    if (probe.classification.type === "api") {
      let parsed: unknown = null;
      let parseError: string | null = null;
      try {
        parsed = JSON.parse(probe.bodySample);
      } catch (e) {
        parseError = e instanceof Error ? e.message : "Could not parse JSON";
      }

      const timing = await timeRequests(target.toString(), 3);
      const schema = inferSchema(parsed);
      const completeness = checkCompleteness(parsed, schema.sampleItemKeys);

      const prompt = `You are a backend API quality consultant. The user pointed an SEO audit tool at this URL, but it is actually a JSON API — Lighthouse and SEO scoring do not apply. Produce a backend-focused review.

URL: ${target.toString()}
Final URL: ${probe.finalUrl}
HTTP status: ${timing.status}
Content-Type: ${probe.contentType || "(none reported)"}

Timing (3 samples):
- average: ${timing.avgMs} ms
- min: ${timing.minMs} ms
- max: ${timing.maxMs} ms

Payload:
- size: ${timing.bytes.toLocaleString()} bytes

Schema:
- root type: ${schema.rootType}
- root keys: ${schema.keys.join(", ") || "(none)"}
- item count: ${schema.itemCount ?? "n/a"}
- sample item keys: ${schema.sampleItemKeys.join(", ") || "(none)"}
- max nesting depth: ${schema.maxDepth}

Data completeness (sampled ${completeness.totalChecked} items):
${
  completeness.nullFields.length
    ? completeness.nullFields
        .map((f) => `- ${f.field}: ${f.nullCount} null/empty`)
        .join("\n")
    : "- no missing values detected"
}
${parseError ? `Parse error: ${parseError}` : ""}

Write a concise, actionable report in Markdown with these sections. NEVER reference LCP, CLS, FCP, Performance score, Accessibility, SEO score, or any web/Lighthouse metric — they do not apply to a JSON API.

## API Health
(One-paragraph verdict on response time, status, and content-type. Reference the actual ms numbers.)

## Data Quality
(Schema observations. Are required-looking fields ever null? Is the shape consistent? Specific to the keys above.)

## Performance
(Anything to fix at the backend: caching, payload size, pagination, response time variance.)

## Recommendations
(3–5 numbered, specific, code-level next steps for the team that owns this API.)

Stay under 400 words.`;

      const aiSuggestions = await callGemini(prompt);

      return NextResponse.json({
        sourceType: "api",
        url: target.toString(),
        finalUrl: probe.finalUrl,
        probe: {
          contentType: probe.contentType,
          status: probe.status,
        },
        classification: probe.classification,
        timing,
        schema,
        completeness,
        parseError,
        aiSuggestions,
      });
    }

    const ps = await callPageSpeed(target.toString());
    const lr = ps.lighthouseResult;
    const cats = lr.categories;

    const scores = {
      performance: pct(cats.performance?.score ?? null),
      seo: pct(cats.seo?.score ?? null),
      accessibility: pct(cats.accessibility?.score ?? null),
      bestPractices: pct(cats["best-practices"]?.score ?? null),
    };

    const a = lr.audits;
    const metrics = {
      lcp: a["largest-contentful-paint"]?.displayValue ?? "—",
      cls: a["cumulative-layout-shift"]?.displayValue ?? "—",
      fcp: a["first-contentful-paint"]?.displayValue ?? "—",
      tbt: a["total-blocking-time"]?.displayValue ?? "—",
      speedIndex: a["speed-index"]?.displayValue ?? "—",
    };

    const issueIds = [
      "render-blocking-resources",
      "unused-css-rules",
      "unused-javascript",
      "modern-image-formats",
      "uses-optimized-images",
      "uses-text-compression",
      "meta-description",
      "document-title",
      "image-alt",
      "link-text",
      "is-crawlable",
      "hreflang",
      "canonical",
      "viewport",
      "color-contrast",
      "tap-targets",
      "uses-https",
    ];
    const issues = issueIds
      .map((id) => a[id])
      .filter((x): x is LighthouseAudit => !!x && x.score !== null && x.score < 0.9)
      .slice(0, 8)
      .map((x) => ({
        title: x.title,
        description: (x.description || "").replace(
          /\[([^\]]+)\]\(([^)]+)\)/g,
          '<a href="$2" target="_blank" class="underline text-blue-500">$1</a>',
        ),
        impact: x.score == null ? "info" : x.score < 0.5 ? "high" : "medium",
      }));

    const prompt = `You are an expert SEO and web performance consultant. A Lighthouse audit was just run on ${target.toString()}.

Scores (0-100):
- Performance: ${scores.performance}
- SEO: ${scores.seo}
- Accessibility: ${scores.accessibility}
- Best Practices: ${scores.bestPractices}

Core metrics:
- LCP: ${metrics.lcp}
- CLS: ${metrics.cls}
- FCP: ${metrics.fcp}
- TBT: ${metrics.tbt}
- Speed Index: ${metrics.speedIndex}

Top issues found:
${issues.map((i, idx) => `${idx + 1}. ${i.title}`).join("\n")}

Write a concise but actionable fix plan with these sections in Markdown:
## 🔥 Top 3 Priorities
(3 bullet points - the highest-impact fixes for THIS site, with specific code-level guidance)

## ⚡ Quick Wins
(3-5 fixes that take under 30 minutes)

## 📈 SEO Recommendations
(specific on-page SEO improvements based on the audit data)

Be specific. Reference the actual scores. Give code snippets where helpful. Keep it under 400 words total.`;

    const aiSuggestions = await callGemini(prompt);

    return NextResponse.json({
      sourceType: "web",
      url: target.toString(),
      finalUrl: lr.finalUrl,
      probe: {
        contentType: probe.contentType,
        status: probe.status,
      },
      classification: probe.classification,
      scores,
      metrics,
      issues,
      aiSuggestions,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Audit failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
