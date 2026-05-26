import { ComingSoon } from "@/components/ComingSoon";

export default function SmartAdsPage() {
  return (
    <ComingSoon
      kicker="smart ads"
      title="Google Ads automation + AI ad copy."
      subtitle="Auto-optimised bid adjustments, A/B tested ad copy variants, keyword expansion, negative keyword suggestions, quality-score action lists."
      why="The whole module sits on top of the Google Ads API, which requires an approved Google Cloud project, a developer token, and OAuth from each connected ad account."
      needs={[
        "Google Cloud project with the Google Ads API enabled.",
        "A Google Ads developer token (apply via the Google Ads UI).",
        "OAuth client credentials.",
        "Postgres for campaign state and Llama for ad copy generation.",
      ]}
    />
  );
}
