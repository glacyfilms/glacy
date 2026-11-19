"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

declare global {
  interface Window {
    glacyReady?: boolean;
  }
}

const LETTERS = "GLACY".split("");
const ease = [0.16, 1, 0.3, 1] as const;

/** Intro curtain. Counts while fonts + page load, then wipes up and fires `glacy:ready`. */
export default function Loader() {
  const [count, setCount] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const minTime = reduce ? 0 : 1500;
    const start = performance.now();
    let loaded = false;
    let raf = 0;

    const loadedP = Promise.all([
      document.fonts?.ready,
      document.readyState === "complete" ? null : new Promise((r) => window.addEventListener("load", r, { once: true })),
    ]);
    // never hang on a slow third-party asset
    Promise.race([loadedP, new Promise((r) => setTimeout(r, 4000))]).then(() => (loaded = true));

    const step = () => {
      const t = Math.min((performance.now() - start) / Math.max(minTime, 1), 1);
      const target = loaded ? t : Math.min(t, 0.9);
      setCount(Math.round(target * 100));
      if (target >= 1) {
        setDone(true);
        window.glacyReady = true;
        window.dispatchEvent(new Event("glacy:ready"));
        return;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (done) window.glacyScroll?.start();
    else window.glacyScroll?.stop();
    document.documentElement.style.overflow = done ? "" : "hidden";
  }, [done]);

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          key="loader"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-bg"
          exit={{ clipPath: "inset(0 0 100% 0)" }}
          initial={{ clipPath: "inset(0 0 0% 0)" }}
          transition={{ duration: 1.1, ease }}
          aria-live="polite"
          aria-label="Loading"
        >
          <div className="flex overflow-hidden font-display text-[clamp(56px,12vw,180px)] font-bold leading-none tracking-[-0.06em]">
            {LETTERS.map((l, i) => (
              <motion.span
                key={i}
                initial={{ y: "110%" }}
                animate={{ y: "0%" }}
                exit={{ y: "-110%" }}
                transition={{ duration: 0.9, ease, delay: 0.05 * i }}
                className="ice-text inline-block"
              >
                {l}
              </motion.span>
            ))}
          </div>
          <div className="mt-8 flex w-[min(320px,70vw)] items-center gap-4">
            <div className="h-px flex-1 overflow-hidden bg-line">
              <div className="h-full origin-left bg-ink" style={{ transform: `scaleX(${count / 100})` }} />
            </div>
            <span className="w-10 text-right font-display text-xs tabular-nums text-muted">{count}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
