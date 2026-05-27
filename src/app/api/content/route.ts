import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 45;

type ContentKind =
  | "blog"
  | "linkedin"
  | "ad"
  | "email"
  | "meta"
  | "product"
  | "youtube"
  | "instagram"
  | "tiktok"
  | "pressrelease"
  | "amazon"
  | "buyerguide"
  | "landing"
  | "coldemail";

type POV = "first" | "second" | "third";

type Body = {
  kind: ContentKind;
  topic: string;
  audience?: string;
  tone?: string;
  brandVoice?: string;
  length?: "short" | "medium" | "long";
  pov?: POV;
  language?: string;
  variations?: number;
};

const SYSTEM_BASE = `You are an elite, highly adaptable copywriter and content strategist. Your goal is to generate high-converting, professional content based strictly on the provided parameters.

### CORE DIRECTIVES (Apply to ALL outputs):
1. NO AI FLUFF: Never use generic introductory phrases (e.g., "Here is the content," "Sure, I can help," or "In today's fast-paced digital world"). Start immediately with the content.
2. ADAPT TO FORMAT: Strictly follow the structural conventions of the requested format. (e.g., If the format is a 'Google Ad', strictly adhere to character limits. If 'LinkedIn', use scannable single-sentence paragraphs. If 'Blog', use hierarchical headers).
3. LEAD WITH A HOOK: Your very first sentence must be a strong, attention-grabbing hook relevant to the topic. Do not waste the first line on a dry summary.
4. TONE MATTERS: Perfectly mirror the requested tone. If no tone is provided, default to clear, conversational, and expert.
5. STRICT MARKDOWN: Output the final response using clean, standard Markdown formatting. Do not wrap the entire response in a code block unless specifically requested.
6. BRAND RULES: If a specific Brand Voice or SOP is provided, those rules override any of the above directives.
7. NO EMOJIS: Never use emojis in the output.`;

function lengthHint(kind: ContentKind, length?: Body["length"]): string {
  if (kind === "blog") {
    if (length === "short") return "~800 words";
    if (length === "long") return "~2400 words";
    return "~1600 words";
  }
  if (kind === "linkedin") return "1100-1300 characters, ~150-180 words";
  if (kind === "email") return "180-280 words";
  if (kind === "product") return "180-260 words";
  return "";
}

const FORMAT_LABEL: Record<ContentKind, string> = {
  blog: "Blog post",
  linkedin: "LinkedIn post",
  ad: "Google Search Ad",
  email: "Marketing email",
  meta: "SEO meta tags",
  product: "Product description",
  youtube: "YouTube video script",
  instagram: "Instagram caption",
  tiktok: "TikTok script",
  pressrelease: "Press release",
  amazon: "Amazon product listing",
  buyerguide: "Buyer's guide article",
  landing: "Landing page copy",
  coldemail: "Cold outreach email",
};

const POV_HINT: Record<POV, string> = {
  first: "first person (I / we)",
  second: "second person (you)",
  third: "third person (they / the user)",
};

