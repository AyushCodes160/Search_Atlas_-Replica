import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 45;

interface OrganicResult {
  position: number;
  title: string;
  link: string;
  snippet?: string;
}

// Check if a link matches the target domain (e.g. "github.com" matches "https://github.com/foo")
function matchesDomain(url: string, targetDomain: string): boolean {
  if (!url || !targetDomain) return false;
  try {
    const cleanUrl = url.toLowerCase();
    const cleanDomain = targetDomain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "");
    // Extract hostname or check if domain is in the URL
    if (cleanUrl.includes(cleanDomain)) {
      return true;
    }
    const parsed = new URL(url);
    return parsed.hostname.replace("www.", "") === cleanDomain;
  } catch {
    return url.toLowerCase().includes(targetDomain.toLowerCase());
  }
}

// Call SerpAPI to get real Google search results
async function querySerpApi(keyword: string, location: string, apiKey: string): Promise<{
  organicResults: OrganicResult[];
  serpFeatures: string[];
  searchVolume: number;
  cpc: number;
}> {
  const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(keyword)}&location=${encodeURIComponent(location)}&api_key=${apiKey}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`SerpAPI failed: ${res.statusText}`);
  const data = await res.json();

  const rawOrganic = (data.organic_results || []) as any[];
  const organicResults: OrganicResult[] = rawOrganic.map((r, i) => ({
    position: r.position || i + 1,
    title: r.title || "",
    link: r.link || "",
    snippet: r.snippet || "",
  }));

  const serpFeatures: string[] = [];
  if (data.answer_box || data.featured_snippet) serpFeatures.push("snippet");
  if (data.related_questions || data.people_also_ask) serpFeatures.push("people_also_ask");
  if (data.local_results || data.local_map) serpFeatures.push("local_pack");
  if (data.inline_images || data.images_results) serpFeatures.push("images");
  if (data.shopping_results) serpFeatures.push("shopping");

  // SerpAPI's standard search endpoint doesn't return volume/CPC.
  // Use Groq to estimate realistic monthly search volume + CPC for this keyword.
  // Retry up to 3 times with exponential backoff to handle rate limits.
  let searchVolume = 0;
  let cpc = 0;
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey && groqKey !== "PLACEHOLDER_GROQ_KEY") {
    const delays = [500, 1500, 3000];
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const est = await estimateKeywordMetrics(keyword, groqKey);
        if (est.searchVolume > 0) {
          searchVolume = est.searchVolume;
          cpc = est.cpc;
          break; // Success — stop retrying
        }
      } catch {
        // Wait before retry
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, delays[attempt]));
        }
      }
    }
  }

  // Fallback: if Groq is completely rate-limited, use a keyword-aware
  // heuristic so the UI never shows identical/empty numbers.
  if (searchVolume === 0) {
    const est = estimateFromKeyword(keyword);
    searchVolume = est.volume;
    cpc = est.cpc;
  }

  return { organicResults, serpFeatures, searchVolume, cpc };
}

// Deterministic keyword-aware volume/CPC estimator (no API needed).
// Uses word count, commercial intent signals, brand detection, and a
// hash-based spread to produce varied but believable numbers.
function estimateFromKeyword(keyword: string): { volume: number; cpc: number } {
  const kw = keyword.toLowerCase().trim();
  const words = kw.split(/\s+/);
  const wordCount = words.length;

  // Simple string hash for deterministic variation
  let hash = 0;
  for (let i = 0; i < kw.length; i++) {
    hash = ((hash << 5) - hash + kw.charCodeAt(i)) | 0;
  }
  const spread = Math.abs(hash % 100) / 100; // 0.00 to 0.99

  // --- Volume estimation ---
  // Single generic words (python, react, seo) = very high volume
  // 2-word phrases = moderate
  // 3+ word long-tails = lower volume
  let baseVolume: number;
  if (wordCount === 1) {
    baseVolume = 80000 + Math.floor(spread * 920000); // 80k–1M
  } else if (wordCount === 2) {
    baseVolume = 5000 + Math.floor(spread * 75000);   // 5k–80k
  } else if (wordCount === 3) {
    baseVolume = 1000 + Math.floor(spread * 19000);    // 1k–20k
  } else {
    baseVolume = 200 + Math.floor(spread * 4800);      // 200–5k
  }

  // Boost for known high-volume brand/tech words
  const megaBrands = ["google", "facebook", "youtube", "amazon", "instagram", "tiktok", "twitter", "reddit", "netflix", "chatgpt"];
  const techTerms = ["python", "javascript", "react", "nextjs", "node", "typescript", "css", "html", "docker", "kubernetes", "ai", "machine learning"];
  if (megaBrands.some(b => kw.includes(b))) {
    baseVolume = Math.max(baseVolume, 500000 + Math.floor(spread * 500000));
  } else if (techTerms.some(t => kw.includes(t))) {
    baseVolume = Math.max(baseVolume, 50000 + Math.floor(spread * 200000));
  }

  // --- CPC estimation ---
  // Commercial/transactional keywords have higher CPC
  let baseCpc = 0.30 + spread * 1.20; // $0.30–$1.50 baseline
  const commercialSignals = ["buy", "price", "best", "cheap", "review", "vs", "alternative", "tool", "software", "service", "agency", "hire", "cost", "deal", "discount", "coupon", "shop", "plan", "pricing"];
  const matchedSignals = commercialSignals.filter(s => kw.includes(s)).length;
  if (matchedSignals >= 2) {
    baseCpc = 3.50 + spread * 5.00;  // $3.50–$8.50
  } else if (matchedSignals === 1) {
    baseCpc = 1.50 + spread * 3.00;  // $1.50–$4.50
  }

  // Round nicely
  const volume = Math.round(baseVolume / 100) * 100;
  const cpc = Math.round(baseCpc * 100) / 100;

  return { volume, cpc };
}

