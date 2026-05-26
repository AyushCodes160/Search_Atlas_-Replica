"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Bot, User as UserIcon, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

type Msg = { role: "user" | "assistant"; content: string };

const STARTERS = [
  "Build me a 30-day SEO content plan for an indie yoga retreat business.",
  "Walk me through what LCP is and 3 ways to fix a 6s LCP.",
  "What's the difference between a Lighthouse SEO score of 100 and actually ranking?",
  "Generate a topical map for the keyword 'vibe coding'.",
];

function mdToHtml(md: string): string {
  let html = md.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  html = html.replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code}</code></pre>`);
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");
  html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>");
  html = html.replace(/^# (.*$)/gim, "<h2>$1</h2>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/^\s*[-*] (.+)$/gim, "<li>$1</li>");
  html = html.replace(/(<li>[\s\S]+?<\/li>)/g, "<ul>$1</ul>");
  html = html.replace(/<\/ul>\s*<ul>/g, "");
  html = html
    .split(/\n{2,}/)
    .map((b) => (/^<(h\d|ul|pre|li)/.test(b.trim()) ? b : `<p>${b.replace(/\n/g, "<br/>")}</p>`))
    .join("\n");
  return html;
}

export default function AtlasAgentPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  async function send(text?: string) {
    const prompt = (text ?? input).trim();
    if (!prompt || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: prompt }];
    setMessages(next);
    setInput("");
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Agent failed");
      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="px-8 sm:px-12 pt-10 pb-4 max-w-4xl w-full">
        <PageHeader
          kicker="atlas agent"
          title="An SEO assistant on call."
          subtitle="Llama 3.3 70B (via Groq) with an SEO system prompt. It can advise on audits, keywords, content, intent. It cannot yet run live audits or apply fixes."
        />
      </div>

      <div className="flex-1 overflow-y-auto px-8 sm:px-12 max-w-4xl w-full">
        {messages.length === 0 && (
          <div>
            <p className="font-hand text-clay text-[16px] mb-3">~ try a starter ~</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {STARTERS.map((s, i) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="sticky-note rounded-md p-4 border-2 border-ink/80 text-left"
                  style={{ transform: `rotate(${i % 2 === 0 ? -1 : 1}deg)` }}
                >
                  <Sparkles className="w-4 h-4 text-teal-accent mb-2" />
                  <p className="font-sans text-[13.5px] text-ink leading-relaxed">{s}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-5 pb-4">
          {messages.map((m, i) => (
            <ChatBubble key={i} role={m.role} content={m.content} />
          ))}
          {loading && (
            <div className="flex items-center gap-2 font-sans text-[13px] text-ink-soft">
              <Loader2 className="w-4 h-4 animate-spin text-teal-accent" />
              Atlas is thinking...
            </div>
          )}
          {error && (
            <div className="font-sans text-[13px] text-sunset">{error}</div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <div className="px-8 sm:px-12 pb-8 pt-3 max-w-4xl w-full border-t-2 border-dashed border-ink/15">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex gap-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Atlas anything about SEO..."
            className="flex-1 px-4 py-3 rounded-lg bg-paper-50 border-2 border-ink/80 outline-none text-[14px] font-sans focus:ring-2 focus:ring-teal-accent/30"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="btn-led inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 font-hand text-[18px] shadow-[3px_3px_0_0_rgba(44,36,23,0.85)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" /> send
          </button>
        </form>
      </div>
    </div>
  );
}

function ChatBubble({ role, content }: { role: "user" | "assistant"; content: string }) {
  if (role === "user") {
    return (
      <div className="flex gap-3 justify-end">
        <div className="max-w-[80%] bg-paper-200/80 border-2 border-ink/80 rounded-lg p-4 shadow-[2px_2px_0_0_rgba(44,36,23,0.45)]">
          <p className="font-sans text-[14px] text-ink leading-relaxed whitespace-pre-wrap">
            {content}
          </p>
        </div>
        <span className="w-9 h-9 shrink-0 rounded-full bg-paper-50 border-2 border-ink/85 flex items-center justify-center">
          <UserIcon className="w-4 h-4 text-ink" strokeWidth={2} />
        </span>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <span className="w-9 h-9 shrink-0 rounded-full bg-teal-accent/15 border-2 border-ink/85 flex items-center justify-center">
        <Bot className="w-4 h-4 text-teal-dark" strokeWidth={2} />
      </span>
      <div className="max-w-[80%] sticky-note rounded-lg p-4 border-2 border-ink/80">
        <div className="ai-prose" dangerouslySetInnerHTML={{ __html: mdToHtml(content) }} />
      </div>
    </div>
  );
}
