"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Video } from "@/lib/youtube";

/* ---------- 01: camera viewfinder. Focus box follows the pointer, timecode runs. ---------- */
function Viewfinder({ video }: { video?: Video }) {
  const box = useRef<HTMLDivElement>(null);
  const [frames, setFrames] = useState(0);
  const tc = `${String(Math.floor(frames / 1440)).padStart(2, "0")}:${String(Math.floor(frames / 24) % 60).padStart(2, "0")}:${String(frames % 24).padStart(2, "0")}`;

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setFrames((f) => f + 1), 1000 / 24);
    return () => clearInterval(id);
  }, []);

  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    gsap.to(box.current, { left: e.clientX - r.left, top: e.clientY - r.top, duration: 0.6, ease: "expo.out" });
  };

  return (
    <div className="relative h-full overflow-hidden rounded-2xl bg-black" onPointerMove={move}>
      {video ? (
        <Image src={video.thumb} alt={`Frame from “${video.title}”`} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover opacity-75" />
      ) : (
        <video src="/media/field.mp4" poster="/media/field.jpg" autoPlay muted loop playsInline className="h-full w-full object-cover opacity-75" />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(transparent_0_33.2%,rgba(255,255,255,0.12)_33.3%,transparent_33.5%_66.5%,rgba(255,255,255,0.12)_66.6%,transparent_66.8%),linear-gradient(90deg,transparent_0_33.2%,rgba(255,255,255,0.12)_33.3%,transparent_33.5%_66.5%,rgba(255,255,255,0.12)_66.6%,transparent_66.8%)]" />
      {["left-4 top-4 border-l border-t", "right-4 top-4 border-r border-t", "bottom-4 left-4 border-b border-l", "bottom-4 right-4 border-b border-r"].map((c) => (
        <span key={c} className={`absolute h-8 w-8 border-white/80 ${c}`} />
      ))}
      <div ref={box} className="pointer-events-none absolute left-1/2 top-1/2 h-20 w-28 -translate-x-1/2 -translate-y-1/2 border border-ice/90 shadow-[0_0_20px_rgba(159,216,255,0.4)]">
        <span className="absolute -top-5 left-0 font-display text-[9px] tracking-[0.2em] text-ice">AF·LOCK</span>
      </div>
      <div className="absolute inset-x-8 top-7 flex justify-between font-display text-[11px] uppercase tracking-[0.2em] text-white/90">
        <span className="flex items-center gap-2"><span className="rec-dot h-2 w-2 rounded-full bg-red-500" />Rec</span>
        <span className="tabular-nums">{tc}</span>
      </div>
      <div className="absolute inset-x-8 bottom-7 flex justify-between font-display text-[10px] uppercase tracking-[0.2em] text-white/70">
        <span>4K · 24fps</span><span>ISO 800</span><span>1/50</span>
      </div>
    </div>
  );
}

