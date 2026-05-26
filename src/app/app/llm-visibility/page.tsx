import { ComingSoon } from "@/components/ComingSoon";

export default function LlmVisibilityPage() {
  return (
    <ComingSoon
      kicker="llm visibility"
      title="Track how AI answers mention your brand."
      subtitle="Monitor brand mentions across ChatGPT, Claude, Gemini, Perplexity for target queries. Visibility score, citation count, competitor gap analysis."
      why="Needs API access to each LLM and a daily cron to re-query. The pattern is straightforward, the cost is the limiter — at hundreds of queries per day across four providers, this adds up fast."
      needs={[
        "API keys for OpenAI, Anthropic, Google Gemini, Perplexity.",
        "A daily cron job to re-run every monitored query.",
        "Postgres to store responses, mentions, and trends over time.",
        "A small NER / regex layer to detect brand and URL mentions in the model output.",
      ]}
    />
  );
}
