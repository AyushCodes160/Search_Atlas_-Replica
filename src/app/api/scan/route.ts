import { NextRequest, NextResponse } from "next/server";
import { analyzeOnPage } from "@/lib/onPage";
import { fetchPage } from "@/lib/fetchPage";

export const runtime = "nodejs";
export const maxDuration = 20;

// Fast, Lighthouse-free page scan: fetch HTML and run the on-page parser only.
// ~1-2s per page vs ~25s for the full /api/audit Lighthouse run, so the
// whole-site crawl can hit every page quickly.
export async function POST(req: NextRequest) {
  try {
    const { url } = (await req.json()) as { url?: string };
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "url required" }, { status: 400 });
    }
    let target: URL;
    try {
      target = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    } catch {
      return NextResponse.json({ error: "invalid url" }, { status: 400 });
    }

    const r = await fetchPage(target.toString(), { timeoutMs: 12_000 });
    if (r.error) {
      return NextResponse.json({ error: r.error }, { status: 502 });
    }

    const { contentType, status, finalUrl } = r;

    // Firewall / anti-bot block — report it honestly instead of treating the
    // challenge page as real content.
    if (r.block.blocked) {
      return NextResponse.json({
        url: target.toString(),
        finalUrl,
        status,
        sourceType: "blocked",
        isBlockedByFirewall: true,
        blockVendor: r.block.vendor,
      });
    }

    if (!contentType.includes("text/html")) {
      // Not an auditable web page (likely JSON/asset) — report and skip.
      return NextResponse.json({
        url: target.toString(),
        finalUrl,
        status,
        sourceType: "non-html",
        contentType,
      });
    }

    const html = r.body;
    const onPage = analyzeOnPage(html, target.toString());

    // Derive per-page issues from the on-page data (the same flags Search
    // Atlas surfaces from an HTML skim — no Lighthouse needed).
    const issues: string[] = [];
    if (!onPage.meta.title) issues.push("Missing <title>");
    else if (onPage.meta.titleLength > 60) issues.push(`Title too long (${onPage.meta.titleLength} chars)`);
    else if (onPage.meta.titleLength < 15) issues.push(`Title very short (${onPage.meta.titleLength} chars)`);
    if (!onPage.meta.description) issues.push("Missing meta description");
    else if (onPage.meta.descriptionLength > 160) issues.push(`Meta description too long (${onPage.meta.descriptionLength} chars)`);
    if (onPage.headings.h1.length === 0) issues.push("No H1");
    else if (onPage.headings.h1.length > 1) issues.push(`Multiple H1s (${onPage.headings.h1.length})`);
    if (onPage.headings.issues.length) issues.push(...onPage.headings.issues);
    if (onPage.words < 300) issues.push(`Thin content (${onPage.words} words)`);
    if (onPage.images.missingAlt > 0) issues.push(`${onPage.images.missingAlt} images missing alt`);
    if (!onPage.meta.canonical) issues.push("No canonical tag");

    return NextResponse.json({
      url: target.toString(),
      finalUrl,
      status,
      sourceType: "web",
      onPage,
      issues,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "scan failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
