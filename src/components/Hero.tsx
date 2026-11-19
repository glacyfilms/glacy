"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import Magnetic from "./Magnetic";
import { CHANNEL_URL, type Video } from "@/lib/youtube";

// frame count -> HH:MM:SS:FF at 24fps
const tc = (f: number) =>
  [Math.floor(f / 86400), Math.floor(f / 1440) % 60, Math.floor(f / 24) % 60, f % 24].map((x) => String(x).padStart(2, "0")).join(":");

const CUT_MS = 520; // one cut roughly every half second, like a fast edit

/** Program-monitor hero: a hard-cut montage of the real thumbnails behind a giant inverting wordmark. */
export default function Hero({ videos }: { videos: Video[] }) {
  const root = useRef<HTMLElement>(null);
  const frames = videos.slice(0, 12);
  const [cut, setCut] = useState(0);
  const [flash, setFlash] = useState(false);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const el = root.current;
    if (!el) return;
    let cutId = 0;
    let tcId = 0;
    const ctx = gsap.context(() => {
      if (!reduce) {
        gsap.set("[data-letter]", { yPercent: 105 });
        gsap.set("[data-hero-in]", { opacity: 0, y: 30 });
      }
    }, el);
    const play = () => {
      if (reduce) return;
      ctx.add(() => {
        // stepped ease: the letters land frame by frame, like clips snapping onto a track
        gsap.to("[data-letter]", { yPercent: 0, duration: 0.42, ease: "steps(7)", stagger: 0.08 });
        gsap.to("[data-hero-in]", { opacity: 1, y: 0, duration: 1.1, ease: "expo.out", stagger: 0.07, delay: 0.45 });
      });
      if (frames.length > 1) {
        let k = 0;
        cutId = window.setInterval(() => {
          k++;
          setCut(k % frames.length);
          if (k % 5 === 0) {
            setFlash(true);
            setTimeout(() => setFlash(false), 70);
          }
        }, CUT_MS);
      }
      tcId = window.setInterval(() => setFrame((f) => f + 1), 1000 / 24);
    };
    if (window.glacyReady) play();
    else window.addEventListener("glacy:ready", play, { once: true });
    return () => {
      window.removeEventListener("glacy:ready", play);
      clearInterval(cutId);
      clearInterval(tcId);
      ctx.revert();
    };
  }, [frames.length]);

  return (
    <section id="top" ref={root} className="relative h-[100svh] min-h-[640px] overflow-hidden bg-black">
      {/* montage */}
      <div className="absolute inset-0" aria-hidden>
        {frames.map((v, i) => (
          <div key={v.id} className={`absolute inset-0 ${i === cut ? "opacity-100" : "opacity-0"}`}>
            <Image src={v.thumb} alt="" fill sizes="100vw" priority={i < 2} className={`object-cover ${i === cut ? "hero-kb" : ""}`} />
          </div>
        ))}
        <div className={`absolute inset-0 bg-white transition-opacity duration-75 ${flash ? "opacity-20" : "opacity-0"}`} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/35 to-black/85" />
        <div className="hero-scan absolute inset-0" />
      </div>

      {/* monitor chrome: safe-frame corners, timecode, rec */}
      <div className="pointer-events-none absolute inset-[clamp(16px,2.5vw,40px)] top-24 bottom-[24px]" aria-hidden>
        {["left-0 top-0 border-l border-t", "right-0 top-0 border-r border-t", "left-0 bottom-0 border-l border-b", "right-0 bottom-0 border-r border-b"].map((c) => (
          <span key={c} className={`absolute h-7 w-7 border-white/60 ${c}`} />
        ))}
        <div className="absolute left-5 top-4 flex items-center gap-3 font-display text-[11px] uppercase tracking-[0.2em] text-white/80">
          <span className="rec-dot h-2 w-2 rounded-full bg-red-500" /> Program · Seq 01
        </div>
        <div className="absolute right-5 top-4 font-display text-[13px] tabular-nums tracking-[0.12em] text-white/90">{tc(frame)}</div>
        <div className="absolute right-5 bottom-4 hidden font-display text-[10px] uppercase tracking-[0.2em] text-white/60 md:block">
          Clip {String(cut + 1).padStart(2, "0")} / {String(Math.max(frames.length, 1)).padStart(2, "0")}
        </div>
      </div>

      {/* giant wordmark, inverting over the footage */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[37%] -translate-y-1/2 select-none text-center font-display text-[clamp(96px,min(24.5vw,38vh),620px)] font-bold leading-[0.8] tracking-[-0.075em] text-white mix-blend-difference">
        {"GLACY".split("").map((l, i) => (
          <span key={i} className="inline-block overflow-hidden align-top">
            <span data-letter className="inline-block">{l}</span>
          </span>
        ))}
      </div>

      <div className="absolute inset-x-0 bottom-[clamp(40px,6vh,72px)] mx-auto grid max-w-[3200px] gap-8 px-5 md:grid-cols-12 md:items-end md:px-[clamp(40px,3.5vw,120px)]">
        <div className="md:col-span-7">
          <p data-hero-in className="eyebrow mb-4 flex items-center gap-3 !text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-ice shadow-[0_0_12px_#9fd8ff]" />
            Independent creator
          </p>
          <h1 data-hero-in className="font-display text-[clamp(38px,min(5.4vw,10vh),150px)] font-bold uppercase leading-[0.88] tracking-[-0.055em]">
            Creating what <br className="hidden sm:block" />
            <span className="ice-text">I love.</span>
          </h1>
        </div>
        <div className="md:col-span-5 md:max-w-md md:justify-self-end">
          <p data-hero-in className="mb-7 text-[15px] leading-relaxed text-white/70 md:text-base">
            I make videos, cut edits until they hit right and film the moments in between. No agency, no script, just stuff I care about.
          </p>
          <div data-hero-in className="flex flex-wrap gap-3">
            <Magnetic>
              <a href="#work" className="btn btn-solid">
                Explore my work
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M7 1v12m0 0 5-5m-5 5L2 8" stroke="currentColor" strokeWidth="1.6" /></svg>
              </a>
            </Magnetic>
            <Magnetic>
              <a href={CHANNEL_URL} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
                Watch on YouTube
              </a>
            </Magnetic>
          </div>
        </div>
      </div>
    </section>
  );
}
