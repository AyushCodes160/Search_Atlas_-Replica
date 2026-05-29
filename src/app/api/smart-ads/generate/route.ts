import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { product, keywords, platform, tone } = await req.json();

    if (!product || !keywords) {
      return NextResponse.json({ error: "product and keywords are required" }, { status: 400 });
    }

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey || groqKey === "PLACEHOLDER_GROQ_KEY") {
      return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 500 });
    }

    const platformGuide = platform === "meta" 
      ? `Generate Facebook/Instagram ad copy:
- Primary text (125 chars max)
- Headline (40 chars max)  
- Description (30 chars max)
- Call to action suggestion`
      : platform === "linkedin"
      ? `Generate LinkedIn ad copy:
- Intro text (150 chars max)
- Headline (70 chars max)
- Description (100 chars max)
- Call to action suggestion`
      : `Generate Google Search ad copy following strict character limits:
- 3 Headlines (30 chars max each)
- 2 Descriptions (90 chars max each)
- Display URL path suggestions (2 paths, 15 chars each)
- Sitelink suggestions (4 sitelinks with 25-char titles)`;

    const prompt = `You are an expert digital advertising copywriter. Generate compelling ad copy variants.

Product/Service: "${product}"
Target Keywords: "${keywords}"
Platform: ${platform || "google"}
Tone: ${tone || "professional"}

${platformGuide}

Generate exactly 3 ad variants (labeled A, B, C) so the user can A/B test.

Return ONLY a JSON object in this shape:
{
  "platform": "${platform || "google"}",
  "variants": [
    {
      "label": "A",
      "headlines": ["Headline 1", "Headline 2", "Headline 3"],
      "descriptions": ["Description 1", "Description 2"],
      "displayPaths": ["path1", "path2"],
      "sitelinks": [{"title": "Sitelink", "description": "Brief desc"}],
      "primaryText": "For Meta/LinkedIn only",
      "cta": "Call to action"
    }
  ],
  "tips": ["Tip 1 for improving ad performance", "Tip 2"]
}

Rules:
- STRICTLY respect character limits for each platform
- Use power words and urgency triggers
- Include the target keywords naturally
- Each variant should have a different angle/hook
- Tips should be actionable and specific to this product`;

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
          { role: "user", content: "Generate the ad variants now." },
        ],
        temperature: 0.6,
        max_tokens: 1500,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) throw new Error(`Groq failed: ${res.statusText}`);
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(content);

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to generate ads";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
