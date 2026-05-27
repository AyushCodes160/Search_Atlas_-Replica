import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 45;

type AuditPayload = {
  url: string;
  sourceType: "web" | "api";
  scores?: { performance: number; seo: number; accessibility: number; bestPractices: number };
  metrics?: { lcp: string; cls: string; fcp: string; tbt: string; speedIndex: string };
  onPage?: {
    words: number;
    readability: { flesch: number; grade: number; label: string };
    headings: { h1: string[]; h2Count: number; h3Count: number; h4Count: number; issues: string[] };
    images: { total: number; missingAlt: number };
    links: { internal: number; external: number };
    schema: { types: string[] };
    meta: { titleLength: number; descriptionLength: number };
  };
};

function summariseAudit(label: string, a: AuditPayload): string {
  const lines: string[] = [];
  lines.push(`${label}: ${a.url}`);
  if (a.sourceType === "api") {
    lines.push(`  source type: JSON API (Lighthouse not applicable)`);
    return lines.join("\n");
  }
  if (a.scores) {
    lines.push(
      `  scores — performance: ${a.scores.performance}, seo: ${a.scores.seo}, a11y: ${a.scores.accessibility}, best practices: ${a.scores.bestPractices}`,
    );
  }
  if (a.metrics) {
    lines.push(
      `  vitals — LCP: ${a.metrics.lcp}, CLS: ${a.metrics.cls}, FCP: ${a.metrics.fcp}, TBT: ${a.metrics.tbt}, Speed Index: ${a.metrics.speedIndex}`,
    );
  }
  if (a.onPage) {
    lines.push(
      `  on-page — words: ${a.onPage.words}, readability: Flesch ${a.onPage.readability.flesch} (grade ${a.onPage.readability.grade}), H1: ${a.onPage.headings.h1.length}, H2: ${a.onPage.headings.h2Count}, H3: ${a.onPage.headings.h3Count}`,
    );
    lines.push(
      `  images — ${a.onPage.images.missingAlt}/${a.onPage.images.total} missing alt`,
    );
    lines.push(
      `  links — ${a.onPage.links.internal} internal, ${a.onPage.links.external} external`,
    );
    lines.push(
      `  schema — ${a.onPage.schema.types.join(", ") || "(none)"}`,
    );
    lines.push(
      `  meta — title ${a.onPage.meta.titleLength} chars, description ${a.onPage.meta.descriptionLength} chars`,
    );
    if (a.onPage.headings.issues.length > 0) {
      lines.push(`  heading issues — ${a.onPage.headings.issues.join("; ")}`);
    }
  }
  return lines.join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const { mine, competitor } = (await req.json()) as {
      mine: AuditPayload;
      competitor: AuditPayload;
    };
    if (!mine?.url || !competitor?.url) {
      return NextResponse.json({ error: "mine and competitor required" }, { status: 400 });
    }

    const key = process.env.GROQ_API_KEY;
    if (!key || key === "PLACEHOLDER_GROQ_KEY") {
      return NextResponse.json(
        { error: "GROQ_API_KEY not set" },
        { status: 500 },
      );
    }

    const prompt = `You are an SEO competitive analyst. Two audits below — one for the user's page, one for a competitor. Write a sharp, actionable comparison.

${summariseAudit("USER PAGE", mine)}

${summariseAudit("COMPETITOR PAGE", competitor)}

Output in Markdown with these exact sections:

## Where competitor wins
(3-5 bullets. Be specific — cite numbers from above.)

## Where the user already wins
(2-4 bullets. Same rule — cite numbers.)

## Top 3 things the user should copy
(3 numbered items. Each one starts with a verb, explains what to change, and references the data point that justifies it.)

## Quick wins under 30 minutes
(2-3 bullets the user can ship today.)

Be specific. Reference actual numbers. No emojis. No filler. Stay under 350 words.`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.35,
        max_tokens: 1300,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Groq error: ${text.slice(0, 300)}` },
        { status: res.status },
      );
    }
    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "";
    return NextResponse.json({ comparison: content });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Comparison failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
