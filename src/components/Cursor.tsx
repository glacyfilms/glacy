"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

/** Dot + trailing ring. Grows over links/buttons; shows a label over [data-cursor="Label"]. Fine pointers only. */
export default function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState("");
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const mq = matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)");
    setEnabled(mq.matches);
  }, []);

  useEffect(() => {
    if (!enabled || !dot.current || !ring.current) return;
    document.documentElement.classList.add("has-cursor");
    const dx = gsap.quickTo(dot.current, "x", { duration: 0.12, ease: "power3" });
    const dy = gsap.quickTo(dot.current, "y", { duration: 0.12, ease: "power3" });
    const rx = gsap.quickTo(ring.current, "x", { duration: 0.5, ease: "power3" });
    const ry = gsap.quickTo(ring.current, "y", { duration: 0.5, ease: "power3" });
    const r = ring.current;

    const move = (e: PointerEvent) => {
      dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
      gsap.to([dot.current, r], { opacity: 1, duration: 0.3, overwrite: "auto" });
    };
    const over = (e: Event) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>("a, button, [data-cursor]");
      const text = t?.dataset.cursor ?? "";
      setLabel(text);
      gsap.to(r, { scale: text ? 2.6 : t ? 1.7 : 1, duration: 0.5, ease: "expo.out" });
      r.classList.toggle("bg-ice", !!text);
      r.classList.toggle("mix-blend-difference", !text); // label needs real colours to stay readable
    };
    const leave = () => gsap.to([dot.current, r], { opacity: 0, duration: 0.3 });

    window.addEventListener("pointermove", move);
    document.addEventListener("pointerover", over);
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerover", over);
      document.documentElement.removeEventListener("pointerleave", leave);
      document.documentElement.classList.remove("has-cursor");
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <>
      <div ref={dot} className="pointer-events-none fixed left-0 top-0 z-[90] -ml-[3px] -mt-[3px] h-1.5 w-1.5 rounded-full bg-ink opacity-0 mix-blend-difference" aria-hidden />
      <div
        ref={ring}
        className="pointer-events-none fixed left-0 top-0 z-[89] -ml-5 -mt-5 grid h-10 w-10 place-items-center rounded-full border border-ink/40 opacity-0 mix-blend-difference transition-colors"
        aria-hidden
      >
        <span className="font-display text-[5px] font-bold uppercase tracking-[0.2em] text-bg">{label}</span>
      </div>
    </>
  );
}