/* ---------- 02: editing timeline. Playhead scrubs with the pointer. ---------- */
function Timeline({ videos }: { videos: Video[] }) {
  const [x, setX] = useState(0.38);
  const clips = videos.slice(0, 4);
  const bars = Array.from({ length: 90 }, (_, i) => 0.25 + Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.37)) * 0.75);
  const preview = clips.length ? clips[Math.min(Math.floor(x * clips.length), clips.length - 1)] : undefined;

  return (
    <div
      className="flex h-full flex-col gap-3 rounded-2xl bg-[#0a0b0d] p-3 ring-1 ring-white/5"
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setX(Math.min(Math.max((e.clientX - r.left - 48) / (r.width - 60), 0), 1));
      }}
    >
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl bg-black">
        {preview ? (
          <Image key={preview.id} src={preview.thumb} alt={`Preview of “${preview.title}”`} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
        ) : (
          <video src="/media/ribbon.mp4" poster="/media/ribbon.jpg" autoPlay muted loop playsInline className="h-full w-full object-cover" />
        )}
        <span className="absolute left-3 top-3 rounded bg-black/60 px-2 py-1 font-display text-[10px] uppercase tracking-[0.2em] text-white/80 backdrop-blur">Program</span>
      </div>
      <div className="relative space-y-1.5 font-display text-[9px] uppercase tracking-[0.15em] text-faint">
        {[
          { name: "V2", body: <div className="ml-[18%] h-full w-[30%] rounded bg-ice-deep/40 ring-1 ring-ice-deep/60" /> },
          {
            name: "V1",
            body: (
              <div className="flex h-full gap-0.5">
                {(clips.length ? clips : [undefined, undefined, undefined]).map((c, i) => (
                  <div key={i} className="relative flex-1 overflow-hidden rounded bg-ice/20 ring-1 ring-ice/40">
                    {c && <Image src={c.thumb} alt="" fill sizes="10vw" className="object-cover opacity-60" />}
                  </div>
                ))}
              </div>
            ),
          },
          {
            name: "A1",
            body: (
              <div className="flex h-full items-center gap-px rounded bg-emerald-400/10 px-1 ring-1 ring-emerald-400/30">
                {bars.map((b, i) => <span key={i} className="flex-1 rounded-full bg-emerald-300/70" style={{ height: `${b * 100}%` }} />)}
              </div>
            ),
          },
        ].map((t) => (
          <div key={t.name} className="flex h-9 items-center gap-2">
            <span className="w-9 shrink-0 text-center">{t.name}</span>
            <div className="h-full flex-1">{t.body}</div>
          </div>
        ))}
        <div className="pointer-events-none absolute -top-1 bottom-0 w-px bg-red-500" style={{ left: `calc(44px + ${x} * (100% - 44px))` }}>
          <span className="absolute -left-1.5 -top-1 h-3 w-3 rotate-45 bg-red-500" />
        </div>
      </div>
    </div>
  );
}

