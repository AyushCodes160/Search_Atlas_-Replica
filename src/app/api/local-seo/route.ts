import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

/* ---------- helpers ---------- */

async function fetchPage(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; SEOEngineBot/1.0; +https://gotoseo.app)",
        Accept: "text/html",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

/** Extract raw signals from page HTML */
function extractLocalSignals(html: string) {
  // Phone numbers (common formats)
  const phoneRegex =
    /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g;
  const phones = [...new Set((html.match(phoneRegex) || []).filter((p) => p.replace(/\D/g, "").length >= 7))].slice(0, 5);

  // Addresses — look for common address patterns (Street, Ave, Blvd, etc.)
  const addressRegex =
    /\d{1,5}\s[\w\s]{2,40}(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Drive|Dr|Lane|Ln|Way|Court|Ct|Place|Pl|Highway|Hwy)\b[^<]{0,80}/gi;
  const addresses = [...new Set(html.match(addressRegex) || [])].slice(0, 3);

  // Schema.org LocalBusiness JSON-LD detection
  const schemaBlocks: string[] = [];
  const scriptRegex = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let scriptMatch;
  while ((scriptMatch = scriptRegex.exec(html)) !== null) {
    const content = scriptMatch[1].trim();
    if (
      content.includes("LocalBusiness") ||
      content.includes("Restaurant") ||
      content.includes("Store") ||
      content.includes("Organization") ||
      content.includes("Place")
    ) {
      schemaBlocks.push(content.slice(0, 1500));
    }
  }

  // Google Maps embed detection
  const hasMapsEmbed =
    /maps\.google\.com|google\.com\/maps|maps\.googleapis\.com/i.test(html);

  // Title + meta description
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim().slice(0, 200) : "";

  const descMatch = html.match(
    /<meta[^>]*name\s*=\s*["']description["'][^>]*content\s*=\s*["']([^"']{0,500})["']/i
  );
  const description = descMatch ? descMatch[1].trim() : "";

  // H1 headings
  const h1Regex = /<h1[^>]*>([\s\S]*?)<\/h1>/gi;
  const h1s: string[] = [];
  let h1Match;
  while ((h1Match = h1Regex.exec(html)) !== null) {
    h1s.push(h1Match[1].replace(/<[^>]+>/g, "").trim().slice(0, 200));
  }

  // Viewport meta (mobile friendliness)
  const hasViewport = /meta[^>]*name\s*=\s*["']viewport["']/i.test(html);

  // Open Graph locale
  const ogLocaleMatch = html.match(
    /<meta[^>]*property\s*=\s*["']og:locale["'][^>]*content\s*=\s*["']([^"']+)["']/i
  );
  const ogLocale = ogLocaleMatch ? ogLocaleMatch[1] : "";

  return {
    phones,
    addresses,
    schemaBlocks,
    hasMapsEmbed,
    title,
    description,
    h1s,
    hasViewport,
    ogLocale,
  };
}

/* ---------- Groq audit ---------- */

async function runGroqAudit(
  businessName: string,
  city: string,
  signals: ReturnType<typeof extractLocalSignals>,
  groqKey: string
) {
  const systemPrompt = `You are a Local SEO expert auditor.
Analyze the provided page signals for a business and return a comprehensive local SEO audit as JSON.

You MUST return ONLY a valid JSON object with this exact structure:
{
  "napScore": <number 0-100>,
  "napDetails": {
    "nameFound": <boolean>,
    "addressFound": <boolean>,
    "phoneFound": <boolean>,
    "consistent": <boolean>,
    "notes": "<string>"
  },
  "schemaScore": <number 0-100>,
  "schemaDetails": {
    "hasLocalBusinessSchema": <boolean>,
    "schemaType": "<string or null>",
    "missingFields": ["<field1>", "<field2>"],
    "notes": "<string>"
  },
  "localScore": <number 0-100>,
  "localDetails": {
    "hasMapsEmbed": <boolean>,
    "mobileReady": <boolean>,
    "localKeywordsInTitle": <boolean>,
    "localKeywordsInMeta": <boolean>,
    "localKeywordsInH1": <boolean>,
    "notes": "<string>"
  },
  "recommendations": [
    {"priority": "high|medium|low", "title": "<short title>", "description": "<actionable advice>"}
  ],
  "gridHeatmap": [
    {"zone": "<zone name like NW, N, NE, W, Center, E, SW, S, SE etc>", "row": <0-4>, "col": <0-4>, "rank": <1-20 or 0 if not ranking>, "description": "<brief area name>"}
  ],
  "localKeywords": [
    {"keyword": "<keyword>", "intent": "informational|commercial|transactional|navigational", "difficulty": "easy|medium|hard", "volume": "<estimated monthly searches string>"}
  ]
}

Rules:
1. napScore: 100 if business name, address, and phone are all detected and appear consistent. Deduct points for missing/inconsistent NAP.
2. schemaScore: 100 if a complete LocalBusiness schema.org JSON-LD is present. Deduct for missing fields (name, address, telephone, openingHours, geo, url, image).
3. localScore: Overall local SEO health (0-100). Consider NAP, schema, maps embed, mobile viewport, local keywords in title/meta/headings, locale data.
4. recommendations: Provide 5-8 specific, actionable improvements sorted by priority.
5. gridHeatmap: Generate exactly 25 cells (5x5 grid), simulating local pack rankings for the business keyword "${businessName} ${city}" across different geographic zones within ${city}. Row 0 is north, row 4 is south. Col 0 is west, col 4 is east. Assign realistic rank positions (1-20, or 0 for not ranking). The center should typically rank best.
6. localKeywords: Generate 10 hyper-local long-tail keyword suggestions related to the business in ${city}.`;

  const userMessage = `Business: "${businessName}"
City: "${city}"
Page Title: "${signals.title}"
Meta Description: "${signals.description}"
H1 Headings: ${JSON.stringify(signals.h1s)}
Phones Found: ${JSON.stringify(signals.phones)}
Addresses Found: ${JSON.stringify(signals.addresses)}
Schema.org Blocks Found: ${signals.schemaBlocks.length > 0 ? signals.schemaBlocks.join("\n---\n").slice(0, 2000) : "None"}
Google Maps Embed: ${signals.hasMapsEmbed}
Has Viewport Meta: ${signals.hasViewport}
OG Locale: ${signals.ogLocale || "Not set"}`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${groqKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.4,
      max_tokens: 3000,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) throw new Error(`Groq API failed: ${res.statusText}`);
  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content ?? "{}";
  return JSON.parse(raw);
}

/* ---------- POST handler ---------- */

export async function POST(req: NextRequest) {
  try {
    const { url, businessName, city } = await req.json();

    if (!url || !businessName || !city) {
      return NextResponse.json(
        { error: "url, businessName, and city are required" },
        { status: 400 }
      );
    }

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY not configured in .env.local" },
        { status: 500 }
      );
    }

    // 1. Crawl the page
    let html: string;
    try {
      html = await fetchPage(url);
    } catch (e) {
      return NextResponse.json(
        {
          error: `Could not fetch "${url}": ${e instanceof Error ? e.message : "unknown error"}`,
        },
        { status: 422 }
      );
    }

    // 2. Extract raw signals
    const signals = extractLocalSignals(html);

    // 3. Run Groq audit
    const audit = await runGroqAudit(businessName, city, signals, groqKey);

    return NextResponse.json({
      url,
      businessName,
      city,
      napScore: audit.napScore ?? 0,
      schemaScore: audit.schemaScore ?? 0,
      localScore: audit.localScore ?? 0,
      napDetails: audit.napDetails ?? {},
      schemaDetails: audit.schemaDetails ?? {},
      localDetails: audit.localDetails ?? {},
      recommendations: audit.recommendations ?? [],
      gridHeatmap: audit.gridHeatmap ?? [],
      localKeywords: audit.localKeywords ?? [],
      signals: {
        phones: signals.phones,
        addresses: signals.addresses,
        schemaBlockCount: signals.schemaBlocks.length,
        hasMapsEmbed: signals.hasMapsEmbed,
        title: signals.title,
        description: signals.description,
        hasViewport: signals.hasViewport,
      },
    });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Local SEO audit failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
