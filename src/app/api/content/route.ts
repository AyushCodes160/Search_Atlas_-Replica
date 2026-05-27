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

const SYSTEM_BASE = `You are a senior SEO content writer working inside the SEO Engine product. You produce copy that is direct, useful, and free of fluff. You never use emojis. You use Markdown only when the requested format calls for it. You match the requested tone and audience precisely.`;

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

function buildUserPrompt(body: Body): string {
  const { kind, topic, audience, tone, brandVoice, length } = body;
  const tonePart = tone ? `Tone: ${tone}.` : "Tone: confident, plain, expert.";
  const audPart = audience ? `Audience: ${audience}.` : "";
  const voicePart = brandVoice
    ? `Brand voice / style guide:\n${brandVoice.trim()}`
    : "";

  if (kind === "blog") {
    return `Write a complete SEO-optimised blog post about: ${topic}
${audPart}
${tonePart}
${voicePart}

Target length: ${lengthHint("blog", length)}.

Output requirements:
- Start with an H1 (# Title) that is engaging and contains the primary keyword.
- Use H2 (##) and H3 (###) for sections. Use a logical hierarchy.
- Include a short intro (2-3 sentences) that hooks the reader and previews the article.
- Naturally weave in semantic / NLP variations of the target keyword.
- Include at least one bulleted list and one numbered list where it fits.
- End with a clear conclusion + a single call-to-action sentence.
- Add a final section "## Meta tags" with two lines:
  - "Title:" — under 60 characters, includes the keyword.
  - "Description:" — under 160 characters, compelling, includes the keyword.
- Do NOT use emojis.

Return only the article in Markdown. Do not wrap it in code fences. Do not add commentary before or after.`;
  }

  if (kind === "linkedin") {
    return `Write a LinkedIn post about: ${topic}
${audPart}
${tonePart}
${voicePart}

Target length: ${lengthHint("linkedin")}.

Structure:
- Hook line (one short, punchy line — under 90 characters).
- Single blank line.
- 3-5 short paragraphs (1-2 sentences each).
- Use line breaks generously so it reads well on mobile.
- Final line: a clear CTA or open question.
- Do NOT use emojis.
- Do NOT use Markdown headings (no # or ##).
- Do NOT add hashtags inside the body — list any hashtags on the LAST line, max 5.

Return only the post. Plain text. No commentary.`;
  }

  if (kind === "ad") {
    return `Generate 3 variations of a Google Search Ad for: ${topic}
${audPart}
${tonePart}
${voicePart}

For each variation provide:
- Headline 1 (max 30 characters)
- Headline 2 (max 30 characters)
- Headline 3 (max 30 characters)
- Description 1 (max 90 characters)
- Description 2 (max 90 characters)

Output as Markdown, three sections labelled "## Variation 1", "## Variation 2", "## Variation 3".
Each line is "Field: text — XX chars" (replace XX with the actual char count of that line).
Do NOT use emojis. Do NOT exceed the character limits.

Return only the variations. No commentary.`;
  }

  if (kind === "email") {
    return `Write a marketing email about: ${topic}
${audPart}
${tonePart}
${voicePart}

Target length: ${lengthHint("email")}.

Output as Markdown with these sections:
- "## Subject" — under 50 characters, intriguing.
- "## Preview text" — under 90 characters, complements the subject.
- "## Body" — opening line that earns the next sentence, 2-3 short paragraphs, single clear CTA at the bottom.

Do NOT use emojis. Return only the email. No commentary.`;
  }

  if (kind === "meta") {
    return `Generate SEO meta tags for a page about: ${topic}
${audPart}
${tonePart}
${voicePart}

Output as Markdown with these sections:
- "## Title" — under 60 characters, includes the primary keyword, compelling.
- "## Description" — under 160 characters, includes the keyword and a value proposition, ends with implied or direct CTA.
- "## Variations" — 3 alternative title + description pairs in a numbered list.

After each title and description, append "— XX chars" (replace XX with the actual count).
Do NOT use emojis. Return only the meta tags. No commentary.`;
  }

  // product
  return `Write a product description for: ${topic}
${audPart}
${tonePart}
${voicePart}

Target length: ${lengthHint("product")}.

Structure as Markdown:
- "## Headline" — under 80 characters, benefit-led.
- "## Description" — 2-3 short paragraphs covering the problem, the product, and the proof.
- "## Key features" — 4-6 bullet points, each starting with a verb, each under 80 characters.
- "## Best for" — one sentence listing the target buyer.

Do NOT use emojis. Return only the description. No commentary.`;
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
