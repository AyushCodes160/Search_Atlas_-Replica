import { ComingSoon } from "@/components/ComingSoon";

export default function LocalSeoPage() {
  return (
    <ComingSoon
      kicker="local seo"
      title="GBP management + local pack heatmaps."
      subtitle="Manage Google Business Profile posts, draft AI review replies, audit GBP completeness, and visualise local pack positions across a geographic grid."
      why="The Google Business Profile API requires an approved Google Cloud OAuth client and the Business Profile API turned on per Google account."
      needs={[
        "A Google Cloud project with the Business Profile API enabled.",
        "OAuth client credentials (client ID + secret).",
        "A grid-search SERP source (DataForSEO supports this) for the heatmap.",
        "Postgres to store locations, posts, reviews, and citation status.",
      ]}
    />
  );
}
