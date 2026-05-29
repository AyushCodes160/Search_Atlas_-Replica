"use client";

import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import {
  Megaphone,
  Loader2,
  RefreshCw,
  Copy,
  Check,
  Lightbulb,
  Globe,
  Facebook,
  Linkedin,
  Sparkles,
  ChevronDown,
} from "lucide-react";

type AdVariant = {
  label: string;
  headlines?: string[];
  descriptions?: string[];
  displayPaths?: string[];
  sitelinks?: { title: string; description?: string }[];
  primaryText?: string;
  cta?: string;
};

type AdResult = {
  platform: string;
  variants: AdVariant[];
  tips?: string[];
};

const PLATFORMS = [
  { id: "google", label: "Google Ads", icon: Globe },
  { id: "meta", label: "Meta / Facebook", icon: Facebook },
  { id: "linkedin", label: "LinkedIn", icon: Linkedin },
];

const TONES = ["Professional", "Casual", "Urgent", "Playful", "Authoritative", "Friendly"];

/* ─── Google Ad Preview Card ─── */
function GoogleAdPreview({ variant }: { variant: AdVariant }) {
  return (
    <div className="bg-white rounded-xl border border-ink/10 p-5 space-y-2 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-3">
        <span className="bg-clay/10 text-clay text-[10px] font-sans font-bold px-2 py-0.5 rounded-full">
          Variant {variant.label}
        </span>
        <span className="text-[10px] font-sans text-ink-soft">Google Search</span>
      </div>
      
      {/* Sponsored tag */}
      <p className="text-[10px] font-sans font-bold text-ink-soft">Sponsored</p>
      
      {/* Display URL */}
      <div className="flex items-center gap-1">
        <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
          <Globe className="w-3 h-3 text-emerald-700" />
        </div>
        <div>
          <p className="text-[11px] font-sans text-ink-soft">yourwebsite.com</p>
          {variant.displayPaths && (
            <p className="text-[10px] font-sans text-ink-soft">
              /{variant.displayPaths.join("/")}
            </p>
          )}
        </div>
      </div>

      {/* Headlines */}
      <h3 className="text-[16px] font-sans text-[#1a0dab] leading-snug cursor-pointer hover:underline">
        {variant.headlines?.join(" | ")}
      </h3>

      {/* Descriptions */}
      <p className="text-[13px] font-sans text-ink-soft leading-relaxed">
        {variant.descriptions?.join(" ")}
      </p>

      {/* Sitelinks */}
      {variant.sitelinks && variant.sitelinks.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-ink/5">
          {variant.sitelinks.map((sl, i) => (
            <div key={i}>
              <p className="text-[12px] font-sans text-[#1a0dab] hover:underline cursor-pointer">{sl.title}</p>
              {sl.description && <p className="text-[10px] font-sans text-ink-soft">{sl.description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Meta Ad Preview Card ─── */
function MetaAdPreview({ variant }: { variant: AdVariant }) {
  return (
    <div className="bg-white rounded-xl border border-ink/10 overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 px-4 pt-4 mb-2">
        <span className="bg-clay/10 text-clay text-[10px] font-sans font-bold px-2 py-0.5 rounded-full">
          Variant {variant.label}
        </span>
        <span className="text-[10px] font-sans text-ink-soft">Meta / Facebook</span>
      </div>
      
      {/* Header */}
      <div className="px-4 flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600" />
        <div>
          <p className="text-[12px] font-sans font-bold text-ink">Your Brand</p>
          <p className="text-[10px] font-sans text-ink-soft">Sponsored · 🌐</p>
        </div>
      </div>

      {/* Primary Text */}
      <p className="px-4 text-[13px] font-sans text-ink leading-relaxed mb-3">
        {variant.primaryText || variant.descriptions?.[0]}
      </p>

      {/* Image placeholder */}
      <div className="bg-gradient-to-br from-slate-100 to-slate-200 h-32 flex items-center justify-center">
        <p className="text-[11px] text-ink-soft font-sans">Ad Creative Image</p>
      </div>

      {/* Bottom section */}
      <div className="px-4 py-3 border-t border-ink/5 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-sans text-ink-soft">yourwebsite.com</p>
          <p className="text-[14px] font-sans font-bold text-ink">{variant.headlines?.[0]}</p>
          <p className="text-[11px] font-sans text-ink-soft">{variant.descriptions?.[0]?.slice(0, 60)}</p>
        </div>
        <button className="bg-ink/5 text-ink text-[12px] font-sans font-semibold px-3 py-1.5 rounded-lg">
          {variant.cta || "Learn More"}
        </button>
      </div>
    </div>
  );
}

/* ─── LinkedIn Ad Preview Card ─── */
function LinkedInAdPreview({ variant }: { variant: AdVariant }) {
  return (
    <div className="bg-white rounded-xl border border-ink/10 overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 px-4 pt-4 mb-2">
        <span className="bg-clay/10 text-clay text-[10px] font-sans font-bold px-2 py-0.5 rounded-full">
          Variant {variant.label}
        </span>
        <span className="text-[10px] font-sans text-ink-soft">LinkedIn</span>
      </div>
      
      {/* Header */}
      <div className="px-4 flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-600 to-blue-800" />
        <div>
          <p className="text-[12px] font-sans font-bold text-ink">Your Company</p>
          <p className="text-[10px] font-sans text-ink-soft">Promoted</p>
        </div>
      </div>

      {/* Intro text */}
      <p className="px-4 text-[13px] font-sans text-ink leading-relaxed mb-3">
        {variant.primaryText || variant.descriptions?.[0]}
      </p>

      {/* Image placeholder */}
      <div className="bg-gradient-to-br from-blue-50 to-slate-100 h-28 flex items-center justify-center">
        <p className="text-[11px] text-ink-soft font-sans">Ad Creative</p>
      </div>

      {/* Bottom section */}
      <div className="px-4 py-3 border-t border-ink/5">
        <p className="text-[14px] font-sans font-bold text-ink mb-0.5">{variant.headlines?.[0]}</p>
        <p className="text-[11px] font-sans text-ink-soft mb-2">{variant.descriptions?.[0]?.slice(0, 80)}</p>
        <button className="bg-[#0a66c2] text-white text-[12px] font-sans font-semibold px-4 py-1.5 rounded-full">
          {variant.cta || "Learn More"}
        </button>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function SmartAdsPage() {
  const [product, setProduct] = useState("");
  const [keywords, setKeywords] = useState("");
  const [platform, setPlatform] = useState("google");
  const [tone, setTone] = useState("Professional");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AdResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  async function generateAds(e: React.FormEvent) {
    e.preventDefault();
    if (!product.trim() || !keywords.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/smart-ads/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, keywords, platform, tone: tone.toLowerCase() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate ads");
      }

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to generate ads");
    } finally {
      setLoading(false);
    }
  }

  function copyVariant(variant: AdVariant, idx: number) {
    const parts: string[] = [];
    if (variant.headlines) parts.push(`Headlines:\n${variant.headlines.join("\n")}`);
    if (variant.descriptions) parts.push(`Descriptions:\n${variant.descriptions.join("\n")}`);
    if (variant.primaryText) parts.push(`Primary Text: ${variant.primaryText}`);
    if (variant.displayPaths) parts.push(`Display Paths: /${variant.displayPaths.join("/")}`);
    if (variant.cta) parts.push(`CTA: ${variant.cta}`);
    if (variant.sitelinks) parts.push(`Sitelinks:\n${variant.sitelinks.map(s => `- ${s.title}`).join("\n")}`);
    
    navigator.clipboard.writeText(parts.join("\n\n"));
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  return (
    <div className="px-5 sm:px-10 py-6 max-w-6xl mx-auto min-h-screen">
      <PageHeader
        kicker="smart ads"
        title="Smart Ads"
        subtitle="AI-powered ad copy generator for Google, Meta, and LinkedIn. Create A/B test variants in seconds."
      />

      {error && (
        <div className="mb-6 p-4 rounded-xl border border-sunset/20 bg-sunset/5 text-sunset text-[13px] font-sans flex items-center gap-2">
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mt-6">
        {/* Left Column: Form */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <form onSubmit={generateAds} className="dotted-card p-5 relative flex flex-col gap-4">
            <span className="font-hand text-clay text-[18px] absolute -top-3 left-5 bg-paper-50 px-2">
              ~ ad generator ~
            </span>

            <div className="mt-2">
              <label className="block text-[11px] font-sans font-semibold text-ink-soft uppercase tracking-wide mb-1">
                Product / Service
              </label>
              <input
                type="text"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder="e.g. AI-powered SEO tool for startups"
                className="w-full bg-paper-50 border-2 border-ink/10 rounded-lg py-2 px-3 text-[13px] font-sans text-ink focus:border-ink/60 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-sans font-semibold text-ink-soft uppercase tracking-wide mb-1">
                Target Keywords
              </label>
              <textarea
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="seo tool, rank tracker, keyword research"
                rows={2}
                className="w-full bg-paper-50 border-2 border-ink/10 rounded-lg py-2 px-3 text-[13px] font-sans text-ink focus:border-ink/60 focus:outline-none transition-all resize-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-sans font-semibold text-ink-soft uppercase tracking-wide mb-1">
                Platform
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlatform(p.id)}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-lg border-2 text-[11px] font-sans font-semibold transition-all ${
                      platform === p.id
                        ? "border-clay bg-clay/5 text-clay"
                        : "border-ink/10 text-ink-soft hover:border-ink/30"
                    }`}
                  >
                    <p.icon className="w-3.5 h-3.5" />
                    {p.id === "google" ? "Google" : p.id === "meta" ? "Meta" : "LinkedIn"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-sans font-semibold text-ink-soft uppercase tracking-wide mb-1">
                Tone
              </label>
              <div className="relative">
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full bg-paper-50 border-2 border-ink/10 rounded-lg py-2 px-3 text-[13px] font-sans text-ink focus:border-ink/60 focus:outline-none transition-all appearance-none cursor-pointer"
                >
                  {TONES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-soft pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !product.trim() || !keywords.trim()}
              className="w-full bg-ink hover:bg-ink-soft text-paper-50 font-sans font-semibold text-[13px] py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Generate Ad Variants</>
              )}
            </button>
          </form>

          <div className="sticky-note p-5 border border-ink/15">
            <h4 className="font-hand text-[18px] text-ink mb-1.5">Smart Ads AI</h4>
            <p className="font-sans text-[12px] text-ink-soft leading-relaxed">
              Generates 3 A/B test ad copy variants optimized for your chosen platform. Each variant uses a different hook — benefit-driven, urgency-driven, and social-proof-driven — so you can test which resonates best with your audience.
            </p>
          </div>
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-8">
          {!result ? (
            <div className="dotted-card p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
              <Megaphone className="w-16 h-16 text-clay/25 mb-4" strokeWidth={1} />
              <h3 className="font-hand text-[24px] text-ink mb-2">No Ads Generated Yet</h3>
              <p className="font-sans text-[13px] text-ink-soft max-w-md leading-relaxed">
                Describe your product, add target keywords, pick a platform and tone, then hit <strong>Generate Ad Variants</strong>. You&apos;ll get 3 ready-to-use ad copy variants with realistic preview cards.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Variants */}
              {result.variants?.map((variant, i) => (
                <div key={i} className="relative group">
                  {platform === "google" && <GoogleAdPreview variant={variant} />}
                  {platform === "meta" && <MetaAdPreview variant={variant} />}
                  {platform === "linkedin" && <LinkedInAdPreview variant={variant} />}
                  
                  {/* Copy button */}
                  <button
                    onClick={() => copyVariant(variant, i)}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-ink/80 text-white text-[10px] font-sans font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1"
                  >
                    {copiedIdx === i ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
                  </button>
                </div>
              ))}

              {/* Tips */}
              {result.tips && result.tips.length > 0 && (
                <div className="dotted-card p-5 mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-4 h-4 text-gold" />
                    <span className="font-hand text-[16px] text-ink">Pro Tips</span>
                  </div>
                  <ul className="space-y-1.5">
                    {result.tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-[12px] font-sans text-ink-soft">
                        <span className="text-clay mt-0.5">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Regenerate */}
              <button
                onClick={generateAds as any}
                className="w-full border-2 border-ink/15 text-ink font-sans font-semibold text-[12px] py-2.5 rounded-lg hover:bg-ink/5 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Regenerate Variants
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
