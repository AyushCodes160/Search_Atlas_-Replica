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

  // Option A States
  const [activeTab, setActiveTab] = useState<"brief" | "editor">("brief");
  const [editorText, setEditorText] = useState("");
  const [targetKeywords, setTargetKeywords] = useState("");
  const [editorMode, setEditorMode] = useState<"edit" | "preview">("edit");

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

  // SEO Grader Auditor Computations
  const words = editorText.trim().split(/\s+/).filter(Boolean).length;
  const chars = editorText.length;
  
  const targetWords = 
    kind === "blog" 
      ? (length === "long" ? 2400 : length === "short" ? 800 : 1600) 
      : kind === "buyerguide" 
      ? 2000 
      : kind === "landing" 
      ? 600 
      : kind === "linkedin" 
      ? 180 
      : kind === "email" || kind === "coldemail" 
      ? 250 
      : kind === "product" || kind === "amazon" 
      ? 200 
      : 800;

  const lines = editorText.split("\n");
  let h1Count = 0;
  let h2Count = 0;
  let h3Count = 0;
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("# ")) h1Count++;
    else if (trimmed.startsWith("## ")) h2Count++;
    else if (trimmed.startsWith("### ")) h3Count++;
  });

  const paragraphs = editorText.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  let longParagraphs = 0;
  paragraphs.forEach((p) => {
    const pWords = p.split(/\s+/).filter(Boolean).length;
    if (pWords > 150) longParagraphs++;
  });

  const sentenceCount = editorText.split(/[.!?]+/).filter((s) => s.trim().length > 0).length || 1;
  const avgSentenceLength = words / sentenceCount;
  let readability = "Easy";
  if (avgSentenceLength > 20) readability = "Hard";
  else if (avgSentenceLength > 12) readability = "Medium";

  const kwCounts: Record<string, number> = {};
  const kwList = targetKeywords
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  
  kwList.forEach((kw) => {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "gi");
    const matches = editorText.match(regex);
    kwCounts[kw] = matches ? matches.length : 0;
  });

  // Score Calculations
  const wordScore = Math.min(30, Math.round((words / targetWords) * 30));
  
  let kwScore = 0;
  if (kwList.length === 0) {
    kwScore = 30;
  } else {
    let kwPoints = 0;
    kwList.forEach((kw) => {
      const count = kwCounts[kw] || 0;
      if (count === 0) return;
      const density = (count / (words || 1)) * 100;
      if (density >= 0.8 && density <= 2.5) {
        kwPoints += 1;
      } else if (density > 0 && density < 0.8) {
        kwPoints += 0.5;
      } else if (density > 2.5 && density < 4.0) {
        kwPoints += 0.5;
      }
    });
    kwScore = Math.round((kwPoints / kwList.length) * 30);
  }

  const hasKeywordInH1 = 
    kwList.length > 0 && 
    (new RegExp(`# .*${kwList[0]}.*`, "i").test(editorText) || 
     (lines[0] ? lines[0].toLowerCase().includes(kwList[0].toLowerCase()) : false));

  const first150Words = editorText.split(/\s+/).slice(0, 150).join(" ");
  const hasKeywordInIntro = kwList.length > 0 && first150Words.toLowerCase().includes(kwList[0].toLowerCase());
  const hasSubheadings = (h2Count + h3Count) >= 2;
  const hasNoLongParagraphs = longParagraphs === 0 && paragraphs.length > 0;

  let checklistPoints = 0;
  if (hasKeywordInH1) checklistPoints += 10;
  if (hasKeywordInIntro) checklistPoints += 10;
  if (hasSubheadings) checklistPoints += 10;
  if (hasNoLongParagraphs) checklistPoints += 10;

  const finalScore = Math.max(0, Math.min(100, wordScore + kwScore + checklistPoints));
  const scoreColor = finalScore >= 80 ? "#1b9e5f" : finalScore >= 50 ? "#e2b203" : "#c2412a";
  const strokeDashoffset = 251.2 - (251.2 * finalScore) / 100;

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-20 sm:pt-10 pb-10 max-w-6xl">
      {/* Hidden print page */}
      <div 
        className="hidden print:block ai-prose print:p-8 print:bg-white" 
        dangerouslySetInnerHTML={{ __html: mdToHtml(editorText) }} 
      />

      <div className="print-hide">
        <PageHeader
          kicker="content"
          title="Write something worth shipping."
          subtitle="Pick a format, give Llama a topic, ship the draft. All Markdown output, all Groq-powered, all free."
        />

        {/* Tab Controls */}
        <div className="flex gap-2 mb-6 border-b-2 border-ink/20 pb-0.5">
          <button
            onClick={() => setActiveTab("brief")}
            className={`px-5 py-2 font-hand text-[20px] rounded-t-lg border-2 border-b-0 transition-transform ${
              activeTab === "brief"
                ? "bg-paper-50 border-ink text-ink font-bold translate-y-[2px]"
                : "bg-paper/40 border-ink/40 text-ink-soft hover:border-ink/70 hover:text-ink"
            }`}
          >
            1. AI Writer
          </button>
          <button
            onClick={() => setActiveTab("editor")}
            className={`px-5 py-2 font-hand text-[20px] rounded-t-lg border-2 border-b-0 transition-transform ${
              activeTab === "editor"
                ? "bg-paper-50 border-ink text-ink font-bold translate-y-[2px]"
                : "bg-paper/40 border-ink/40 text-ink-soft hover:border-ink/70 hover:text-ink"
            }`}
          >
            2. SEO Grader & Editor
          </button>
        </div>

        {activeTab === "brief" ? (
          <>
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
                      onClick={() => {
                        setEditorText(result.content);
                        setTargetKeywords(topic);
                        setActiveTab("editor");
                      }}
                      className="font-hand text-[15px] text-ink border border-teal rounded-full px-4 py-1.5 bg-teal/10 hover:bg-teal/20 inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Pencil className="w-4 h-4 text-teal" />
                      Open in SEO Editor →
                    </button>
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
          </>
        ) : (
          /* Editor Tab UI */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Markdown Editor */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              <div className="dotted-card p-5 relative flex flex-col gap-4">
                <span className="font-hand text-clay text-[18px] absolute -top-3 left-5 bg-paper-50 px-2">
                  ~ interactive workspace ~
                </span>
                
                <div className="grid grid-cols-1 gap-2 mt-2">
                  <Field label="Target Keywords (comma-separated)">
                    <input
                      value={targetKeywords}
                      onChange={(e) => setTargetKeywords(e.target.value)}
                      placeholder="e.g. yoga retreats, Bali beginners, yoga Bali"
                      className="w-full px-3 py-2 rounded-lg bg-paper-50 border border-ink/20 outline-none text-[14px] focus:ring-2 focus:ring-teal-accent/30 font-sans"
                    />
                  </Field>
                </div>

                <div className="mt-2">
                  <div className="flex gap-2 mb-2 border-b border-ink/10">
                    <button
                      onClick={() => setEditorMode("edit")}
                      className={`px-3 py-1 font-hand text-[16px] border-b-2 transition-colors ${
                        editorMode === "edit" ? "border-teal text-teal font-bold" : "border-transparent text-ink-soft"
                      }`}
                    >
                      Write Markdown
                    </button>
                    <button
                      onClick={() => setEditorMode("preview")}
                      className={`px-3 py-1 font-hand text-[16px] border-b-2 transition-colors ${
                        editorMode === "preview" ? "border-teal text-teal font-bold" : "border-transparent text-ink-soft"
                      }`}
                    >
                      Live Preview
                    </button>
                  </div>

                  {editorMode === "edit" ? (
                    <textarea
                      value={editorText}
                      onChange={(e) => setEditorText(e.target.value)}
                      placeholder="Start writing or paste your Markdown content here..."
                      rows={20}
                      className="w-full px-4 py-3 rounded-lg bg-paper-50 border border-ink/20 outline-none text-[15px] focus:ring-2 focus:ring-teal-accent/30 font-mono leading-relaxed resize-y min-h-[480px]"
                    />
                  ) : (
                    <div
                      className="ai-prose p-4 rounded-lg bg-paper-50 border border-ink/20 min-h-[480px] overflow-y-auto"
                      dangerouslySetInnerHTML={{ 
                        __html: mdToHtml(editorText || "*Start typing in 'Write Markdown' to see it rendered here...*") 
                      }}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: SEO Assistant Sidebar */}
            <div className="lg:col-span-5 sticky top-24 flex flex-col gap-6">
              <div className="sticky-note p-6 border border-ink/15 flex flex-col gap-6">
                
                {/* Score Dial */}
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20 shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke="rgba(0,64,63,0.08)"
                        strokeWidth="8"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke={scoreColor}
                        strokeWidth="8"
                        strokeDasharray="251.2"
                        strokeDashoffset={strokeDashoffset}
                        className="score-ring"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="font-hand text-[22px] font-bold leading-none" style={{ color: scoreColor }}>{finalScore}</span>
                      <span className="text-[10px] text-ink-soft font-sans uppercase">Score</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-hand text-[22px] text-ink leading-tight">Content SEO Grade</h3>
                    <p className="text-[12.5px] text-ink-soft font-sans leading-tight">
                      {finalScore > 75 
                        ? "Excellent optimization! Ready to publish." 
                        : finalScore > 40 
                        ? "Good foundation. Address the checklist fixes below." 
                        : "Weak optimization. Add density keywords and expand length."}
                    </p>
                  </div>
                </div>

                {/* Content Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="dotted-card p-3 text-center">
                    <div className="text-[11px] text-clay font-sans uppercase font-medium">Words</div>
                    <div className="font-hand text-[22px] font-bold text-ink leading-none mt-1">{words}</div>
                    <div className="text-[10px] text-ink-soft font-sans mt-1">Target: {targetWords}</div>
                  </div>
                  <div className="dotted-card p-3 text-center">
                    <div className="text-[11px] text-clay font-sans uppercase font-medium">Headings</div>
                    <div className="font-hand text-[22px] font-bold text-ink leading-none mt-1">{h1Count + h2Count + h3Count}</div>
                    <div className="text-[10px] text-ink-soft font-sans mt-1">H1: {h1Count} · H2+: {h2Count + h3Count}</div>
                  </div>
                  <div className="dotted-card p-3 text-center">
                    <div className="text-[11px] text-clay font-sans uppercase font-medium">Readability</div>
                    <div className="font-hand text-[19px] font-bold text-ink leading-none mt-1">{readability}</div>
                    <div className="text-[10px] text-ink-soft font-sans mt-1">Avg: {Math.round(avgSentenceLength)} w/sen</div>
                  </div>
                  <div className="dotted-card p-3 text-center">
                    <div className="text-[11px] text-clay font-sans uppercase font-medium">Paragraphs</div>
                    <div className="font-hand text-[22px] font-bold text-ink leading-none mt-1">{paragraphs.length}</div>
                    <div className="text-[10px] text-ink-soft font-sans mt-1">Long: {longParagraphs}</div>
                  </div>
                </div>

                {/* Keyword Densities list */}
                <div className="flex flex-col gap-3">
                  <h4 className="font-hand text-[19px] text-ink border-b border-ink/10 pb-1">Keyword Densities</h4>
                  {kwList.length === 0 ? (
                    <p className="text-[12.5px] text-ink-soft font-sans italic">Enter target keywords to track live densities.</p>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {kwList.map((kw) => {
                        const count = kwCounts[kw] || 0;
                        const density = words > 0 ? (count / words) * 100 : 0;
                        
                        let tone = { fg: "#c2691b", bg: "#fceedd", border: "#e67e22" }; // Orange / Underused
                        let label = "Underused";
                        let barColor = "#e2b203"; // sunset
                        
                        if (density >= 0.8 && density <= 2.5) {
                          tone = { fg: "#1b9e5f", bg: "#eefcf5", border: "#1b9e5f" }; // Green / Optimal
                          label = "Optimal";
                          barColor = "#1b9e5f"; // leaf
                        } else if (density > 2.5) {
                          tone = { fg: "#c2412a", bg: "#fbe2dc", border: "#c2412a" }; // Red / Overused/Stuffing
                          label = density > 4.0 ? "Stuffing" : "Overused";
                          barColor = "#c2412a"; // red
                        } else if (count === 0) {
                          tone = { fg: "#5a4b32", bg: "#f4ecd8", border: "#8a7b5f" }; // Gray / Not found
                          label = "Not found";
                          barColor = "rgba(0, 64, 63, 0.1)";
                        }
                        
                        const barWidth = Math.min(100, (density / 3.0) * 100);

                        return (
                          <div key={kw} className="flex flex-col gap-1 text-[13px] font-sans">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-ink truncate max-w-[150px]">{kw}</span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-ink-soft font-medium text-[12px]">{count} use{count !== 1 ? "s" : ""} ({density.toFixed(1)}%)</span>
                                <span 
                                  className="font-hand text-[11px] rounded-full px-2 py-0.5 border shrink-0 uppercase tracking-wide"
                                  style={{ color: tone.fg, backgroundColor: tone.bg, borderColor: tone.border }}
                                >
                                  {label}
                                </span>
                              </div>
                            </div>
                            <div className="w-full h-1.5 bg-ink/5 rounded-full overflow-hidden">
                              <div 
                                className="h-full transition-all duration-300" 
                                style={{ width: `${barWidth}%`, backgroundColor: barColor }} 
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* SEO Checklist */}
                <div className="flex flex-col gap-2">
                  <h4 className="font-hand text-[19px] text-ink border-b border-ink/10 pb-1">SEO Best Practices</h4>
                  <div className="flex flex-col gap-2">
                    <CheckItem
                      checked={words >= targetWords}
                      text={`Meet word target of ${targetWords} words (Current: ${words})`}
                    />
                    <CheckItem
                      checked={hasKeywordInH1}
                      text={kwList.length > 0 ? `Include primary keyword "${kwList[0]}" in Title / H1` : "Include primary keyword in Title / H1"}
                    />
                    <CheckItem
                      checked={hasKeywordInIntro}
                      text={kwList.length > 0 ? `Include primary keyword "${kwList[0]}" in first 150 words` : "Include primary keyword in first 150 words"}
                    />
                    <CheckItem
                      checked={hasSubheadings}
                      text="Include at least two H2/H3 subheadings to structure your article"
                    />
                    <CheckItem
                      checked={hasNoLongParagraphs}
                      text={longParagraphs > 0 ? `Keep paragraph lengths under 150 words (${longParagraphs} are too long)` : "Ensure paragraph lengths are under 150 words for readability"}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 mt-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => copy(editorText, "raw")}
                      className="flex-1 font-hand text-[15px] justify-center text-ink border border-ink/20 rounded-full py-2 hover:bg-paper-50 inline-flex items-center gap-1.5"
                    >
                      {copied === "raw" ? <Check className="w-4 h-4 text-teal-accent" strokeWidth={3} /> : <Copy className="w-4 h-4" />}
                      Copy Markdown
                    </button>
                    <button
                      onClick={() => copy(mdToHtml(editorText), "render")}
                      className="flex-1 font-hand text-[15px] justify-center text-ink border border-ink/20 rounded-full py-2 hover:bg-paper-50 inline-flex items-center gap-1.5"
                    >
                      {copied === "render" ? <Check className="w-4 h-4 text-teal-accent" strokeWidth={3} /> : <Copy className="w-4 h-4" />}
                      Copy Rich HTML
                    </button>
                  </div>
                  <button
                    onClick={() => window.print()}
                    className="btn-led font-hand text-[17px] justify-center py-2.5 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileText className="w-4 h-4" /> Export PDF Report
                  </button>
                </div>

              </div>
            </div>

          </div>
        )}
      </div>
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

function CheckItem({ checked, text }: { checked: boolean; text: string }) {
  return (
    <div className="flex items-start gap-2 text-[12.5px] font-sans text-ink-soft">
      {checked ? (
        <Check className="w-4 h-4 text-leaf shrink-0 mt-0.5" strokeWidth={3} />
      ) : (
        <AlertCircle className="w-4 h-4 text-sunset shrink-0 mt-0.5" strokeWidth={2} />
      )}
      <span className={checked ? "line-through opacity-70" : ""}>{text}</span>
    </div>
  );
}
