"use client";

import { useState } from "react";
import {
  Loader2,
  Pencil,
  AlertCircle,
  Copy,
  Check,
  FileText,
  Linkedin,
  Megaphone,
  Mail,
  Tag,
  Package,
  Youtube,
  Instagram,
  Music2,
  Newspaper,
  ShoppingCart,
  BookOpen,
  MousePointerClick,
  Send,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

type Kind =
  | "blog"
  | "linkedin"
  | "ad"
  | "email"
  | "meta"
  | "product"
  | "youtube"
  | "instagram"
  | "tiktok"
  | "pressrelease"
  | "amazon"
  | "buyerguide"
  | "landing"
  | "coldemail";

const KINDS: { value: Kind; label: string; Icon: typeof FileText; hint: string }[] = [
  { value: "blog", label: "Blog post", Icon: FileText, hint: "SEO-optimised article with headings + meta tags" },
  { value: "buyerguide", label: "Buyer's guide", Icon: BookOpen, hint: "Long-form review-style article + FAQ" },
  { value: "landing", label: "Landing page", Icon: MousePointerClick, hint: "Hero, features, social proof, FAQ, final CTA" },
  { value: "linkedin", label: "LinkedIn post", Icon: Linkedin, hint: "Mobile-friendly hook + paragraphs + CTA" },
  { value: "youtube", label: "YouTube script", Icon: Youtube, hint: "Title, hook, sections, B-roll, chapters" },
  { value: "tiktok", label: "TikTok script", Icon: Music2, hint: "30-45s script with beats + overlays" },
  { value: "instagram", label: "Instagram caption", Icon: Instagram, hint: "3 caption variations + hashtags" },
  { value: "email", label: "Marketing email", Icon: Mail, hint: "Subject + preview + body + CTA" },
  { value: "coldemail", label: "Cold outreach", Icon: Send, hint: "3 cold-email variations, different angles" },
  { value: "ad", label: "Google Ad", Icon: Megaphone, hint: "3 variations, headlines + descriptions, char-counted" },
  { value: "pressrelease", label: "Press release", Icon: Newspaper, hint: "AP-style release with quotes + boilerplate" },
  { value: "amazon", label: "Amazon listing", Icon: ShoppingCart, hint: "Title, 5 bullets, description, backend keywords" },
  { value: "product", label: "Product description", Icon: Package, hint: "Headline + description + features + best-for" },
  { value: "meta", label: "Meta tags", Icon: Tag, hint: "Title + description + 3 alt variations" },
];

const LANGUAGES = ["English", "Spanish", "French", "German", "Hindi", "Portuguese", "Italian", "Japanese"];

function mdToHtml(md: string): string {
  let html = md.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  html = html.replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code}</code></pre>`);
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/^# (.*$)/gim, "<h2>$1</h2>");
  html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>");
  html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/^\s*\d+\.\s+(.+)$/gim, "<oli>$1</oli>");
  html = html.replace(/(<oli>[\s\S]+?<\/oli>)/g, (m) => "<ol>" + m.replace(/<\/?oli>/g, (t) => (t === "<oli>" ? "<li>" : "</li>")) + "</ol>");
  html = html.replace(/<\/ol>\s*<ol>/g, "");
  html = html.replace(/^\s*[-*] (.+)$/gim, "<li>$1</li>");
  html = html.replace(/(<li>[\s\S]+?<\/li>)/g, "<ul>$1</ul>");
  html = html.replace(/<\/ul>\s*<ul>/g, "");
  html = html
    .split(/\n{2,}/)
    .map((b) => (/^<(h\d|ul|ol|pre|li)/.test(b.trim()) ? b : `<p>${b.replace(/\n/g, "<br/>")}</p>`))
    .join("\n");
  return html;
}

export default function ContentPage() {
  const [kind, setKind] = useState<Kind>("blog");
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState("Confident, plain, expert");
  const [brandVoice, setBrandVoice] = useState("");
  const [length, setLength] = useState<"short" | "medium" | "long">("medium");
  const [pov, setPov] = useState<"first" | "second" | "third">("second");
  const [language, setLanguage] = useState<string>("English");
  const [variations, setVariations] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    content: string;
    words: number;
    chars: number;
  } | null>(null);
  const [copied, setCopied] = useState<"raw" | "render" | null>(null);

  async function run() {
    if (!topic.trim()) {
      setError("Pick a topic or keyword first.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          topic,
          audience: audience || undefined,
          tone: tone || undefined,
          brandVoice: brandVoice || undefined,
          length: kind === "blog" ? length : undefined,
          pov,
          language,
          variations,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setResult({ content: data.content, words: data.words, chars: data.chars });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function copy(text: string, which: "raw" | "render") {
    navigator.clipboard?.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 1500);
  }

  const activeKind = KINDS.find((k) => k.value === kind)!;

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-20 sm:pt-10 pb-10 max-w-6xl">
      <PageHeader
        kicker="content"
        title="Write something worth shipping."
        subtitle="Pick a format, give Llama a topic, ship the draft. All Markdown output, all Groq-powered, all free."
      />

      {/* Kind picker */}
      <div className="mb-6">
        <p className="font-hand text-clay text-[15px] mb-2">~ pick a format ~</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {KINDS.map((k) => (
            <button
              key={k.value}
              onClick={() => setKind(k.value)}
              className={`sticky-note rounded-md p-3 border-2 text-left transition-transform ${
                kind === k.value ? "border-ink/85 -translate-y-1" : "border-ink/40"
              }`}
              style={{ transform: kind === k.value ? "translateY(-4px)" : "rotate(-1deg)" }}
            >
              <k.Icon
                className={`w-4 h-4 mb-1.5 ${kind === k.value ? "text-teal-accent" : "text-ink-soft"}`}
                strokeWidth={2}
              />
              <div className="font-hand text-[17px] text-ink leading-tight">{k.label}</div>
            </button>
          ))}
        </div>
        <p className="font-sans text-[12.5px] text-ink-soft mt-3">{activeKind.hint}</p>
      </div>

      {/* Form */}
      <div className="dotted-card p-5 sm:p-6 relative mb-8">
        <span className="font-hand text-clay text-[18px] absolute -top-3 left-5 bg-paper-50 px-2">
          ~ brief ~
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <Field label="Topic or keyword (required)">
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. yoga retreats in Bali for beginners"
              className="w-full px-3 py-2.5 rounded-lg bg-paper-50 border border-ink/20 outline-none text-[14px] focus:ring-2 focus:ring-teal-accent/30 font-sans"
              onKeyDown={(e) => e.key === "Enter" && run()}
            />
          </Field>
          <Field label="Audience (optional)">
            <input
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="e.g. first-time travellers, 25-40, on a budget"
              className="w-full px-3 py-2.5 rounded-lg bg-paper-50 border border-ink/20 outline-none text-[14px] focus:ring-2 focus:ring-teal-accent/30 font-sans"
            />
          </Field>
          <Field label="Tone">
            <input
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              placeholder="e.g. casual, witty, expert, urgent"
              className="w-full px-3 py-2.5 rounded-lg bg-paper-50 border border-ink/20 outline-none text-[14px] focus:ring-2 focus:ring-teal-accent/30 font-sans"
            />
          </Field>
          {kind === "blog" && (
            <Field label="Length">
              <div className="flex gap-2">
                {(["short", "medium", "long"] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLength(l)}
                    className={`flex-1 font-hand text-[14px] px-3 py-2 rounded-full border-2 capitalize transition-colors ${
                      length === l
                        ? "bg-paper border-ink text-ink"
                        : "border-ink/40 text-ink-soft hover:border-ink"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </Field>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <Field label="Point of view">
            <div className="flex gap-2">
              {(
                [
                  { v: "first", label: "I / we" },
                  { v: "second", label: "you" },
                  { v: "third", label: "they" },
                ] as const
              ).map((p) => (
                <button
                  key={p.v}
                  type="button"
                  onClick={() => setPov(p.v)}
                  className={`flex-1 font-hand text-[14px] px-2 py-2 rounded-full border-2 transition-colors ${
                    pov === p.v ? "bg-paper border-ink text-ink" : "border-ink/40 text-ink-soft hover:border-ink"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Language">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-paper-50 border border-ink/20 outline-none text-[14px] focus:ring-2 focus:ring-teal-accent/30 font-sans"
            >
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Variations">
            <div className="flex gap-2">
              {([1, 2, 3] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setVariations(n)}
                  className={`flex-1 font-hand text-[14px] px-2 py-2 rounded-full border-2 transition-colors ${
                    variations === n ? "bg-paper border-ink text-ink" : "border-ink/40 text-ink-soft hover:border-ink"
                  }`}
                >
                  {n === 1 ? "1 (single draft)" : `${n} drafts`}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <Field label="Brand voice / SOP (optional)" className="mt-4">
          <textarea
            value={brandVoice}
            onChange={(e) => setBrandVoice(e.target.value)}
            rows={3}
            placeholder="e.g. We write in short sentences. We avoid jargon. We never call ourselves 'leaders'. We use 'you' more than 'we'."
            className="w-full px-3 py-2.5 rounded-lg bg-paper-50 border border-ink/20 outline-none text-[14px] focus:ring-2 focus:ring-teal-accent/30 font-sans resize-y"
          />
        </Field>

        <div className="flex items-center gap-3 mt-5">
          <button
            onClick={run}
            disabled={loading}
            className="btn-led inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-hand text-[20px] shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                drafting...
              </>
            ) : (
              <>
                <Pencil className="w-4 h-4" /> Generate →
              </>
            )}
          </button>
          {result && (
            <span className="font-hand text-[14px] text-clay">
              {result.words} words · {result.chars.toLocaleString()} chars
            </span>
          )}
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 text-[14px] text-sunset font-sans">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Result */}
      {result && (
        <section className="sticky-note rounded-lg p-6 sm:p-8 border border-ink/15">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
            <div>
              <p className="font-hand text-clay text-[15px] mb-1">~ llama 3.3 ~</p>
              <h2 className="font-hand text-[28px] text-ink leading-tight">
                Your draft is ready.
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => copy(result.content, "raw")}
                className="font-hand text-[15px] text-ink border border-ink/20 rounded-full px-3 py-1.5 hover:bg-paper-50 inline-flex items-center gap-1.5"
              >
                {copied === "raw" ? <Check className="w-4 h-4 text-teal-accent" /> : <Copy className="w-4 h-4" />}
                Copy Markdown
              </button>
            </div>
          </div>
          <div
            className="ai-prose"
            dangerouslySetInnerHTML={{ __html: mdToHtml(result.content) }}
          />
        </section>
      )}
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="font-hand text-[16px] text-clay block mb-1.5">{label}</span>
      {children}
    </label>
  );
}
