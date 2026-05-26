import { ComingSoon } from "@/components/ComingSoon";

export default function BacklinksPage() {
  return (
    <ComingSoon
      kicker="backlinks"
      title="Link intel: analyze, compare, outreach."
      subtitle="Pull a full backlink profile, flag toxic links, find gap opportunities competitors rank for, build a prospect list, and run AI-written outreach sequences."
      why="Backlink data is the single most expensive piece of SEO infrastructure. There is no good free source — Ahrefs starts at USD 129 per month, Majestic at USD 50, Moz at USD 99."
      needs={[
        "An Ahrefs / Majestic / Moz API key (or a Common Crawl pipeline as a slow fallback).",
        "Postgres for the prospect CRM (status, last contact, replies).",
        "Email send infrastructure (Resend or SES) for outreach sequences.",
      ]}
    />
  );
}