function formatRequirements(kind: ContentKind, length?: Body["length"]): string {
  if (kind === "blog") {
    return `Target length: ${lengthHint("blog", length)}.
- Start with a single H1 (# Title) that is hook-led and contains the primary keyword.
- Use H2 (##) and H3 (###) for sections in a logical hierarchy.
- Open with a 2-3 sentence intro that previews the value of the article.
- Weave in semantic / NLP variations of the target keyword naturally.
- Include at least one bulleted list and one numbered list where they earn their place.
- Close with a conclusion + a single direct call-to-action sentence.
- Append a final "## Meta tags" section with two lines:
  - "Title:" under 60 characters, includes the keyword.
  - "Description:" under 160 characters, compelling, includes the keyword.`;
  }
  if (kind === "linkedin") {
    return `Target length: ${lengthHint("linkedin")}.
- Lead with a single-line hook under 90 characters. The hook is its own paragraph.
- Use scannable single-sentence paragraphs separated by blank lines.
- 3-5 short paragraphs total.
- End with a CTA or open question on its own line.
- No Markdown headings (no # or ##).
- Place any hashtags (max 5) on the final line only.`;
  }
  if (kind === "ad") {
    return `Produce 3 distinct variations of a Google Search Ad.
- For each variation: 3 headlines (max 30 chars each) and 2 descriptions (max 90 chars each).
- Use H2 sections "## Variation 1", "## Variation 2", "## Variation 3".
- Format each field line as: "Field: text — XX chars" (XX = actual character count of the text).
- Never exceed character limits. Recount before returning.`;
  }
  if (kind === "email") {
    return `Target length: ${lengthHint("email")}.
- "## Subject" — under 50 characters. Compelling, not clickbait.
- "## Preview text" — under 90 characters, complements the subject.
- "## Body" — hook-led opening line, 2-3 short paragraphs, one direct CTA at the bottom.`;
  }
  if (kind === "meta") {
    return `Produce SEO meta tags suitable for the <head> of a page.
- "## Title" — under 60 characters, includes the primary keyword, compelling.
- "## Description" — under 160 characters, includes the keyword and a value proposition.
- "## Variations" — 3 alternative title + description pairs in a numbered list.
- After each title and description line, append "— XX chars" (XX = actual count).`;
  }
  if (kind === "product") {
    return `Target length: ${lengthHint("product")}.
- "## Headline" — under 80 characters, benefit-led.
- "## Description" — 2-3 short paragraphs covering problem, product, proof.
- "## Key features" — 4-6 bullets, each starting with a verb, each under 80 characters.
- "## Best for" — one sentence listing the target buyer.`;
  }
  if (kind === "youtube") {
    return `Produce a YouTube video script for a ~5-7 minute video.
- "## Title" — under 70 characters, hook-led, includes the keyword.
- "## Hook (0:00-0:15)" — 2-3 sentences. Stop-the-scroll opener; tease the payoff.
- "## Intro (0:15-0:45)" — promise + credibility line + outline of 3 sections.
- "## Section 1", "## Section 2", "## Section 3" — each has a 1-line summary, then talking points as bullets, then a B-roll suggestion line (italic).
- "## CTA & outro" — 2 sentences ending with a like/subscribe nudge.
- "## Description" — 3 short paragraphs with keywords + 5 hashtags on the last line.
- "## Chapters" — numbered timestamps for the sections.`;
  }
  if (kind === "instagram") {
    return `Produce 3 distinct Instagram caption variations.
- Use "## Variation 1", "## Variation 2", "## Variation 3".
- Each variation: a 1-line hook (under 125 chars — what shows before "more"), 2-4 short paragraphs separated by blank lines, a one-line CTA, then a hashtag block (5-10 hashtags, last line only).
- No emojis. Casual rhythm, lowercase if natural.`;
  }
  if (kind === "tiktok") {
    return `Produce a TikTok script for a 30-45 second video.
- "## Hook (0-3s)" — single sentence. Pattern interrupt; promise a payoff.
- "## Beats" — numbered list (5-7 beats), each beat is one spoken line + " — [visual: what's on screen]".
- "## On-screen text" — 4-6 short text overlays (under 30 chars each).
- "## Caption" — under 150 characters with a CTA + 4 hashtags.`;
  }
  if (kind === "pressrelease") {
    return `Produce a professional press release in classic AP style.
- "## Headline" — under 100 characters, factual, not hype.
- "## Subhead" — one sentence amplifying the headline.
- "## Dateline" — format "CITY, State — Month Day, Year —".
- "## Body" — 4-6 paragraphs. Lead paragraph answers who/what/when/where/why. Second paragraph has a direct quote attributed to a named spokesperson. Third paragraph adds context/data. Fourth paragraph has a second quote. Final paragraph forward-looks.
- "## Boilerplate" — 3-4 sentence "About [Company]" block.
- "## Media contact" — name, title, email placeholder, phone placeholder.
- End with "###" centered on its own line.`;
  }
  if (kind === "amazon") {
    return `Produce an Amazon product listing optimised for search + conversion.
- "## Title" — under 200 characters, format: [Brand] [Product] [Key feature] [Material/Size] [Pack count] [Use case]. Front-load keywords.
- "## Bullet points" — exactly 5 bullets. Each bullet ALL CAPS lead phrase (3-5 words) followed by a colon and a benefit-led sentence. Under 250 chars per bullet.
- "## Product description" — 3 short paragraphs in plain text (no Markdown headings). Cover problem, product, proof.
- "## Backend search terms" — single line, comma-separated keywords, under 250 bytes total, no duplicates of title words.`;
  }
  if (kind === "buyerguide") {
    return `Produce an SEO buyer's guide article. Target ~2000 words.
- Start with a single H1 (# Title) including the keyword.
- "## Why [topic] matters" — 2 short paragraphs framing the problem.
- "## What to look for" — H3 sub-sections, one per criterion (5-7 criteria). Each H3 has 1-2 paragraphs + a "Quick check:" bold line.
- "## Top 5 options" — numbered list with name + 1-line best-for + 3 short pros + 2 short cons.
- "## How to decide" — short decision-tree style paragraph or bullets.
- "## FAQ" — 4-6 Q&A pairs as H3 questions + 1-paragraph answers.
- "## Meta tags" — Title (<60ch) + Description (<160ch).`;
  }
  if (kind === "landing") {
    return `Produce conversion-focused landing page copy.
- "## Hero headline" — under 70 chars, outcome-led.
- "## Hero subhead" — one sentence under 140 chars explaining what + for whom.
- "## Hero CTA" — 2-4 word button label.
- "## Trust strip" — one line listing 3-5 social-proof items (placeholders OK).
- "## Problem section" — H3 "The problem" + 2 short paragraphs naming the pain.
- "## Solution section" — H3 "How it works" + 3 numbered steps, each one sentence.
- "## Features" — 3-6 feature cards. Each: bold feature name + 1-sentence benefit.
- "## Social proof" — 2 sample testimonials in blockquote format, each with a name placeholder + role.
- "## Pricing teaser" — 1 paragraph + a single CTA line.
- "## FAQ" — 4 Q&A pairs.
- "## Final CTA section" — 1 headline (<60ch) + 1 CTA button label.`;
  }
  if (kind === "coldemail") {
    return `Produce 3 cold outreach email variations for B2B prospecting.
- Use "## Variation 1 — [angle]", "## Variation 2 — [angle]", "## Variation 3 — [angle]". Pick three distinct angles (e.g. pain-led, complimentary, data-led, mutual-connection-style).
- Each variation: "Subject:" line (under 45 chars), then a 60-100 word body broken into 3-4 short paragraphs, then a one-line soft CTA ending in a question.
- Keep it personal-sounding. No "I hope this finds you well". No "circling back". No emojis. No sales jargon.`;
  }
  return "";
}

