import AuditTool from "@/components/AuditTool";
import { PageHeader } from "@/components/PageHeader";

export default function SiteAuditPage() {
  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-20 sm:pt-10 pb-10 max-w-5xl">
      <PageHeader
        kicker="site audit"
        title="What's holding your page back?"
        subtitle="Paste a URL. Real Lighthouse + Llama 3.3 fix plan in about forty seconds. JSON APIs auto-route to a backend review."
      />
      <AuditTool />
    </div>
  );
}
