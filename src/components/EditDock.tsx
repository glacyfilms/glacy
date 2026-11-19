"use client";

import { useEffect, useRef, useState } from "react";

// sections as clips on V1, coloured like NLE clip labels
const CLIPS = [
  { id: "top", label: "Intro", color: "#5b7cfa" },
  { id: "work", label: "Latest releases", color: "#e05a7a" },
  { id: "about", label: "About", color: "#9b6bff" },
  { id: "world", label: "Creative world", color: "#e0a84f" },
  { id: "connect", label: "Connect", color: "#3fc1a5" },
  { id: "outro", label: "Outro", color: "#8a8f98" },
];
const BARS = Array.from({ length: 160 }, (_, i) => 0.2 + Math.abs(Math.sin(i * 1.3) * Math.cos(i * 0.21)) * 0.8);
const LABEL_W = 56; // track-name column

// 1px of scroll = 1 frame at 24fps
export const toTimecode = (px: number) => {
  const f = Math.max(0, Math.round(px));
  return [Math.floor(f / 86400), Math.floor(f / 1440) % 60, Math.floor(f / 24) % 60, f % 24].map((x) => String(x).padStart(2, "0")).join(":");
};

/** The page as an edit: a docked timeline whose playhead is the scroll position. Desktop only. */
export default function EditDock() {
  const [spans, setSpans] = useState<{ start: number; end: number }[]>([]);
  const [active, setActive] = useState(0);
  const [shown, setShown] = useState(false);
  const head = useRef<HTMLDivElement>(null);
  const time = useRef<HTMLSpanElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const spansRef = useRef(spans);
  spansRef.current = spans;

  useEffect(() => {
    const total = () => Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    const measure = () => {
      const t = total();
      const starts = CLIPS.map((c) => {
        const el = document.getElementById(c.id);
        return el ? Math.min((el.getBoundingClientRect().top + window.scrollY) / t, 1) : 0;
      });
      setSpans(starts.map((s, i) => ({ start: s, end: i < starts.length - 1 ? starts[i + 1] : 1 })));
    };
    const onScroll = () => {
      const p = window.scrollY / total();
      head.current?.style.setProperty("--p", String(Math.min(Math.max(p, 0), 1)));
      if (time.current) time.current.textContent = toTimecode(window.scrollY);
      const i = spansRef.current.findIndex((s) => p >= s.start - 1e-4 && p < s.end);
      if (i >= 0) setActive(i);
    };
    measure();
    onScroll();
    const ro = new ResizeObserver(() => { measure(); onScroll(); });
    ro.observe(document.body);
    window.addEventListener("scroll", onScroll, { passive: true });
    const ready = () => setShown(true);
    if (window.glacyReady) ready();
    else window.addEventListener("glacy:ready", ready, { once: true });
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("glacy:ready", ready);
    };
  }, []);

  const scrollToFrac = (f: number, immediate = false) => {
    const y = f * Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    if (window.glacyScroll) window.glacyScroll.scrollTo(y, immediate ? { immediate: true } : { duration: 1.4 });
    else window.scrollTo({ top: y, behavior: immediate ? "auto" : "smooth" });
  };

  // drag anywhere on the tracks to scrub the page
  const scrub = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = track.current!.getBoundingClientRect();
    const f = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1);
    scrollToFrac(f, true);
  };

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-[45] hidden border-t border-white/10 bg-[#0b0c0e]/90 backdrop-blur-xl transition-transform duration-700 ease-out-expo lg:block ${
        shown ? "translate-y-0" : "translate-y-full"
      }`}
      style={{ height: "var(--dock)" }}
      role="navigation"
      aria-label="Page timeline"
    >
      <div className="flex h-7 items-center justify-between border-b border-white/5 px-4 font-display text-[10px] uppercase tracking-[0.18em] text-white/50">
        <span className="flex items-center gap-3">
          <span className="text-white/80">Seq 01 · GLACY</span>
          <span>{CLIPS[active]?.label}</span>
        </span>
        <span ref={time} className="text-[12px] tabular-nums tracking-[0.1em] text-red-400">00:00:00:00</span>
      </div>

      <div className="relative flex" style={{ height: "calc(var(--dock) - 28px)" }}>
        <div className="flex shrink-0 flex-col justify-center gap-1.5 font-display text-[10px] text-white/45" style={{ width: LABEL_W }}>
          <span className="pl-4">V1</span>
          <span className="pl-4">A1</span>
        </div>

        <div
          ref={track}
          className="relative flex-1 cursor-ew-resize touch-none select-none pr-4"
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); scrub(e); }}
          onPointerMove={(e) => e.buttons === 1 && scrub(e)}
        >
          <div className="flex h-full flex-col justify-center gap-1.5">
            {/* V1: one clip per section */}
            <div className="relative h-[30px]">
              {spans.map((s, i) => (
                <button
                  key={CLIPS[i].id}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => scrollToFrac(s.start + 1e-4)}
                  className={`absolute top-0 h-full overflow-hidden rounded-[4px] border px-2 text-left font-display text-[10px] font-medium uppercase tracking-[0.12em] transition-[filter,opacity] duration-300 hover:brightness-125 ${
                    i === active ? "opacity-100" : "opacity-60"
                  }`}
                  style={{
                    left: `calc(${s.start * 100}% + 1px)`,
                    width: `calc(${(s.end - s.start) * 100}% - 2px)`,
                    background: `${CLIPS[i].color}${i === active ? "55" : "33"}`,
                    borderColor: `${CLIPS[i].color}${i === active ? "cc" : "66"}`,
                    color: "#fff",
                  }}
                  aria-label={`Jump to ${CLIPS[i].label}`}
                  aria-current={i === active}
                >
                  <span className="block truncate leading-[28px]">{CLIPS[i].label}</span>
                </button>
              ))}
            </div>
            {/* A1: waveform */}
            <div className="flex h-[22px] items-center gap-px overflow-hidden rounded-[4px] border border-emerald-400/25 bg-emerald-400/10 px-1">
              {BARS.map((b, i) => (
                <span key={i} className="flex-1 rounded-full bg-emerald-300/60" style={{ height: `${b * 100}%` }} />
              ))}
            </div>
          </div>

          {/* playhead */}
          <div
            ref={head}
            className="pointer-events-none absolute -top-1 bottom-0 w-px bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]"
            style={{ left: "calc(var(--p, 0) * (100% - 16px))" }}
          >
            <span className="absolute -left-[5px] -top-0.5 h-0 w-0 border-x-[5px] border-t-[7px] border-x-transparent border-t-red-500" />
          </div>
        </div>
      </div>
    </div>
  );
}
