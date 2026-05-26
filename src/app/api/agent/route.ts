import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const SYSTEM_PROMPT = `You are Atlas Agent, an in-product SEO assistant inside the SEO Engine toolkit.

The toolkit is free, open-source, runs on Google PageSpeed (Lighthouse) and Llama 3.3 70B via Groq.
You can advise on:
- Site audits and Lighthouse interpretation (Performance, SEO, Accessibility, Best Practices, Core Web Vitals).
- Keyword research, intent, clustering.
- On-page SEO (titles, meta, headings, schema, internal links, alt text, canonical).
- Content strategy (topical maps, content gaps, query intent matching).
- Backend / API analysis (timing, schema, completeness) when the source is a JSON endpoint.

You cannot yet:
- Run audits, crawls, or pull live data on your own.
- Apply fixes directly to a user's site (OTTO-style automation is on the roadmap).
- See backlink data, GBP data, or Google Ads data (those need paid APIs).

Be specific, actionable, and concise. Use Markdown. Never use emojis.`;

type Msg = { role: "user" | "assistant"; content: string };

export async function POST(req: NextRequest) {
  try {
    const { messages } = (await req.json()) as { messages: Msg[] };
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages required" }, { status: 400 });
    }
    const key = process.env.GROQ_API_KEY;
    if (!key || key === "PLACEHOLDER_GROQ_KEY") {
      return NextResponse.json(
        { error: "GROQ_API_KEY not set. Add it to .env.local." },
        { status: 500 },
      );
    }

    const trimmed = messages.slice(-16);
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...trimmed],
        temperature: 0.4,
        max_tokens: 1200,
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
    const reply: string = data?.choices?.[0]?.message?.content ?? "(no reply)";
    return NextResponse.json({ reply });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Agent failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