/* ---------- 03: real life. A pitch that draws itself, words that keep changing. ---------- */
const MOMENTS = ["Matchday", "Leg day", "Late drives", "Behind the scenes", "Sunday league", "Everyday"];
function RealLife() {
  const svg = useRef<SVGSVGElement>(null);
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % MOMENTS.length), 1600);
    const paths = svg.current?.querySelectorAll<SVGGeometryElement>("[data-draw]");
    if (!paths || matchMedia("(prefers-reduced-motion: reduce)").matches) return () => clearInterval(id);
    const ctx = gsap.context(() => {
      paths.forEach((p) => {
        const len = p.getTotalLength();
        gsap.fromTo(p, { strokeDasharray: len, strokeDashoffset: len }, {
          strokeDashoffset: 0, ease: "none",
          scrollTrigger: { trigger: svg.current, start: "top 85%", end: "bottom 40%", scrub: 1 },
        });
      });
    });
    return () => { clearInterval(id); ctx.revert(); };
  }, []);

  return (
    <div className="group relative h-full overflow-hidden rounded-2xl bg-gradient-to-br from-[#0d1a14] via-[#08100c] to-black ring-1 ring-white/5">
      <svg ref={svg} viewBox="0 0 600 400" className="absolute inset-0 h-full w-full transition-transform duration-[1.2s] ease-out-expo group-hover:scale-[1.04]" fill="none" stroke="rgba(190,255,220,0.45)" strokeWidth="1.5" aria-hidden>
        <rect data-draw x="30" y="30" width="540" height="340" />
        <path data-draw d="M300 30v340" />
        <circle data-draw cx="300" cy="200" r="58" />
        <rect data-draw x="30" y="120" width="90" height="160" />
        <rect data-draw x="480" y="120" width="90" height="160" />
        <rect data-draw x="30" y="160" width="34" height="80" />
        <rect data-draw x="536" y="160" width="34" height="80" />
        <path data-draw d="M120 160a40 40 0 0 1 0 80M480 160a40 40 0 0 0 0 80" />
        <circle cx="300" cy="200" r="3" fill="rgba(190,255,220,0.7)" />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span key={i} className="animate-[fadeUp_0.7s_cubic-bezier(0.16,1,0.3,1)] font-display text-[clamp(36px,5vw,84px)] font-bold uppercase tracking-[-0.05em]">
          {MOMENTS[i]}
        </span>
      </div>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(30px);filter:blur(8px)}to{opacity:1;transform:none;filter:none}}`}</style>
    </div>
  );
}

const CATEGORIES = [
  { n: "01", title: "Video creation", text: "My YouTube videos, vlogs and personal stuff. If it happened and it looked good, it's probably on the channel.", tags: ["YouTube", "Shorts", "Vlogs"] },
  { n: "02", title: "Video editing", text: "Edits, creative experiments and visual storytelling. Speed ramps, sound design, and cuts timed to the frame.", tags: ["Edits", "Sound design", "Color"] },
  { n: "03", title: "Real life", text: "Football, gym, everyday experiences and behind-the-scenes moments. The stuff that happens between uploads.", tags: ["Football", "Gym", "BTS"] },
];

export default function World({ videos }: { videos: Video[] }) {
  const root = useRef<HTMLElement>(null);

  // stacked cards: each one sinks back as the next slides over it
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>("[data-stack]");
      cards.slice(0, -1).forEach((card, i) => {
        gsap.to(card.firstElementChild, {
          scale: 0.94,
          filter: "brightness(0.6)",
          ease: "none",
          scrollTrigger: { trigger: cards[i + 1], start: "top 65%", end: "top 12%", scrub: true },
        });
      });
    }, root);
    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, []);

  const visuals = [<Viewfinder key="v" video={videos[0]} />, <Timeline key="t" videos={videos} />, <RealLife key="r" />];

  return (
    <section id="world" ref={root} className="relative mx-auto max-w-[3200px] px-5 py-28 md:px-[clamp(40px,3.5vw,120px)] md:py-40">
      <div className="mb-16 grid gap-6 md:mb-24 md:grid-cols-12">
        <div className="md:col-span-8">
          <p className="eyebrow mb-5" data-reveal>(03) My creative world</p>
          <h2 data-split className="font-display text-[clamp(48px,8vw,160px)] font-bold uppercase leading-[0.86] tracking-[-0.06em]">
            Three things <span className="outline-text">I&apos;m always</span> doing.
          </h2>
        </div>
      </div>

      <div className="space-y-6 md:space-y-10">
        {CATEGORIES.map((c, i) => (
          <div key={c.n} data-stack className="sticky" style={{ top: `calc(12svh + ${i * 28}px)` }}>
            <article className="grid origin-top gap-6 overflow-hidden rounded-[28px] border border-line bg-surface p-4 md:min-h-[min(72svh,760px)] md:grid-cols-12 md:gap-10 md:p-6">
              <div className="flex flex-col justify-between p-2 md:col-span-5 md:p-6">
                <div>
                  <span className="font-display text-sm text-ice">{c.n} —</span>
                  <h3 className="mt-4 font-display text-[clamp(40px,5vw,96px)] font-bold uppercase leading-[0.88] tracking-[-0.05em]">{c.title}</h3>
                </div>
                <div className="mt-8">
                  <p className="max-w-md text-lg leading-relaxed text-muted">{c.text}</p>
                  <ul className="mt-6 flex flex-wrap gap-2">
                    {c.tags.map((t) => <li key={t} className="rounded-full border border-line px-3 py-1 text-xs text-muted">{t}</li>)}
                  </ul>
                </div>
              </div>
              <div className="h-[56svh] max-h-[520px] md:col-span-7 md:h-auto md:max-h-none">{visuals[i]}</div>
            </article>
          </div>
        ))}
      </div>
    </section>
  );
}
