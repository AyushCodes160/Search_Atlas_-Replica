import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

// Pull autocomplete suggestions for a seed across letter / question / preposition modifiers.
const QUESTION_PREFIXES = ["how", "what", "why", "when", "where", "is", "are", "can", "should"];
const COMPARISON_PREFIXES = ["best", "vs", "or", "near", "without", "with", "for"];
const ALPHA = "abcdefghijklmnopqrstuvwxyz".split("");

async function fetchSuggestions(query: string): Promise<string[]> {
  try {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SEOEngine/1.0)" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.[1]) ? data[1] : [];
  } catch {
    return [];
  }
}

async function expand(seed: string): Promise<string[]> {
  const all = new Set<string>();
  const queries = [
    seed,
    ...ALPHA.slice(0, 12).map((c) => `${seed} ${c}`),
    ...QUESTION_PREFIXES.map((p) => `${p} ${seed}`),
    ...COMPARISON_PREFIXES.map((p) => `${seed} ${p}`),
  ];
  const results = await Promise.all(queries.map((q) => fetchSuggestions(q)));
  for (const list of results) for (const s of list) all.add(s.toLowerCase());
  all.delete(seed.toLowerCase());
  return Array.from(all).slice(0, 200);
}

function classifyIntent(kw: string): "informational" | "navigational" | "commercial" | "transactional" {
  const k = kw.toLowerCase();
  if (/(buy|order|price|cheap|discount|deal|coupon|shop|near me|for sale)/.test(k)) return "transactional";
  if (/(best|top|review|vs|compare|alternative)/.test(k)) return "commercial";
  if (/(login|sign in|website|official|app|download)/.test(k)) return "navigational";
  return "informational";
}

async function clusterWithGroq(seed: string, keywords: string[]): Promise<{
  clusters: { name: string; keywords: string[] }[];
  raw?: string;
} | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key || key === "PLACEHOLDER_GROQ_KEY") return null;
  const prompt = `You are an SEO content strategist. Given a seed keyword and a list of related queries, group them into 4-8 topic clusters. Return ONLY valid JSON in this exact shape:
{
  "clusters": [
    { "name": "cluster name (short, plain English)", "keywords": ["kw1", "kw2", ...] }
  ]
}
Do not add commentary. Do not wrap in markdown fences.

Seed: ${seed}
Keywords (${keywords.length}):
${keywords.slice(0, 150).map((k) => `- ${k}`).join("\n")}`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 2200,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const text: string = data?.choices?.[0]?.message?.content ?? "";
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed?.clusters)) return { clusters: parsed.clusters };
  } catch {
    /* fall through */
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { seed } = await req.json();
    if (!seed || typeof seed !== "string") {
      return NextResponse.json({ error: "seed required" }, { status: 400 });
    }
    const keywords = await expand(seed.trim());
    if (keywords.length === 0) {
      return NextResponse.json(
        { error: "No suggestions returned. Try a different seed or wait a minute (Google rate-limits)." },
        { status: 502 },
      );
    }
    const withIntent = keywords.map((k) => ({
      keyword: k,
      intent: classifyIntent(k),
      words: k.split(/\s+/).length,
      questionLike: /^(how|what|why|when|where|is|are|can|should)\b/.test(k),
    }));
    const clustered = await clusterWithGroq(seed, keywords);
    return NextResponse.json({
      seed,
      total: keywords.length,
      keywords: withIntent,
      clusters: clustered?.clusters ?? [],
      clusteringEnabled: clustered != null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Keyword expansion failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
