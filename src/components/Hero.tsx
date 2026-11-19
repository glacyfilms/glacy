"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import Magnetic from "./Magnetic";
import { CHANNEL_URL } from "@/lib/youtube";

const HeroScene = dynamic(() => import("./HeroScene"), { ssr: false });

const hasWebGL = () => {
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
};

export default function Hero() {
  const root = useRef<HTMLElement>(null);
  const [gl, setGl] = useState<boolean | null>(null);

  useEffect(() => setGl(hasWebGL()), []);

  useEffect(() => {
    const el = root.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.set("[data-hero-in]", { opacity: 0, y: 40 });
      const play = () =>
        gsap.to("[data-hero-in]", { opacity: 1, y: 0, duration: 1.3, ease: "expo.out", stagger: 0.08, delay: 0.5 });
      if (window.glacyReady) play();
      else window.addEventListener("glacy:ready", play, { once: true });
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section id="top" ref={root} className="relative h-[100svh] min-h-[620px] overflow-hidden">
      {gl && <HeroScene />}
      {gl === false && (
        <div className="absolute inset-0 grid place-items-center pb-[18vh]" aria-hidden>
          <span className="ice-text font-display text-[22vw] font-bold leading-none tracking-[-0.07em]">GLACY</span>
        </div>
      )}

      {/* scrims keep copy readable over the reflective floor */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-bg via-bg/70 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-bg/80 to-transparent" />

      <div className="absolute inset-x-0 top-24 mx-auto hidden max-w-[3200px] justify-between px-10 md:flex">
        <span data-hero-in className="eyebrow">On YouTube since 2024</span>
        <span data-hero-in className="eyebrow">Edits · Vlogs · Real life</span>
      </div>

      <div className="absolute inset-x-0 bottom-0 mx-auto grid max-w-[3200px] gap-8 px-5 pb-10 md:grid-cols-12 md:items-end md:px-[clamp(40px,3.5vw,120px)] md:pb-14">
        <div className="md:col-span-7">
          <p data-hero-in className="eyebrow mb-4 flex items-center gap-3">
            <span className="h-1.5 w-1.5 rounded-full bg-ice shadow-[0_0_12px_#9fd8ff]" />
            Independent creator
          </p>
          <h1 data-hero-in className="font-display text-[clamp(40px,min(6.4vw,12vh),190px)] font-bold uppercase leading-[0.88] tracking-[-0.055em]">
            Creating what <br className="hidden sm:block" />
            <span className="ice-text">I love.</span>
          </h1>
        </div>
        <div className="md:col-span-5 md:justify-self-end md:max-w-md">
          <p data-hero-in className="mb-7 text-[15px] leading-relaxed text-muted md:text-base">
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

      <a
        href="#work"
        data-hero-in
        className="absolute bottom-10 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 md:flex lg:bottom-14"
        aria-label="Scroll to latest videos"
      >
        <span className="eyebrow !text-[10px]">Scroll</span>
        <span className="scroll-line relative h-14 w-px overflow-hidden bg-line" />
      </a>
    </section>
  );
}
