import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 45;

type PageRow = {
  url: string;
  sourceType: "web" | "api";
  performance?: number;
  seo?: number;
  accessibility?: number;
  bestPractices?: number;
  lcp?: string;
  words?: number;
  missingAlt?: number;
  titleLength?: number;
  descriptionLength?: number;
  h1Count?: number;
};

type Body = {
  origin: string;
  pagesAudited: number;
  averages: { performance: number; seo: number; accessibility: number; bestPractices: number };
  rollup: string[];
  worstPages: PageRow[];
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    if (!body?.origin) {
      return NextResponse.json({ error: "origin required" }, { status: 400 });
    }
    const key = process.env.GROQ_API_KEY;
    if (!key || key === "PLACEHOLDER_GROQ_KEY") {
      return NextResponse.json({ error: "GROQ_API_KEY not set" }, { status: 500 });
    }

    const worst = body.worstPages
      .slice(0, 8)
      .map(
        (p) =>
          `- ${p.url} — perf ${p.performance ?? "?"}, seo ${p.seo ?? "?"}, LCP ${p.lcp ?? "?"}, ${p.words ?? "?"} words, ${p.missingAlt ?? "?"} missing alt, title ${p.titleLength ?? "?"}ch, desc ${p.descriptionLength ?? "?"}ch, H1s ${p.h1Count ?? "?"}`,
      )
      .join("\n");

    const prompt = `You are a senior technical SEO consultant. A full-site crawl audit just finished. Write a sharp, executive-level summary of the WHOLE SITE's SEO health.

Site: ${body.origin}
Pages audited: ${body.pagesAudited}
Site-wide average Lighthouse scores — performance ${body.averages.performance}, SEO ${body.averages.seo}, accessibility ${body.averages.accessibility}, best practices ${body.averages.bestPractices}

Site-wide rollup findings:
${body.rollup.map((r) => `- ${r}`).join("\n")}

Lowest-scoring pages:
${worst}

Output in Markdown with these exact sections:

## The verdict
(2-3 sentences. Is this site healthy, mediocre, or in trouble? Anchor it to the average scores.)

## Biggest site-wide problems
(3-5 bullets. Each must reference a number from the rollup or averages. Prioritise issues that appear across many pages.)

## Pages to fix first
(3-5 bullets. Name specific URLs from the lowest-scoring list and say why each is urgent.)

## The 30-day plan
(4-6 numbered steps, ordered by impact-to-effort. Start each with a verb.)

Be specific, cite numbers, no emojis, no filler. Stay under 450 words.`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.35,
        max_tokens: 1500,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Groq error: ${text.slice(0, 300)}` }, { status: res.status });
    }
    const data = await res.json();
    const summary: string = data?.choices?.[0]?.message?.content ?? "";
    return NextResponse.json({ summary });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Summary failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