function buildUserPrompt(body: Body): string {
  const { kind, topic, audience, tone, brandVoice, length, pov, language, variations } = body;
  const format = FORMAT_LABEL[kind];
  const povLine = pov ? POV_HINT[pov] : "(default — pick what fits the format)";
  const langLine = language?.trim() || "English";
  const variationsLine =
    variations && variations > 1
      ? `\n- Variations requested: ${variations}. Produce ${variations} clearly separated drafts, each wrapped in its own "## Draft N" section. Each draft must independently follow the FORMAT REQUIREMENTS below.`
      : "";

  return `### INPUT PARAMETERS:
- Format: ${format}
- Topic/Keyword: ${topic}
- Target Audience: ${audience?.trim() || "(none provided — infer from topic)"}
- Requested Tone: ${tone?.trim() || "(default: clear, conversational, expert)"}
- Point of view: ${povLine}
- Output language: ${langLine}
- Brand Voice/SOP: ${brandVoice?.trim() || "(none provided)"}${variationsLine}

### FORMAT REQUIREMENTS:
${formatRequirements(kind, length)}

Generate the ${format} now${langLine !== "English" ? ` in ${langLine}` : ""}.`;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    if (!body?.kind || !body?.topic) {
      return NextResponse.json(
        { error: "kind and topic are required" },
        { status: 400 },
      );
    }
    const key = process.env.GROQ_API_KEY;
    if (!key || key === "PLACEHOLDER_GROQ_KEY") {
      return NextResponse.json(
        { error: "GROQ_API_KEY not set" },
        { status: 500 },
      );
    }

    const baseTokens = (() => {
      if (body.kind === "blog") {
        if (body.length === "long") return 3500;
        if (body.length === "short") return 1400;
        return 2400;
      }
      if (body.kind === "buyerguide") return 3000;
      if (body.kind === "landing" || body.kind === "pressrelease") return 2000;
      if (body.kind === "youtube") return 2200;
      if (body.kind === "amazon") return 1400;
      return 1100;
    })();
    const v = body.variations && body.variations > 1 ? body.variations : 1;
    const maxTokens = Math.min(7000, Math.round(baseTokens * (v === 1 ? 1 : v === 2 ? 1.7 : 2.3)));

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: SYSTEM_BASE },
          { role: "user", content: buildUserPrompt(body) },
        ],
        temperature: body.kind === "ad" ? 0.55 : 0.5,
        max_tokens: maxTokens,
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
    const usage = data?.usage ?? null;

    const words = content.trim().split(/\s+/).filter(Boolean).length;
    const chars = content.length;

    return NextResponse.json({
      kind: body.kind,
      content,
      words,
      chars,
      usage,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Content generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
