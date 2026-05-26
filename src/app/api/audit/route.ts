import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type LighthouseAudit = {
  id: string;
  title: string;
  description?: string;
  score: number | null;
  displayValue?: string;
};

type PageSpeedResponse = {
  lighthouseResult: {
    finalUrl: string;
    categories: Record<string, { score: number | null }>;
    audits: Record<string, LighthouseAudit>;
  };
};

function pct(score: number | null): number {
  if (score == null) return 0;
  return Math.round(score * 100);
}

async function callPageSpeed(url: string): Promise<PageSpeedResponse> {
  const key = process.env.PAGESPEED_API_KEY;
  const base = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
  const params = new URLSearchParams({
    url,
    strategy: "mobile",
    category: "performance",
  });
  ["seo", "accessibility", "best-practices"].forEach((c) =>
    params.append("category", c),
  );
  if (key && key !== "PLACEHOLDER_PAGESPEED_KEY") {
    params.set("key", key);
  }

  const res = await fetch(`${base}?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PageSpeed API error (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function callGemini(prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === "PLACEHOLDER_GEMINI_KEY") {
    return `<p class="text-amber-700"><strong>Gemini API key not set.</strong> Add your free key to <code>.env.local</code> as <code>GEMINI_API_KEY</code> to get AI-powered fix suggestions. Get one at <a href="https://aistudio.google.com/app/apikey" target="_blank" class="underline">aistudio.google.com</a>.</p>`;
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 1500 },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    return `<p class="text-red-600">Gemini API error: ${text.slice(0, 300)}</p>`;
  }
  const data = await res.json();
  const text: string =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "No suggestions returned.";
  return mdToHtml(text);
}

function mdToHtml(md: string): string {
  let html = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  html = html.replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code}</code></pre>`);
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");
  html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>");
  html = html.replace(/^# (.*$)/gim, "<h2>$1</h2>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/^\s*[-*] (.+)$/gim, "<li>$1</li>");
  html = html.replace(/(<li>[\s\S]+?<\/li>)/g, "<ul>$1</ul>");
  html = html.replace(/<\/ul>\s*<ul>/g, "");
  html = html
    .split(/\n{2,}/)
    .map((block) =>
      /^<(h\d|ul|pre|li)/.test(block.trim()) ? block : `<p>${block.replace(/\n/g, "<br/>")}</p>`,
    )
    .join("\n");
  return html;
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL required" }, { status: 400 });
    }
    let target: URL;
    try {
      target = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const ps = await callPageSpeed(target.toString());
    const lr = ps.lighthouseResult;
    const cats = lr.categories;

    const scores = {
      performance: pct(cats.performance?.score ?? null),
      seo: pct(cats.seo?.score ?? null),
      accessibility: pct(cats.accessibility?.score ?? null),
      bestPractices: pct(cats["best-practices"]?.score ?? null),
    };

    const a = lr.audits;
    const metrics = {
      lcp: a["largest-contentful-paint"]?.displayValue ?? "—",
      cls: a["cumulative-layout-shift"]?.displayValue ?? "—",
      fcp: a["first-contentful-paint"]?.displayValue ?? "—",
      tbt: a["total-blocking-time"]?.displayValue ?? "—",
      speedIndex: a["speed-index"]?.displayValue ?? "—",
    };

    const issueIds = [
      "render-blocking-resources",
      "unused-css-rules",
      "unused-javascript",
      "modern-image-formats",
      "uses-optimized-images",
      "uses-text-compression",
      "meta-description",
      "document-title",
      "image-alt",
      "link-text",
      "is-crawlable",
      "hreflang",
      "canonical",
      "viewport",
      "color-contrast",
      "tap-targets",
      "uses-https",
    ];
    const issues = issueIds
      .map((id) => a[id])
      .filter((x): x is LighthouseAudit => !!x && x.score !== null && x.score < 0.9)
      .slice(0, 8)
      .map((x) => ({
        title: x.title,
        description: (x.description || "").replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="underline text-brand-600">$1</a>'),
        impact: x.score == null ? "info" : x.score < 0.5 ? "high" : "medium",
      }));

    const prompt = `You are an expert SEO and web performance consultant. A site audit was just run on ${target.toString()}.

Scores (0-100):
- Performance: ${scores.performance}
- SEO: ${scores.seo}
- Accessibility: ${scores.accessibility}
- Best Practices: ${scores.bestPractices}

Core metrics:
- LCP: ${metrics.lcp}
- CLS: ${metrics.cls}
- FCP: ${metrics.fcp}
- TBT: ${metrics.tbt}
- Speed Index: ${metrics.speedIndex}

Top issues found:
${issues.map((i, idx) => `${idx + 1}. ${i.title}`).join("\n")}

Write a concise but actionable fix plan with these sections in Markdown:
## 🔥 Top 3 Priorities
(3 bullet points - the highest-impact fixes for THIS site, with specific code-level guidance)

## ⚡ Quick Wins
(3-5 fixes that take under 30 minutes)

## 📈 SEO Recommendations
(specific on-page SEO improvements based on the audit data)

Be specific. Reference the actual scores. Give code snippets where helpful. Keep it under 400 words total.`;

    const aiSuggestions = await callGemini(prompt);

    return NextResponse.json({
      url: target.toString(),
      finalUrl: lr.finalUrl,
      scores,
      metrics,
      issues,
      aiSuggestions,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Audit failed" },
      { status: 500 },
    );
  }
}
