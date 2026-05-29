"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import {
  Loader2,
  AlertCircle,
  Copy,
  Check,
  Play,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Code,
  Image as ImageIcon,
  FileText,
  HelpCircle,
  Globe,
  Settings,
} from "lucide-react";

type ImgItem = {
  src: string;
  alt: string;
};

type ScanResult = {
  url: string;
  domain: string;
  original: {
    title: string | null;
    description: string | null;
    images: ImgItem[];
    schema: string | null;
  };
  optimized: {
    title: string;
    description: string;
    images: ImgItem[];
    schema: string;
  };
};

const SANDBOX_RESULT: ScanResult = {
  url: "https://my-blog.com/about",
  domain: "my-blog.com",
  original: {
    title: "About | My Website",
    description: "Welcome to my website's about page. We write blogs about lifestyle, development, and programming tips.",
    images: [
      { src: "/images/team-photo.jpg", alt: "" },
      { src: "/assets/logo-icon.png", alt: "" }
    ],
    schema: null,
  },
  optimized: {
    title: "About Us & Team - Modern Software & Web Design Agency",
    description: "Meet the experts behind our blog. Learn how we build modern software and write custom coding guides. Get in touch with our design team today!",
    images: [
      { src: "/images/team-photo.jpg", alt: "Our software engineering team collaborating in the main office workspace" },
      { src: "/assets/logo-icon.png", alt: "SEO Engine official brand logo icon vector design" }
    ],
    schema: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "AboutPage",
      "name": "About Us & Team",
      "description": "Meet the experts behind our blog.",
      "url": "https://my-blog.com/about"
    }, null, 2),
  }
};

