import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 45;

type SiteStats = {
  pages: number;
  deepPages: number;
  avg: { performance: number; seo: number; accessibility: number; bestPractices: number } | null;
  totalWords: number;
  avgWords: number;
  pctMissingTitle: number;
  pctMissingDesc: number;
  pctNoH1: number;
  pctMultiH1: number;
  pctThin: number;
  missingAltTotal: number;
  pctNoSchema: number;
  totalIssues: number;
  avgIssuesPerPage: number;
  healthScore: number | null;
  mode: "fast" | "deep";
};

type Side = { origin: string; stats: SiteStats };

function summarise(label: string, s: Side): string {
  const t = s.stats;
  const lines: string[] = [];
  lines.push(`${label}: ${s.origin}`);
  lines.push(`  pages crawled: ${t.pages} (${t.mode} scan)`);
  lines.push(`  SEO health score: ${t.healthScore ?? "n/a"} / 100`);
  if (t.avg) {
    lines.push(
      `  Lighthouse averages over ${t.deepPages} page(s) — performance ${t.avg.performance}, seo ${t.avg.seo}, a11y ${t.avg.accessibility}, best practices ${t.avg.bestPractices}`,
    );
  } else {
    lines.push(`  Lighthouse averages — not run (fast scan)`);
  }
  lines.push(`  content — ${t.totalWords.toLocaleString()} total words, ${t.avgWords} avg words/page`);
  lines.push(`  meta hygiene — ${t.pctMissingTitle}% pages missing title, ${t.pctMissingDesc}% missing meta description`);
  lines.push(`  headings — ${t.pctNoH1}% pages no H1, ${t.pctMultiH1}% multiple H1s`);
  lines.push(`  thin content — ${t.pctThin}% pages under 300 words`);
  lines.push(`  images — ${t.missingAltTotal} missing alt text site-wide`);
  lines.push(`  structured data — ${t.pctNoSchema}% pages with no schema`);
  lines.push(`  issues — ${t.totalIssues} total, ${t.avgIssuesPerPage} avg/page`);
  return lines.join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const { mine, theirs } = (await req.json()) as { mine: Side; theirs: Side };
    if (!mine?.origin || !theirs?.origin) {
      return NextResponse.json({ error: "mine and theirs required" }, { status: 400 });
    }

    const key = process.env.GROQ_API_KEY;
    if (!key || key === "PLACEHOLDER_GROQ_KEY") {
      return NextResponse.json({ error: "GROQ_API_KEY not set" }, { status: 500 });
    }

    const prompt = `You are an SEO competitive analyst comparing two ENTIRE WEBSITES (not single pages). Two whole-site crawls below — one for the user's site, one for a competitor's. Compare them at the site level. Note that the sites may have different page counts, so favour averages and percentages over raw totals when judging quality.

${summarise("USER SITE", mine)}

${summarise("COMPETITOR SITE", theirs)}

Output in Markdown with these exact sections:

## Where the competitor's site wins
(3-5 bullets. Be specific — cite the numbers above. Focus on site-wide patterns, not one page.)

## Where the user's site already wins
(2-4 bullets. Same rule — cite numbers.)

## Top 3 site-wide moves to close the gap
(3 numbered items. Each starts with a verb, says what to change across the site, and references the data point that justifies it.)

## Quick wins under 30 minutes
(2-3 bullets the user can ship today across their site.)

Be specific. Reference actual numbers. No emojis. No filler. Stay under 380 words.`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.35,
        max_tokens: 1400,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Groq error: ${text.slice(0, 300)}` }, { status: res.status });
    }
    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "";
    return NextResponse.json({ comparison: content });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Comparison failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
