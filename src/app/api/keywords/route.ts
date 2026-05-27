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

// Heuristic difficulty 0-100. We have no SERP data, so we infer from the shape of the query:
// short head terms with commercial signals = hard; long-tail questions = easy.
function scoreDifficulty(kw: string, intent: string): { score: number; label: "easy" | "medium" | "hard" } {
  const k = kw.toLowerCase();
  const words = k.split(/\s+/).length;
  let score = 50;
  if (words <= 2) score += 25;
  else if (words === 3) score += 10;
  else if (words >= 5) score -= 20;
  else if (words === 4) score -= 8;
  if (intent === "transactional") score += 15;
  else if (intent === "commercial") score += 10;
  else if (intent === "informational") score -= 5;
  if (/^(how|what|why|when|where|is|are|can|should)\b/.test(k)) score -= 12;
  if (/(near me|in [a-z]+)$/.test(k)) score -= 8;
  if (/(reddit|forum|tutorial|guide|examples?)/.test(k)) score -= 8;
  if (/(insurance|loan|mortgage|lawyer|attorney|crypto|software|hosting)/.test(k)) score += 15;
  score = Math.max(5, Math.min(95, score));
  const label = score >= 65 ? "hard" : score >= 40 ? "medium" : "easy";
  return { score, label };
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
    const withIntent = keywords.map((k) => {
      const intent = classifyIntent(k);
      const diff = scoreDifficulty(k, intent);
      return {
        keyword: k,
        intent,
        words: k.split(/\s+/).length,
        questionLike: /^(how|what|why|when|where|is|are|can|should)\b/.test(k),
        difficulty: diff.score,
        difficultyLabel: diff.label,
      };
    });
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
