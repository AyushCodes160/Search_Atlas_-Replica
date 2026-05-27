"use client";

import { useRef, useState } from "react";

const PAGES = [
  {
    n: "01",
    status: "Live",
    title: "Site Audit",
    body: "Lighthouse + Llama 3.3 fix plan.",
    tilt: -3,
    tint: "bg-paper-100",
  },
  {
    n: "02",
    status: "Live",
    title: "AI Content Writer",
    body: "Six-format Llama 3.3 writer: blog, LinkedIn, ad, email, meta, product.",
    tilt: 2,
    tint: "bg-paper-100",
  },
  {
    n: "03",
    status: "Live",
    title: "Keyword Research",
    body: "Long-tail ideas from Google Autocomplete, clustered by Llama.",
    tilt: -2,
    tint: "bg-paper-100",
  },
  {
    n: "04",
    status: "Soon",
    title: "OTTO-lite",
    body: "One <script> tag that proposes one-click on-page fixes.",
    tilt: 3,
    tint: "bg-paper-100",
  },
];

export default function RoadmapCarousel() {
  const [active, setActive] = useState(0);
  const dragStart = useRef<number | null>(null);
  const dragDelta = useRef(0);
  const [dragging, setDragging] = useState(false);

  function onPointerDown(e: React.PointerEvent) {
    dragStart.current = e.clientX;
    dragDelta.current = 0;
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (dragStart.current == null) return;
    dragDelta.current = e.clientX - dragStart.current;
  }

  function onPointerUp() {
    if (Math.abs(dragDelta.current) > 60) {
      if (dragDelta.current < 0 && active < PAGES.length - 1) setActive((a) => a + 1);
      if (dragDelta.current > 0 && active > 0) setActive((a) => a - 1);
    }
    dragStart.current = null;
    dragDelta.current = 0;
    setDragging(false);
  }

  return (
    <div className="select-none">
      <div
        className={`relative h-[280px] sm:h-[320px] ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {PAGES.map((p, i) => {
          const offset = i - active;
          const isActive = i === active;
          const z = PAGES.length - Math.abs(offset);
          const translateX = offset * 36;
          const translateY = Math.abs(offset) * 10;
          const rotate = offset * 4 + (isActive ? 0 : p.tilt);
          const scale = isActive ? 1 : 0.96 - Math.abs(offset) * 0.02;
          const opacity = Math.abs(offset) > 2 ? 0 : 1;
          return (
            <div
              key={p.n}
              className={`absolute top-0 left-1/2 w-[280px] sm:w-[340px] h-full -ml-[140px] sm:-ml-[170px] sticky-note rounded-lg border-[2.5px] border-ink/85 p-6 flex flex-col transition-all duration-500 ease-out`}
              style={{
                zIndex: z,
                transform: `translate(${translateX}px, ${translateY}px) rotate(${rotate}deg) scale(${scale})`,
                opacity,
                pointerEvents: isActive ? "auto" : "none",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-hand text-teal-accent text-[22px]">{p.n}</span>
                <span className="font-hand text-[14px] uppercase tracking-wide text-clay border-2 border-ink/70 rounded-full px-2.5 py-0.5">
                  {p.status}
                </span>
              </div>
              <h3 className="font-hand text-[34px] sm:text-[38px] text-ink leading-tight mb-3">
                {p.title}
              </h3>
              <p className="font-sans text-[14px] text-ink-soft leading-relaxed flex-1">
                {p.body}
              </p>
              <div className="font-hand text-[14px] text-ink-soft mt-4">
                page {i + 1} of {PAGES.length}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-2 mt-6">
        {PAGES.map((_, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            aria-label={`Go to page ${i + 1}`}
            className={`w-3 h-3 rounded-full border-2 border-ink transition-colors ${i === active ? "bg-teal-accent" : "bg-paper-50"}`}
          />
        ))}
      </div>
      <p className="font-hand text-[15px] text-clay text-center mt-3">
        drag to flip the stack
      </p>
    </div>
  );
}
