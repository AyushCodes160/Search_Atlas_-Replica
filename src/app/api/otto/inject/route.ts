import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get("domain");
  const url = searchParams.get("url") || "";
  const sandbox = searchParams.get("sandbox") === "true";

  let titleFix = "";
  let descFix = "";
  let imageFixes: { src: string; alt: string }[] = [];
  let schemas: string[] = [];

  if (sandbox) {
    // Generate JS payload directly from query params or sandbox defaults
    titleFix = searchParams.get("title") || "Sandbox Optimized Title";
    descFix = searchParams.get("description") || "Sandbox optimized description showing active JS injection!";
    const imageAltsRaw = searchParams.get("imageAlts") || "";
    try {
      if (imageAltsRaw) {
        imageFixes = JSON.parse(imageAltsRaw);
      }
    } catch {
      imageFixes = [
        { src: "/images/hero-banner.jpg", alt: "Mock Hero Banner Alt" },
        { src: "/assets/chart.png", alt: "Mock Visibility Chart Alt" }
      ];
    }
    schemas = [JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": titleFix,
      "description": descFix
    })];
  } else if (domain) {
    try {
      // Find all applied fixes for this domain
      const fixes = await prisma.ottoFix.findMany({
        where: {
          domain,
          status: "applied",
          // If a specific URL is provided, match it. Otherwise, match domain level.
          ...(url ? { url } : {})
        }
      });

      fixes.forEach(f => {
        if (f.fixType === "meta_title") {
          titleFix = f.optimizedValue;
        } else if (f.fixType === "meta_description") {
          descFix = f.optimizedValue;
        } else if (f.fixType === "img_alt") {
          try {
            // optimizedValue could contain a list of src/alt mappings or a single alt
            if (f.optimizedValue.startsWith("[") || f.optimizedValue.startsWith("{")) {
              const parsed = JSON.parse(f.optimizedValue);
              if (Array.isArray(parsed)) imageFixes = parsed;
            } else if (f.originalValue) {
              imageFixes.push({ src: f.originalValue, alt: f.optimizedValue });
            }
          } catch {
            if (f.originalValue) imageFixes.push({ src: f.originalValue, alt: f.optimizedValue });
          }
        } else if (f.fixType === "schema") {
          schemas.push(f.optimizedValue);
        }
      });
    } catch (err) {
      console.error("Failed to query applied fixes for injection: ", err);
    }
  }

  // Construct JavaScript payload
  const jsCode = `
/**
 * OTTO SEO - Dynamic On-Page Optimization Snippet
 * Powered by SEO Engine. Auto-applied metadata and alt fixes.
 */
(function() {
  console.log("[OTTO SEO] Snippet loaded for domain: ${domain || "sandbox"}. URL: " + window.location.href);

  function applyOptimizations() {
    // 1. Title Override
    ${titleFix ? `
    console.log("[OTTO SEO] Injected optimized title: ${titleFix.replace(/"/g, '\\"')}");
    document.title = "${titleFix.replace(/"/g, '\\"')}";
    ` : ""}

    // 2. Meta Description Override
    ${descFix ? `
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', "${descFix.replace(/"/g, '\\"')}");
    console.log("[OTTO SEO] Injected optimized meta description.");
    ` : ""}

    // 3. Image Alt Tag Corrections
    ${imageFixes.length > 0 ? `
    const imagesToFix = ${JSON.stringify(imageFixes)};
    imagesToFix.forEach(imgFix => {
      // Find img element containing the src
      const selector = 'img[src*="' + imgFix.src.split('/').pop() + '"]';
      const el = document.querySelector(selector);
      if (el) {
        el.setAttribute('alt', imgFix.alt);
        console.log("[OTTO SEO] Injected alt tag for image: " + imgFix.src);
      }
    });
    ` : ""}

    // 4. JSON-LD Schema injection
    ${schemas.length > 0 ? `
    const schemas = ${JSON.stringify(schemas)};
    schemas.forEach((schemaStr, idx) => {
      // Check if schema already added
      const existingId = 'otto-schema-' + idx;
      if (!document.getElementById(existingId)) {
        const scriptEl = document.createElement('script');
        scriptEl.id = existingId;
        scriptEl.type = 'application/ld+json';
        scriptEl.text = schemaStr;
        document.head.appendChild(scriptEl);
        console.log("[OTTO SEO] Injected JSON-LD structured schema.");
      }
    });
    ` : ""}
  }

  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyOptimizations);
  } else {
    applyOptimizations();
  }
})();
  `.trim();

  return new Response(jsCode, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=60",
      "Access-Control-Allow-Origin": "*",
    }
  });
}
