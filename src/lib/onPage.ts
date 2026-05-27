import { load, type CheerioAPI } from "cheerio";

export type OnPageAudit = {
  words: number;
  readingMinutes: number;
  readability: {
    flesch: number;
    grade: number;
    label: string;
  };
  headings: {
    h1: string[];
    h2Count: number;
    h3Count: number;
    h4Count: number;
    issues: string[];
  };
  images: {
    total: number;
    missingAlt: number;
    sampleMissing: { src: string; nearbyText: string }[];
  };
  links: {
    internal: number;
    external: number;
    nofollow: number;
    dofollow: number;
  };
  schema: {
    types: string[];
    count: number;
    suggested: string[];
  };
  meta: {
    title: string | null;
    titleLength: number;
    description: string | null;
    descriptionLength: number;
    canonical: string | null;
    viewport: string | null;
    ogTitle: string | null;
    ogDescription: string | null;
    ogImage: string | null;
    robots: string | null;
  };
};

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const stripped = w
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "")
    .replace(/^y/, "");
  const groups = stripped.match(/[aeiouy]{1,2}/g);
  return groups ? Math.max(1, groups.length) : 1;
}

function readabilityLabel(grade: number): string {
  if (grade <= 5) return "Very easy";
  if (grade <= 8) return "Plain English";
  if (grade <= 10) return "Standard";
  if (grade <= 12) return "Fairly difficult";
  if (grade <= 16) return "Difficult";
  return "Very difficult";
}

function getMainText($: CheerioAPI): string {
  $("script, style, noscript, nav, footer, header, aside").remove();
  // Prefer article / main / body in that order
  const candidates = ["article", "main", '[role="main"]', "body"];
  for (const sel of candidates) {
    const el = $(sel).first();
    if (el.length) {
      const text = el.text().replace(/\s+/g, " ").trim();
      if (text.length > 60) return text;
    }
  }
  return $("body").text().replace(/\s+/g, " ").trim();
}

function collectSchemaTypes(node: unknown, acc: string[]): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const child of node) collectSchemaTypes(child, acc);
    return;
  }
  const rec = node as Record<string, unknown>;
  const t = rec["@type"];
  if (typeof t === "string") acc.push(t);
  else if (Array.isArray(t)) for (const x of t) if (typeof x === "string") acc.push(x);
  if (Array.isArray(rec["@graph"])) {
    for (const child of rec["@graph"] as unknown[]) collectSchemaTypes(child, acc);
  }
}

function inferSuggestedSchema(url: URL, foundTypes: string[]): string[] {
  const path = url.pathname.toLowerCase();
  const has = (t: string) =>
    foundTypes.some((x) => x.toLowerCase() === t.toLowerCase());
  const suggestions: string[] = [];

  if (!has("Organization") && !has("LocalBusiness")) suggestions.push("Organization");
  if (!has("WebSite")) suggestions.push("WebSite");
  if (!has("BreadcrumbList") && path.split("/").filter(Boolean).length >= 2) {
    suggestions.push("BreadcrumbList");
  }
  if (/\/(blog|article|post|news)\//.test(path) && !has("Article")) {
    suggestions.push("Article");
  }
  if (/\/(product|item|shop)\//.test(path) && !has("Product")) {
    suggestions.push("Product");
  }
  if (/\/(faq|help|support)/.test(path) && !has("FAQPage")) {
    suggestions.push("FAQPage");
  }
  return suggestions;
}

