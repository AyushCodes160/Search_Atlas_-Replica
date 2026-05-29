import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 45;

type Provider = "chatgpt" | "claude" | "gemini" | "perplexity";

async function callOpenAI(query: string, apiKey: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an unbiased search assistant. Answer the query neutrally and mention recommended tools/brands naturally." },
        { role: "user", content: query },
      ],
      temperature: 0.4,
      max_tokens: 800,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI failed: ${res.statusText}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

async function callAnthropic(query: string, apiKey: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-20241022",
      messages: [{ role: "user", content: query }],
      max_tokens: 800,
    }),
  });
  if (!res.ok) throw new Error(`Anthropic failed: ${res.statusText}`);
  const data = await res.json();
  return data?.content?.[0]?.text ?? "";
}

async function callGemini(query: string, apiKey: string): Promise<string> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: query }] }],
    }),
  });
  if (!res.ok) throw new Error(`Gemini failed: ${res.statusText}`);
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function callPerplexity(query: string, apiKey: string): Promise<string> {
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "sonar",
      messages: [
        { role: "system", content: "You are an unbiased web-search assistant. Answer the query and cite sources naturally with markdown hyperlinks." },
        { role: "user", content: query },
      ],
      max_tokens: 800,
    }),
  });
  if (!res.ok) throw new Error(`Perplexity failed: ${res.statusText}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

// Fallback Groq querying
async function callGroq(model: string, systemPrompt: string, query: string, apiKey: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query },
      ],
      temperature: 0.5,
      max_tokens: 800,
    }),
  });
  if (!res.ok) throw new Error(`Groq failed: ${res.statusText}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

function analyzeResponse(text: string, brandName: string, competitors: string[]): {
  mentioned: boolean;
  snippet: string;
  competitorsMentioned: Record<string, boolean>;
  hasCitation: boolean;
} {
  const cleanText = text || "";
  const escapedBrand = brandName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const brandMentioned = new RegExp(`\\b${escapedBrand}\\b`, "i").test(cleanText);
  const hasCitation = /https?:\/\//i.test(cleanText) || /\[\d+\]/.test(cleanText) || /\[[^\]]+\]\([^)]+\)/.test(cleanText);
  
  let snippet = "";
  if (brandMentioned) {
    const sentences = cleanText.split(/[.!?\n]+/);
    const match = sentences.find(s => new RegExp(`\\b${escapedBrand}\\b`, "i").test(s));
    snippet = match ? match.trim() + "." : "";
  }
  if (!snippet) {
    snippet = cleanText.slice(0, 150).trim() + "...";
  }

  const competitorsMentioned: Record<string, boolean> = {};
  competitors.forEach(comp => {
    const escapedComp = comp.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    competitorsMentioned[comp] = new RegExp(`\\b${escapedComp}\\b`, "i").test(cleanText);
  });

  return {
    mentioned: brandMentioned,
    snippet,
    competitorsMentioned,
    hasCitation,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, brandName, competitors: rawCompetitors } = body as {
      query: string;
      brandName: string;
      competitors?: string;
    };

    if (!query || !brandName) {
      return NextResponse.json({ error: "query and brandName are required" }, { status: 400 });
    }

    const competitorsList = rawCompetitors
      ? rawCompetitors.split(",").map(c => c.trim()).filter(Boolean)
      : [];

    const openaiKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    const perplexityKey = process.env.PERPLEXITY_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    if (!groqKey && !openaiKey && !anthropicKey && !geminiKey && !perplexityKey) {
      return NextResponse.json({ error: "No API keys configured. Configure GROQ_API_KEY in .env.local" }, { status: 500 });
    }

    const results: Record<Provider, { text: string; error?: string }> = {
      chatgpt: { text: "" },
      claude: { text: "" },
      gemini: { text: "" },
      perplexity: { text: "" },
    };

    // Parallel execution of requests
    await Promise.all([
      // 1. ChatGPT/Llama
      (async () => {
        try {
          if (openaiKey) {
            results.chatgpt.text = await callOpenAI(query, openaiKey);
          } else if (groqKey) {
            results.chatgpt.text = await callGroq(
              "llama-3.3-70b-versatile",
              "You are ChatGPT (GPT-4o-mini). Answer search queries neutrally and naturally list top recommendations.",
              query,
              groqKey
            );
          }
        } catch (e: unknown) {
          results.chatgpt.error = e instanceof Error ? e.message : "Failed";
          results.chatgpt.text = "Error performing query against ChatGPT.";
        }
      })(),
      // 2. Claude/Mixtral
      (async () => {
        try {
          if (anthropicKey) {
            results.claude.text = await callAnthropic(query, anthropicKey);
          } else if (groqKey) {
            results.claude.text = await callGroq(
              "mixtral-8x7b-32768",
              "You are Claude 3.5. Provide helpful, structured, and unbiased answers to this query.",
              query,
              groqKey
            );
          }
        } catch (e: unknown) {
          results.claude.error = e instanceof Error ? e.message : "Failed";
          results.claude.text = "Error performing query against Claude.";
        }
      })(),
      // 3. Gemini/Gemma
      (async () => {
        try {
          if (geminiKey) {
            results.gemini.text = await callGemini(query, geminiKey);
          } else if (groqKey) {
            results.gemini.text = await callGroq(
              "gemma2-9b-it",
              "You are Gemini 1.5. Answer this search query as an expert assistant.",
              query,
              groqKey
            );
          }
        } catch (e: unknown) {
          results.gemini.error = e instanceof Error ? e.message : "Failed";
          results.gemini.text = "Error performing query against Gemini.";
        }
      })(),
      // 4. Perplexity/Search Llama
      (async () => {
        try {
          if (perplexityKey) {
            results.perplexity.text = await callPerplexity(query, perplexityKey);
          } else if (groqKey) {
            results.perplexity.text = await callGroq(
              "llama-3.3-70b-versatile",
              "You are Perplexity AI. Search the web, answer the query, and include multiple markdown citations/sources with urls.",
              query,
              groqKey
            );
          }
        } catch (e: unknown) {
          results.perplexity.error = e instanceof Error ? e.message : "Failed";
          results.perplexity.text = "Error performing query against Perplexity.";
        }
      })(),
    ]);

    // Analyze outputs
    const payload: Record<Provider, ReturnType<typeof analyzeResponse> & { error?: string }> = {
      chatgpt: { ...analyzeResponse(results.chatgpt.text, brandName, competitorsList), error: results.chatgpt.error },
      claude: { ...analyzeResponse(results.claude.text, brandName, competitorsList), error: results.claude.error },
      gemini: { ...analyzeResponse(results.gemini.text, brandName, competitorsList), error: results.gemini.error },
      perplexity: { ...analyzeResponse(results.perplexity.text, brandName, competitorsList), error: results.perplexity.error },
    };

    // Calculate score
    let scorePoints = 0;
    (Object.keys(payload) as Provider[]).forEach(prov => {
      const info = payload[prov];
      if (info.mentioned) {
        scorePoints += 15;
        if (info.hasCitation) scorePoints += 10;
      }
    });
    const finalScore = Math.max(0, Math.min(100, scorePoints));

    return NextResponse.json({
      query,
      brandName,
      competitors: competitorsList,
      score: finalScore,
      data: payload,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to run LLM visibility check";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