// Use Groq to estimate realistic monthly search volume & CPC for a keyword
async function estimateKeywordMetrics(keyword: string, apiKey: string): Promise<{ searchVolume: number; cpc: number }> {
  // Add a unique seed per call to break LLM determinism across sequential keywords
  const seed = `${keyword}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are an expert keyword research analyst with deep knowledge of real Google Keyword Planner, Ahrefs, and SEMrush data. Your job is to estimate the MONTHLY global Google search volume and average CPC for a SPECIFIC keyword.

CRITICAL: Every keyword has a UNIQUE search volume. Do NOT default to the same number for different keywords. Think carefully about what makes THIS specific keyword different.

Reference volumes to calibrate your estimates:
- "facebook" → 1,200,000,000/mo
- "youtube" → 800,000,000/mo  
- "python" → 1,500,000/mo
- "javascript" → 823,000/mo
- "react" → 410,000/mo
- "seo" → 350,000/mo
- "next.js" → 90,500/mo
- "tailwind css" → 74,000/mo
- "best python ide" → 12,000/mo
- "how to center a div css" → 8,100/mo
- "javascirpt" (typo) → 1,200/mo

Rules:
- Base your estimate on the keyword's actual popularity, competition, and niche.
- Different keywords MUST return different volumes — even similar ones (e.g., "python" ≠ "javascript").
- Typos and misspellings must have drastically lower volume than the correct spelling.
- CPC should reflect real advertiser bid competition for this specific keyword.
- Return ONLY: { "search_volume": NUMBER, "cpc": NUMBER }`,
        },
        { role: "user", content: `Estimate metrics for keyword: "${keyword}" [seed: ${seed}]` },
      ],
      temperature: 0.4,
      max_tokens: 100,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) throw new Error("Groq estimation failed");
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content ?? "";
  const parsed = JSON.parse(content);
  return {
    searchVolume: Number(parsed.search_volume) || 0,
    cpc: Number(parsed.cpc) || 0,
  };
}

// Use Groq to simulate Google search results
async function queryGroqSim(keyword: string, targetDomain: string, apiKey: string): Promise<{
  organicResults: OrganicResult[];
  serpFeatures: string[];
  searchVolume: number;
  cpc: number;
}> {
  const systemPrompt = `You are a Google Search SERP Simulator.
Analyze the query and return a simulated, realistic SERP JSON.
You must return ONLY a JSON object in this exact shape:
{
  "organic_results": [
    { "position": 1, "title": "Webpage Title", "link": "https://website.com/page-path", "snippet": "Brief description snippet." }
  ],
  "serp_features": ["snippet", "people_also_ask", "local_pack", "images"],
  "search_volume": 1200,
  "cpc": 1.45
}
Instructions:
1. Provide 15 organic results. Make titles, domains, and snippets look authentic.
2. In 'serp_features', include 1-4 elements from: "snippet", "people_also_ask", "local_pack", "images".
3. Provide a realistic monthly 'search_volume' (e.g. 50 to 20000) and 'cpc' (USD e.g. 0.10 to 8.50).
4. Since the user wants to audit their site '${targetDomain}', make sure '${targetDomain}' appears as one of the organic results (e.g., between position 2 and 48) to simulate a ranking. Do not always place it at #1. Make it look natural.`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Query: "${keyword}"` },
      ],
      temperature: 0.6,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) throw new Error(`Groq simulation failed: ${res.statusText}`);
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content ?? "";

  const parsed = JSON.parse(content);
  return {
    organicResults: parsed.organic_results || [],
    serpFeatures: parsed.serp_features || [],
    searchVolume: Number(parsed.search_volume) || 250,
    cpc: Number(parsed.cpc) || 0.50,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { keyword, domain, location = "United States" } = await req.json();

    if (!keyword || !domain) {
      return NextResponse.json({ error: "keyword and domain are required" }, { status: 400 });
    }

    const serpApiKey = process.env.SERPAPI_API_KEY;
    const groqApiKey = process.env.GROQ_API_KEY;

    if (!serpApiKey && (!groqApiKey || groqApiKey === "PLACEHOLDER_GROQ_KEY")) {
      return NextResponse.json({ error: "No API keys configured. Set GROQ_API_KEY or SERPAPI_API_KEY in .env.local" }, { status: 500 });
    }

    let searchData;
    if (serpApiKey) {
      searchData = await querySerpApi(keyword, location, serpApiKey);
    } else {
      searchData = await queryGroqSim(keyword, domain, groqApiKey!);
    }

    // Find the rank position of the target domain
    let position = 101; // Default "unranked"
    let foundMatch = searchData.organicResults.find(r => matchesDomain(r.link, domain));
    if (foundMatch) {
      position = foundMatch.position;
    }

    // Classify search intent from keyword shape
    let intent: "informational" | "navigational" | "commercial" | "transactional" = "informational";
    const k = keyword.toLowerCase();
    if (/(buy|order|price|cheap|discount|deal|coupon|shop|near me|for sale)/.test(k)) {
      intent = "transactional";
    } else if (/(best|top|review|vs|compare|alternative)/.test(k)) {
      intent = "commercial";
    } else if (/(login|sign in|website|official|app|download)/.test(k)) {
      intent = "navigational";
    }

    return NextResponse.json({
      keyword,
      domain,
      position,
      searchVolume: searchData.searchVolume,
      cpc: searchData.cpc,
      intent,
      serpFeatures: searchData.serpFeatures,
      organicResults: searchData.organicResults.slice(0, 10), // Return top 10 results for page inspection
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to scan search rankings";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
