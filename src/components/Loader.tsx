"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

declare global {
  interface Window {
    glacyReady?: boolean;
  }
}

const BEAT = 0.62; // seconds per countdown number

/** Film-leader countdown (3·2·1 with the sweeping hand), then a hard cut into the site.
 *  Waits for fonts, skips on click/key, skipped entirely for reduced motion. Fires `glacy:ready`. */
export default function Loader() {
  const [n, setN] = useState(3);
  const [done, setDone] = useState(false);
  const sweep = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const finish = () => {
      if (window.glacyReady) return;
      window.glacyReady = true;
      setDone(true);
      window.dispatchEvent(new Event("glacy:ready"));
    };
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return finish();

    let fonts = false;
    Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 3000))]).then(() => (fonts = true));
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const t = (performance.now() - start) / 1000;
      const beat = Math.floor(t / BEAT);
      const deg = ((t % BEAT) / BEAT) * 360;
      sweep.current?.style.setProperty("--a", `${deg}deg`);
      setN(Math.max(3 - beat, 1));
      if (beat >= 3 && fonts) return finish();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const skip = () => finish();
    window.addEventListener("pointerdown", skip);
    window.addEventListener("keydown", skip);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointerdown", skip);
      window.removeEventListener("keydown", skip);
    };
  }, []);

  useEffect(() => {
    if (done) window.glacyScroll?.start();
    else window.glacyScroll?.stop();
    document.documentElement.style.overflow = done ? "" : "hidden";
  }, [done]);

  return (
    <>
      <AnimatePresence>
        {!done && (
          <motion.div
            key="leader"
            className="fixed inset-0 z-[100] grid cursor-pointer place-items-center overflow-hidden bg-[#0d0d0e] text-ink"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.04 }} // a cut, not a fade
            role="status"
            aria-label="Loading"
          >
            <div className="leader-flicker relative aspect-square w-[min(72vh,80vw)]">
              {/* sweeping hand */}
              <div
                ref={sweep}
                className="absolute inset-0 rounded-full"
                style={{ background: "conic-gradient(rgba(255,255,255,0.16) 0 var(--a, 0deg), transparent var(--a, 0deg))" }}
              />
              <div className="absolute inset-0 rounded-full border-2 border-white/70" />
              <div className="absolute inset-[9%] rounded-full border border-white/40" />
              <div className="absolute left-1/2 top-[-30vh] bottom-[-30vh] w-px bg-white/35" />
              <div className="absolute top-1/2 left-[-40vw] right-[-40vw] h-px bg-white/35" />
              <span
                key={n}
                className="absolute inset-0 grid place-items-center font-display text-[min(46vh,52vw)] font-bold leading-none tracking-[-0.06em]"
              >
                {n}
              </span>
            </div>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.85))]" />
            <p className="eyebrow absolute left-8 top-8 !text-white/60">GLACY — Seq 01</p>
            <p className="eyebrow absolute right-8 top-8 !text-white/60">Picture start</p>
            <p className="eyebrow absolute bottom-8 left-1/2 -translate-x-1/2 !text-[10px] !text-white/40">Click to skip</p>
          </motion.div>
        )}
      </AnimatePresence>
      {/* two-frame flash on the cut */}
      <AnimatePresence>
        {done && (
          <motion.div
            key="flash"
            className="pointer-events-none fixed inset-0 z-[99] bg-white"
            initial={{ opacity: 0.85 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
