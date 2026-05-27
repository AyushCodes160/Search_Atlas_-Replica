import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 45;

type ContentKind =
  | "blog"
  | "linkedin"
  | "ad"
  | "email"
  | "meta"
  | "product";

type Body = {
  kind: ContentKind;
  topic: string;
  audience?: string;
  tone?: string;
  brandVoice?: string;
  length?: "short" | "medium" | "long";
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
  return `Target length: ${lengthHint("product")}.
- "## Headline" — under 80 characters, benefit-led.
- "## Description" — 2-3 short paragraphs covering problem, product, proof.
- "## Key features" — 4-6 bullets, each starting with a verb, each under 80 characters.
- "## Best for" — one sentence listing the target buyer.`;
}

function buildUserPrompt(body: Body): string {
  const { kind, topic, audience, tone, brandVoice, length } = body;
  const format = FORMAT_LABEL[kind];

  return `### INPUT PARAMETERS:
- Format: ${format}
- Topic/Keyword: ${topic}
- Target Audience: ${audience?.trim() || "(none provided — infer from topic)"}
- Requested Tone: ${tone?.trim() || "(default: clear, conversational, expert)"}
- Brand Voice/SOP: ${brandVoice?.trim() || "(none provided)"}

### FORMAT REQUIREMENTS:
${formatRequirements(kind, length)}

Generate the ${format} now.`;
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

    const maxTokens =
      body.kind === "blog"
        ? body.length === "long"
          ? 3500
          : body.length === "short"
            ? 1400
            : 2400
        : 1100;

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
