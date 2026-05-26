import { ComingSoon } from "@/components/ComingSoon";

export default function OttoSeoPage() {
  return (
    <ComingSoon
      kicker="otto seo"
      title="Auto-apply on-page fixes."
      subtitle="Crawl a site, generate meta titles / descriptions / alt text / schema, and push them live via a CMS plugin or JS snippet."
      why="OTTO is the flagship Search-Atlas-style feature: not just suggesting fixes, but applying them. The audit + Llama writer logic exists already — what's missing is the connector that pushes changes back into a live site."
      needs={[
        "A CMS plugin for WordPress / Shopify / Webflow OR a JS snippet that injects fixes client-side.",
        "OAuth for Google Search Console + Google Analytics 4 to prioritise fixes by traffic value.",
        "A Playwright-based deep crawler (currently only one URL at a time).",
        "Background job queue (BullMQ + Redis) so 10k-page crawls don't block requests.",
      ]}
    />
  );
}
