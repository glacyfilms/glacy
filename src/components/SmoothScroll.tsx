"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);

declare global {
  interface Window {
    glacyScroll?: Lenis;
  }
}

/** Smooth scrolling + every attribute-driven scroll animation on the page:
 *  [data-reveal]       fade/rise in (add ="stagger" to stagger its children)
 *  [data-split]        words rise out of a line mask
 *  [data-scrub-text]   characters light up as you scroll
 *  [data-parallax=N]   moves N * 100% of its height while crossing the viewport
 */
export default function SmoothScroll() {
  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let lenis: Lenis | undefined;
    const tick = (t: number) => lenis?.raf(t * 1000);

    if (!reduce) {
      lenis = new Lenis({ duration: 1.15, anchors: { offset: 0 }, autoRaf: false });
      window.glacyScroll = lenis;
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
    }

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        const targets = el.dataset.reveal === "stagger" ? el.children : el;
        gsap.from(targets, {
          y: 48,
          opacity: 0,
          duration: 1.1,
          ease: "expo.out",
          stagger: 0.09,
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
      });

      gsap.utils.toArray<HTMLElement>("[data-split]").forEach((el) => {
        SplitText.create(el, {
          type: "lines,words",
          mask: "lines",
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.words, {
              yPercent: 115,
              duration: 1.2,
              ease: "expo.out",
              stagger: 0.06,
              scrollTrigger: { trigger: el, start: "top 85%", once: true },
            }),
        });
      });

      gsap.utils.toArray<HTMLElement>("[data-scrub-text]").forEach((el) => {
        const split = SplitText.create(el, { type: "chars,words" });
        gsap.fromTo(
          split.chars,
          { opacity: 0.14 },
          { opacity: 1, stagger: 0.05, ease: "none", scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 45%", scrub: true } }
        );
      });

      gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((el) => {
        const amount = parseFloat(el.dataset.parallax || "0.15") * 100;
        gsap.fromTo(
          el,
          { yPercent: -amount / 2 },
          { yPercent: amount / 2, ease: "none", scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true } }
        );
      });
    });

    // layout shifts once fonts/images land
    const refresh = () => ScrollTrigger.refresh();
    document.fonts?.ready.then(refresh);
    window.addEventListener("load", refresh);

    return () => {
      mm.revert();
      gsap.ticker.remove(tick);
      lenis?.destroy();
      window.removeEventListener("load", refresh);
    };
  }, []);

  return null;
}