export function analyzeOnPage(html: string, urlString: string): OnPageAudit {
  const $ = load(html);
  const url = new URL(urlString);

  // Save the head BEFORE we strip things in getMainText
  const $head = $("head").clone();

  // ---- Meta tags ----
  const title = $head.find("title").first().text().trim() || null;
  const description =
    $head.find('meta[name="description"]').attr("content")?.trim() || null;
  const canonical = $head.find('link[rel="canonical"]').attr("href")?.trim() || null;
  const viewport = $head.find('meta[name="viewport"]').attr("content")?.trim() || null;
  const robots = $head.find('meta[name="robots"]').attr("content")?.trim() || null;
  const ogTitle =
    $head.find('meta[property="og:title"]').attr("content")?.trim() || null;
  const ogDescription =
    $head.find('meta[property="og:description"]').attr("content")?.trim() || null;
  const ogImage =
    $head.find('meta[property="og:image"]').attr("content")?.trim() || null;

  // ---- Headings (capture BEFORE body strip) ----
  const h1Texts = $("h1")
    .toArray()
    .map((el) => $(el).text().replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const h2Count = $("h2").length;
  const h3Count = $("h3").length;
  const h4Count = $("h4").length;

  const headingIssues: string[] = [];
  if (h1Texts.length === 0) headingIssues.push("Page has no H1 tag");
  else if (h1Texts.length > 1)
    headingIssues.push(`Page has ${h1Texts.length} H1 tags (should be 1)`);

  // Detect heading-level skips by scanning DOM order
  const allHeadings: number[] = [];
  $("h1, h2, h3, h4, h5, h6").each((_, el) => {
    const lvl = parseInt(el.tagName.replace("h", ""), 10);
    if (!Number.isNaN(lvl)) allHeadings.push(lvl);
  });
  let skipped = false;
  for (let i = 1; i < allHeadings.length; i++) {
    if (allHeadings[i] - allHeadings[i - 1] > 1) {
      skipped = true;
      break;
    }
  }
  if (skipped) headingIssues.push("Heading hierarchy skips a level (e.g., H2 → H4)");

  // ---- Images ----
  const allImgs = $("img").toArray();
  const imagesTotal = allImgs.length;
  const missingAltImgs = allImgs.filter((el) => {
    const alt = $(el).attr("alt");
    return alt == null || alt.trim() === "";
  });
  const sampleMissing = missingAltImgs.slice(0, 10).map((el) => {
    const src = $(el).attr("src") || $(el).attr("data-src") || "";
    let nearbyText = $(el).attr("aria-label") || $(el).attr("title") || "";
    if (!nearbyText) {
      const parentText = $(el).parent().text().replace(/\s+/g, " ").trim();
      nearbyText = parentText.slice(0, 80);
    }
    return { src, nearbyText };
  });

  // ---- Links ----
  let internalCount = 0;
  let externalCount = 0;
  let nofollowCount = 0;
  $("a[href]").each((_, el) => {
    const href = ($(el).attr("href") || "").trim();
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
    try {
      const resolved = new URL(href, url.toString());
      if (resolved.hostname === url.hostname) internalCount++;
      else externalCount++;
      const rel = ($(el).attr("rel") || "").toLowerCase();
      if (rel.includes("nofollow")) nofollowCount++;
    } catch {
      /* skip malformed */
    }
  });
  const totalCounted = internalCount + externalCount;
  const dofollowCount = Math.max(0, totalCounted - nofollowCount);

  // ---- Schema (JSON-LD) ----
  const schemaTypes: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      collectSchemaTypes(data, schemaTypes);
    } catch {
      /* skip malformed */
    }
  });
  const uniqueSchemaTypes = Array.from(new Set(schemaTypes));
  const schemaSuggested = inferSuggestedSchema(url, uniqueSchemaTypes);

  // ---- Words / readability ----
  const text = getMainText($);
  const words = text.split(/\s+/).filter((w) => /[a-z]/i.test(w));
  const wordCount = words.length;
  const sentences = text
    .split(/[.!?]+(?:\s|$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const sentenceCount = Math.max(1, sentences.length);

  let syllableCount = 0;
  for (const w of words) syllableCount += countSyllables(w);
  syllableCount = Math.max(1, syllableCount);

  const flesch =
    wordCount > 0
      ? 206.835 -
        1.015 * (wordCount / sentenceCount) -
        84.6 * (syllableCount / wordCount)
      : 0;
  const grade =
    wordCount > 0
      ? 0.39 * (wordCount / sentenceCount) +
        11.8 * (syllableCount / wordCount) -
        15.59
      : 0;
  const readingMinutes = Math.max(1, Math.round(wordCount / 225));

  return {
    words: wordCount,
    readingMinutes,
    readability: {
      flesch: Math.round(flesch * 10) / 10,
      grade: Math.round(grade * 10) / 10,
      label: readabilityLabel(grade),
    },
    headings: {
      h1: h1Texts,
      h2Count,
      h3Count,
      h4Count,
      issues: headingIssues,
    },
    images: {
      total: imagesTotal,
      missingAlt: missingAltImgs.length,
      sampleMissing,
    },
    links: {
      internal: internalCount,
      external: externalCount,
      nofollow: nofollowCount,
      dofollow: dofollowCount,
    },
    schema: {
      types: uniqueSchemaTypes,
      count: uniqueSchemaTypes.length,
      suggested: schemaSuggested,
    },
    meta: {
      title,
      titleLength: title?.length ?? 0,
      description,
      descriptionLength: description?.length ?? 0,
      canonical,
      viewport,
      ogTitle,
      ogDescription,
      ogImage,
      robots,
    },
  };
}
