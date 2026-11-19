"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Magnetic from "./Magnetic";
import { SUBSCRIBE_URL } from "@/lib/youtube";

export const LINKS = [
  { href: "#work", label: "Work" },
  { href: "#about", label: "About" },
  { href: "#world", label: "World" },
  { href: "#connect", label: "Connect" },
];

export default function Nav() {
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let last = 0;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 40);
      setHidden(y > last && y > 400);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (open) window.glacyScroll?.stop();
    else window.glacyScroll?.start();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-transform duration-700 ease-out-expo ${hidden && !open ? "-translate-y-full" : ""}`}
      >
        <div
          className={`mx-auto flex h-20 max-w-[3200px] items-center justify-between px-5 transition-colors duration-500 md:px-[clamp(40px,3.5vw,120px)] ${
            scrolled ? "bg-bg/60 backdrop-blur-xl" : ""
          }`}
        >
          <a href="#top" className="font-display text-lg font-bold tracking-[-0.04em]" aria-label="GLACY, back to top">
            GLACY<span className="text-ice">.</span>
          </a>

          <nav aria-label="Primary" className="hidden items-center gap-1 rounded-full border border-line bg-white/[0.03] p-1 backdrop-blur-md md:flex">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="rounded-full px-5 py-2 font-display text-[13px] font-medium text-muted transition-colors hover:bg-white/[0.07] hover:text-ink"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Magnetic>
              <a href={SUBSCRIBE_URL} target="_blank" rel="noopener noreferrer" className="btn btn-solid !h-11 !px-5 !text-[11px]">
                Subscribe
              </a>
            </Magnetic>
            <button
              onClick={() => setOpen((o) => !o)}
              className="grid h-11 w-11 place-items-center rounded-full border border-line md:hidden"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
            >
              <span className="relative block h-3 w-5">
                <span className={`absolute left-0 h-px w-5 bg-ink transition-all duration-500 ${open ? "top-1.5 rotate-45" : "top-0"}`} />
                <span className={`absolute left-0 h-px w-5 bg-ink transition-all duration-500 ${open ? "top-1.5 -rotate-45" : "top-3"}`} />
              </span>
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.nav
            id="mobile-menu"
            aria-label="Mobile"
            className="fixed inset-0 z-40 flex flex-col justify-end bg-bg/95 px-5 pb-16 backdrop-blur-xl md:hidden"
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            {LINKS.map((l, i) => (
              <motion.a
                key={l.href}
                href={l.href}
                onClick={(e) => {
                  // lenis is paused while the menu is open, so scroll by hand
                  e.preventDefault();
                  setOpen(false);
                  window.glacyScroll?.start();
                  if (window.glacyScroll) window.glacyScroll.scrollTo(l.href);
                  else document.querySelector(l.href)?.scrollIntoView();
                }}
                className="border-b border-line py-4 font-display text-5xl font-bold tracking-[-0.04em]"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.06, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              >
                <span className="mr-4 align-top text-xs text-faint">0{i + 1}</span>
                {l.label}
              </motion.a>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  );
}