export default function OttoSeoPage() {
  const [url, setUrl] = useState("https://my-blog.com/about");
  const [isSandbox, setIsSandbox] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [activeScan, setActiveScan] = useState<ScanResult | null>(null);
  
  // Local edits state
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editImages, setEditImages] = useState<Record<string, string>>({});
  const [editSchema, setEditSchema] = useState("");

  // Injection state in mock sandbox browser
  const [snippetApplied, setSnippetApplied] = useState(false);

  // Load defaults
  useEffect(() => {
    setActiveScan(SANDBOX_RESULT);
    setEditTitle(SANDBOX_RESULT.optimized.title);
    setEditDescription(SANDBOX_RESULT.optimized.description);
    const imgMap: Record<string, string> = {};
    SANDBOX_RESULT.optimized.images.forEach(img => {
      imgMap[img.src] = img.alt;
    });
    setEditImages(imgMap);
    setEditSchema(SANDBOX_RESULT.optimized.schema);
  }, []);

  const handleSandboxToggle = (checked: boolean) => {
    setIsSandbox(checked);
    setError(null);
    setSnippetApplied(false);
    if (checked) {
      setActiveScan(SANDBOX_RESULT);
      setEditTitle(SANDBOX_RESULT.optimized.title);
      setEditDescription(SANDBOX_RESULT.optimized.description);
      const imgMap: Record<string, string> = {};
      SANDBOX_RESULT.optimized.images.forEach(img => {
        imgMap[img.src] = img.alt;
      });
      setEditImages(imgMap);
      setEditSchema(SANDBOX_RESULT.optimized.schema);
      setUrl("https://my-blog.com/about");
    } else {
      setActiveScan(null);
      setEditTitle("");
      setEditDescription("");
      setEditImages({});
      setEditSchema("");
      setUrl("");
    }
  };

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setSnippetApplied(false);

    try {
      if (isSandbox) {
        // Mock scan delay
        await new Promise(r => setTimeout(r, 1200));
        // Generate a sandbox result based on url
        const domainName = new URL(url).hostname;
        const mock: ScanResult = {
          url,
          domain: domainName,
          original: {
            title: "Homepage Title | " + domainName,
            description: "Default landing page meta description for " + url + ". Needs improvement.",
            images: [
              { src: "/media/banner.png", alt: "" },
              { src: "/static/icon.svg", alt: "" }
            ],
            schema: null,
          },
          optimized: {
            title: `Optimized Home - Leading Agency on ${domainName}`,
            description: `Boost visibility on ${domainName} with our optimized templates. Click to learn about our search parameters and audit plans!`,
            images: [
              { src: "/media/banner.png", alt: `Interactive marketing banner graphics for ${domainName}` },
              { src: "/static/icon.svg", alt: `SEO Engine vector logo icon emblem` }
            ],
            schema: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": domainName,
              "url": url
            }, null, 2),
          }
        };
        setActiveScan(mock);
        setEditTitle(mock.optimized.title);
        setEditDescription(mock.optimized.description);
        const imgMap: Record<string, string> = {};
        mock.optimized.images.forEach(img => {
          imgMap[img.src] = img.alt;
        });
        setEditImages(imgMap);
        setEditSchema(mock.optimized.schema);
      } else {
        const res = await fetch("/api/otto/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to scan URL");
        }

        const data = await res.json() as ScanResult;
        setActiveScan(data);
        setEditTitle(data.optimized.title);
        setEditDescription(data.optimized.description);
        const imgMap: Record<string, string> = {};
        data.optimized.images.forEach(img => {
          imgMap[img.src] = img.alt;
        });
        setEditImages(imgMap);
        setEditSchema(data.optimized.schema);
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate optimizations");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFixes = async () => {
    if (!activeScan) return;
    setSaving(true);
    setError(null);

    try {
      if (isSandbox) {
        await new Promise(r => setTimeout(r, 800));
        alert("Fixes applied in Sandbox mode!");
      } else {
        // Save fixes to database
        const payload = [
          { fixType: "meta_title", originalValue: activeScan.original.title, optimizedValue: editTitle },
          { fixType: "meta_description", originalValue: activeScan.original.description, optimizedValue: editDescription },
          { fixType: "schema", originalValue: activeScan.original.schema, optimizedValue: editSchema },
          ...Object.entries(editImages).map(([src, alt]) => ({
            fixType: "img_alt",
            originalValue: src,
            optimizedValue: alt,
          }))
        ];

        for (const item of payload) {
          const res = await fetch("/api/me/otto", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: activeScan.url,
              domain: activeScan.domain,
              ...item,
              status: "applied"
            })
          });

          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || "Failed to apply fix: " + item.fixType);
          }
        }

        alert("Fixes applied successfully to the database!");
      }
      setSnippetApplied(true);
    } catch (err: any) {
      setError(err.message || "Failed to save fixes");
    } finally {
      setSaving(false);
    }
  };

  // Copy Snippet to Clipboard
  const copySnippet = () => {
    const domainName = activeScan?.domain || "your-site.com";
    const hostname = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const text = `<script src="${hostname}/api/otto/inject?domain=${domainName}"></script>`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="px-5 sm:px-10 py-6 max-w-6xl mx-auto min-h-screen">
      <PageHeader
        kicker="otto seo"
        title="OTTO Auto-Fix Generator"
        subtitle="Crawl search pages, generate optimizations, and apply them client-side in seconds using a copy-paste script tag."
      />

      {error && (
        <div className="mb-6 p-4 rounded-xl border border-sunset/20 bg-sunset/5 text-sunset text-[13px] font-sans flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid Layout: Config on Left (Col 4), Workspace on Right (Col 8) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mt-6">
        {/* Left Column: Form and Integration Setup */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Scan Form */}
          <div className="dotted-card p-5 relative flex flex-col gap-4">
            <span className="font-hand text-clay text-[18px] absolute -top-3 left-5 bg-paper-50 px-2">
              ~ target site crawler ~
            </span>

            <form onSubmit={handleScan} className="flex flex-col gap-3 mt-1">
              <div>
                <label className="block text-[11px] font-sans font-semibold text-ink-soft uppercase tracking-wide mb-1">
                  Page URL to Optimize
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-2.5 w-4 h-4 text-ink-soft" />
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://my-website.com/page"
                    required
                    className="w-full bg-paper-50 border-2 border-ink/10 rounded-lg py-2 pl-9 pr-3 text-[13px] font-sans text-ink focus:border-ink/60 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-ink/5 pt-3">
                <span className="text-[11.5px] font-sans font-semibold text-ink-soft uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-gold shrink-0" fill="currentColor" />
                  Sandbox Mode
                </span>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isSandbox}
                    onChange={(e) => handleSandboxToggle(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-ink/15 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-paper-50 after:border-ink/10 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-clay"></div>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || !url.trim()}
                className="mt-2 w-full bg-ink hover:bg-ink-soft text-paper-50 font-sans font-semibold text-[13px] py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Analyze &amp; Optimize
              </button>
            </form>
          </div>

          {/* Copyable JavaScript Snippet Card */}
          <div className="dotted-card p-5 relative flex flex-col gap-3">
            <span className="font-hand text-clay text-[18px] absolute -top-3 left-5 bg-paper-50 px-2">
              ~ js snippet connector ~
            </span>
            <p className="text-[11.5px] text-ink-soft font-sans leading-relaxed mt-1">
              Copy and paste this script into your site's <code>&lt;head&gt;</code> tag to automatically apply optimizations.
            </p>
            
            <div className="bg-paper-50 border border-ink/10 rounded-lg p-2.5 relative flex items-center justify-between gap-2 overflow-hidden">
              <code className="text-[10px] font-mono text-ink truncate pr-8">
                {`&lt;script src="${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/api/otto/inject?domain=${activeScan?.domain || "your-site.com"}"&gt;&lt;/script&gt;`}
              </code>
              <button
                onClick={copySnippet}
                className="absolute right-2 p-1 bg-paper-50 border border-ink/10 rounded hover:bg-ink/5 text-ink-soft transition-all"
                title="Copy script code"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Comparison Workspace and Simulated Viewport */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {!activeScan ? (
            <div className="sticky-note p-12 border border-ink/15 text-center flex flex-col items-center justify-center min-h-[400px]">
              <Settings className="w-16 h-16 text-clay/40 mb-4 animate-spin-slow" strokeWidth={1} />
              <h3 className="font-hand text-[26px] text-ink mb-2">No Active Page Optimization</h3>
              <p className="font-sans text-[14px] text-ink-soft max-w-sm mx-auto leading-relaxed">
                Input a web URL on the left and run analysis to scan current metadata and generate SEO override suggestions.
              </p>
            </div>
          ) : (
            <>
              {/* Optimizations Editor Table */}
              <div className="dotted-card p-5">
                <div className="flex items-center justify-between border-b border-ink/10 pb-3 mb-4">
                  <h3 className="font-hand text-[22px] text-ink">Original vs. AI Optimized Overrides</h3>
                  <button
                    onClick={handleApplyFixes}
                    disabled={saving}
                    className="bg-clay hover:bg-clay-soft text-paper-50 font-sans font-semibold text-[12px] px-4 py-1.5 rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-40"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Save &amp; Apply Fixes
                  </button>
                </div>

                <div className="flex flex-col gap-5">
                  {/* Meta Title Field */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pb-4 border-b border-ink/5">
                    <div className="md:col-span-3">
                      <span className="text-[11.5px] font-sans font-bold text-ink-soft uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-clay" />
                        Meta Title
                      </span>
                    </div>
                    <div className="md:col-span-9 flex flex-col gap-2">
                      <div className="bg-paper-50 border border-ink/10 rounded-lg p-2.5">
                        <span className="text-[10px] text-ink-soft block font-sans uppercase font-medium">Original HTML Tag</span>
                        <div className="text-[12.5px] font-sans text-ink-soft italic mt-0.5">
                          {activeScan.original.title || "(no title detected)"}
                        </div>
                      </div>
                      <div className="relative">
                        <span className="text-[10px] text-ink-soft block font-sans uppercase font-medium mb-1">Optimized Override</span>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full bg-paper-50 border-2 border-ink/15 rounded-lg py-1.5 px-3 text-[13px] font-sans text-ink focus:border-ink/60 focus:outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Meta Description Field */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pb-4 border-b border-ink/5">
                    <div className="md:col-span-3">
                      <span className="text-[11.5px] font-sans font-bold text-ink-soft uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-clay" />
                        Meta Description
                      </span>
                    </div>
                    <div className="md:col-span-9 flex flex-col gap-2">
                      <div className="bg-paper-50 border border-ink/10 rounded-lg p-2.5">
                        <span className="text-[10px] text-ink-soft block font-sans uppercase font-medium">Original Meta Tag</span>
                        <div className="text-[12.5px] font-sans text-ink-soft italic mt-0.5 leading-relaxed">
                          {activeScan.original.description || "(no description tag detected)"}
                        </div>
                      </div>
                      <div className="relative">
                        <span className="text-[10px] text-ink-soft block font-sans uppercase font-medium mb-1">Optimized Override</span>
                        <textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          rows={3}
                          className="w-full bg-paper-50 border-2 border-ink/15 rounded-lg py-1.5 px-3 text-[13px] font-sans text-ink focus:border-ink/60 focus:outline-none transition-all resize-none leading-relaxed"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Missing Alt Tags Fields */}
                  {activeScan.original.images.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pb-4 border-b border-ink/5">
                      <div className="md:col-span-3">
                        <span className="text-[11.5px] font-sans font-bold text-ink-soft uppercase tracking-wider flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-clay" />
                          Image Alts
                        </span>
                      </div>
                      <div className="md:col-span-9 flex flex-col gap-3">
                        {activeScan.original.images.map((img, idx) => (
                          <div key={img.src} className="flex flex-col gap-1 bg-paper-50/50 p-2.5 rounded-lg border border-ink/5">
                            <span className="text-[10.5px] font-mono text-ink-soft truncate">{img.src}</span>
                            <div className="mt-1">
                              <span className="text-[9px] font-sans uppercase font-semibold text-ink-soft tracking-wider">Alt tag suggestion</span>
                              <input
                                type="text"
                                value={editImages[img.src] || ""}
                                onChange={(e) => {
                                  setEditImages({
                                    ...editImages,
                                    [img.src]: e.target.value
                                  });
                                }}
                                className="mt-0.5 w-full bg-paper-50 border border-ink/15 rounded-md py-1 px-2.5 text-[12px] font-sans text-ink focus:border-ink/60 focus:outline-none transition-all"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* JSON-LD Schema Field */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-3">
                      <span className="text-[11.5px] font-sans font-bold text-ink-soft uppercase tracking-wider flex items-center gap-1.5">
                        <Code className="w-3.5 h-3.5 text-clay" />
                        JSON-LD Schema
                      </span>
                    </div>
                    <div className="md:col-span-9">
                      <span className="text-[10px] text-ink-soft block font-sans uppercase font-medium mb-1">Generated SEO Schema</span>
                      <textarea
                        value={editSchema}
                        onChange={(e) => setEditSchema(e.target.value)}
                        rows={6}
                        className="w-full bg-paper-50 border border-ink/15 rounded-lg p-3 text-[11.5px] font-mono text-ink focus:border-ink/60 focus:outline-none transition-all resize-none leading-relaxed"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Simulated Viewport Sandbox */}
              <div className="sticky-note p-6 border border-ink/15">
                <div className="flex items-center justify-between mb-4 border-b border-ink/10 pb-3">
                  <div>
                    <span className="font-hand text-clay text-[15px] uppercase">~ simulated sandbox ~</span>
                    <h3 className="font-sans font-bold text-[16px] text-ink mt-0.5">Mock Browser Viewport</h3>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSnippetApplied(true)}
                      disabled={snippetApplied}
                      className="bg-clay/10 border border-clay hover:bg-clay/20 text-clay font-sans font-semibold text-[11.5px] px-3.5 py-1 rounded-lg transition-all flex items-center gap-1 disabled:opacity-40"
                    >
                      <Play className="w-3 h-3" />
                      Inject Snippet
                    </button>
                    <button
                      onClick={() => setSnippetApplied(false)}
                      disabled={!snippetApplied}
                      className="bg-ink/5 hover:bg-ink/10 text-ink-soft font-sans font-semibold text-[11.5px] px-3.5 py-1 rounded-lg transition-all flex items-center gap-1 disabled:opacity-40"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset Viewport
                    </button>
                  </div>
                </div>

                {/* Browser Frame */}
                <div className="w-full bg-paper-50 rounded-xl border border-ink/15 overflow-hidden shadow-sm">
                  {/* Address Bar */}
                  <div className="bg-ink/5 px-4 py-2 border-b border-ink/10 flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-sunset/40" />
                      <div className="w-2.5 h-2.5 rounded-full bg-gold/40" />
                      <div className="w-2.5 h-2.5 rounded-full bg-clay/40" />
                    </div>
                    <div className="flex-1 bg-paper-50 border border-ink/10 rounded-md py-0.5 px-3 text-[11px] text-ink truncate font-mono">
                      {activeScan.url}
                    </div>
                  </div>

                  {/* Browser Tab Preview */}
                  <div className="bg-paper-50 px-3 py-1.5 border-b border-ink/5 flex items-center gap-1">
                    <span className="text-[10px] text-ink-soft font-sans uppercase font-bold tracking-wider">Tab Title:</span>
                    <span className="text-[11px] font-sans text-ink font-semibold truncate bg-ink/5 px-2 py-0.5 rounded">
                      {snippetApplied ? editTitle : (activeScan.original.title || "Untitled Document")}
                    </span>
                  </div>

                  {/* Simulated Content */}
                  <div className="p-5 flex flex-col gap-5 min-h-[180px]">
                    {/* Simulated Google SERP Card Preview */}
                    <div className="bg-paper-50/50 p-4 border border-ink/10 rounded-xl max-w-lg">
                      <span className="text-[9px] font-sans font-bold text-ink-soft uppercase tracking-wider block mb-1">Simulated Google snippet</span>
                      <div className="text-[11px] font-sans text-ink-soft truncate">{activeScan.url}</div>
                      <div className="text-[14px] font-sans text-indigo-700 hover:underline font-semibold leading-tight mt-0.5">
                        {snippetApplied ? editTitle : (activeScan.original.title || "Untitled")}
                      </div>
                      <div className="text-[12px] font-sans text-ink-soft leading-relaxed mt-1">
                        {snippetApplied ? editDescription : (activeScan.original.description || "No description tags found. Google will pull snippet from page content...")}
                      </div>
                    </div>

                    {/* Simulated Image Grid */}
                    {activeScan.original.images.length > 0 && (
                      <div>
                        <span className="text-[9.5px] font-sans font-bold text-ink-soft uppercase tracking-wider block mb-2">Simulated Image Alt Injection</span>
                        <div className="grid grid-cols-2 gap-3">
                          {activeScan.original.images.map(img => {
                            const activeAlt = snippetApplied ? (editImages[img.src] || "") : "";
                            return (
                              <div key={img.src} className="border border-ink/10 rounded-lg p-2.5 flex items-center gap-3 relative bg-paper-50">
                                <div className="w-10 h-10 rounded bg-ink/5 border border-ink/10 flex items-center justify-center text-ink-soft shrink-0">
                                  <ImageIcon className="w-5 h-5 stroke-1" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-[9px] font-mono text-ink-soft truncate">{img.src.split('/').pop()}</div>
                                  <div className="mt-1">
                                    {activeAlt ? (
                                      <span className="text-[9.5px] font-sans font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5">
                                        alt=&ldquo;{activeAlt}&rdquo;
                                      </span>
                                    ) : (
                                      <span className="text-[9.5px] font-sans font-semibold text-sunset bg-sunset/5 border border-sunset/15 rounded px-1.5 py-0.5">
                                        alt=&ldquo;&rdquo; (missing)
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
