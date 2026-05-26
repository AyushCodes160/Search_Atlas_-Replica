import { ComingSoon } from "@/components/ComingSoon";

export default function RankTrackerPage() {
  return (
    <ComingSoon
      kicker="rank tracker"
      title="Daily SERP positions across 190k locations."
      subtitle="Track keyword positions, watch trend graphs, compare against competitors, and capture SERP features (featured snippet, PAA, local pack)."
      why="Needs a live SERP data source. Free Google search scraping breaks within an hour due to anti-bot. Paid APIs like SerpAPI or DataForSEO start at about USD 50 per month."
      needs={[
        "A SerpAPI or DataForSEO key.",
        "A daily cron job (BullMQ or Vercel Cron) to refresh tracked keyword positions.",
        "Postgres to store daily snapshots and draw trend lines.",
      ]}
    />
  );
}
