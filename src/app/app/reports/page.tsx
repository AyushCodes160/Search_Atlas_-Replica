import { ComingSoon } from "@/components/ComingSoon";

export default function ReportsPage() {
  return (
    <ComingSoon
      kicker="reports"
      title="White-label SEO reports, on a schedule."
      subtitle="Pull from every connected data source — site audit, rankings, backlinks, GBP — and ship a branded PDF or shareable link weekly or monthly."
      why="Needs the other modules wired into Postgres first so there is anything to report on. PDF rendering itself is trivial — Puppeteer or react-pdf. Scheduling is a cron job."
      needs={[
        "Postgres with crawl / keyword / GBP / backlink data populated by other modules.",
        "Puppeteer or react-pdf for PDF rendering on the server.",
        "A simple drag-and-drop layout editor for the report sections.",
        "Email send infrastructure (Resend / SES) for scheduled delivery.",
      ]}
    />
  );
}
