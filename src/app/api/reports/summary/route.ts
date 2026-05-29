import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { metrics } = await req.json();

    if (!metrics) {
      return NextResponse.json({ error: "metrics object is required" }, { status: 400 });
    }

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey || groqKey === "PLACEHOLDER_GROQ_KEY") {
      return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 500 });
    }

    const prompt = `You are a senior SEO consultant writing an executive summary for a client's monthly SEO report.

Based on the following data snapshot, write a concise, professional 2-3 paragraph executive summary. Be specific — cite actual numbers. Highlight wins, flag concerns, and give 2-3 priority recommendations.

Data:
${JSON.stringify(metrics, null, 2)}

Rules:
- Write in third person ("The site..." not "Your site...")
- Be direct and actionable — no filler
- Use plain language, no jargon
- Keep it under 250 words
- Do NOT use emojis
- Do NOT use markdown headers — just paragraphs
- End with a clear "Priority actions" list of 2-3 items`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: "Write the executive summary now." },
        ],
        temperature: 0.4,
        max_tokens: 500,
      }),
    });

    if (!res.ok) throw new Error(`Groq failed: ${res.statusText}`);
    const data = await res.json();
    const summary = data?.choices?.[0]?.message?.content ?? "";

    return NextResponse.json({ summary });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to generate summary";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
