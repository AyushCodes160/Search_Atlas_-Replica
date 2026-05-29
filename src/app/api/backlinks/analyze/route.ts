import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { domain, competitor } = await req.json();

    if (!domain) {
      return NextResponse.json({ error: "domain is required" }, { status: 400 });
    }

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey || groqKey === "PLACEHOLDER_GROQ_KEY") {
      return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 500 });
    }

    const competitorSection = competitor
      ? `\n\nAlso include a "gap_analysis" section comparing ${domain} vs ${competitor}:
- Which link sources ${competitor} likely has that ${domain} doesn't
- 3-5 outreach opportunities where ${domain} could earn links
- Estimated difficulty (easy/medium/hard) for each opportunity`
      : "";

    const prompt = `You are an expert SEO backlink analyst. Given a domain, estimate its backlink profile based on your training data knowledge of the web.

Domain to analyze: "${domain}"${competitorSection}

Return ONLY a JSON object in this shape:
{
  "domain": "${domain}",
  "metrics": {
    "domainAuthority": 45,
    "totalBacklinks": 12500,
    "referringDomains": 890,
    "doFollowPercent": 72,
    "noFollowPercent": 28,
    "avgDomainRating": 38
  },
  "topBacklinks": [
    {
      "source": "example.com",
      "anchor": "anchor text used",
      "domainRating": 85,
      "type": "dofollow",
      "page": "/specific-page"
    }
  ],
  "anchorDistribution": [
    { "anchor": "brand name", "percent": 35 },
    { "anchor": "keyword phrase", "percent": 20 }
  ],
  "linkTypes": [
    { "type": "Editorial", "percent": 40 },
    { "type": "Guest Post", "percent": 15 },
    { "type": "Directory", "percent": 10 },
    { "type": "Forum/Comment", "percent": 8 },
    { "type": "Social", "percent": 12 },
    { "type": "Other", "percent": 15 }
  ],
  ${competitor ? `"gap_analysis": {
    "competitor": "${competitor}",
    "competitorDA": 55,
    "opportunities": [
      { "source": "example-blog.com", "reason": "Why this is a good link opportunity", "difficulty": "easy" }
    ],
    "summary": "Brief gap analysis summary"
  },` : ""}
  "recommendations": ["Actionable recommendation 1", "Recommendation 2", "Recommendation 3"],
  "toxicRisk": "low"
}

Rules:
- Provide 8-12 top backlinks with realistic sources
- Provide 5-7 anchor text categories  
- Domain authority should be 0-100 scale
- Be realistic — small unknown sites should have low DA and few links
- Well-known sites should have high DA and many links
- Provide 3-5 actionable recommendations`;

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
          { role: "user", content: "Analyze the backlink profile now." },
        ],
        temperature: 0.4,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) throw new Error(`Groq failed: ${res.statusText}`);
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(content);

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to analyze backlinks";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
