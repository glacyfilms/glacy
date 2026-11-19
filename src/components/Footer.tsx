"use client";

import Magnetic from "./Magnetic";
import { LINKS } from "./Nav";
import { InstagramIcon, YouTubeIcon } from "./Social";
import { CHANNEL_URL, INSTAGRAM_URL } from "@/lib/youtube";

export default function Footer() {
  const toTop = () => (window.glacyScroll ? window.glacyScroll.scrollTo(0, { duration: 2 }) : window.scrollTo({ top: 0, behavior: "smooth" }));

  return (
    <footer id="outro" className="relative overflow-hidden border-t border-line pt-24 md:pt-32">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-ice-deep/10 blur-[140px]" />
      <div className="relative mx-auto max-w-[3200px] px-5 md:px-[clamp(40px,3.5vw,120px)]">
        <div className="grid gap-14 md:grid-cols-12">
          <div className="md:col-span-7">
            <p className="eyebrow mb-6" data-reveal>GLACY</p>
            <h2 data-split className="font-display text-[clamp(44px,6.5vw,128px)] font-bold uppercase leading-[0.88] tracking-[-0.055em]">
              Thank you for being <span className="ice-text">here.</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-8 md:col-span-4 md:col-start-9 md:self-end" data-reveal="stagger">
            <nav aria-label="Footer">
              <p className="eyebrow mb-4 !text-faint">Navigate</p>
              <ul className="space-y-2">
                {LINKS.map((l) => (
                  <li key={l.href}><a href={l.href} className="text-ink/80 transition-colors hover:text-ice">{l.label}</a></li>
                ))}
              </ul>
            </nav>
            <div>
              <p className="eyebrow mb-4 !text-faint">Social</p>
              <ul className="space-y-2">
                <li><a href={CHANNEL_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-ink/80 transition-colors hover:text-ice"><YouTubeIcon className="h-4 w-4" />YouTube</a></li>
                <li><a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-ink/80 transition-colors hover:text-ice"><InstagramIcon className="h-4 w-4" />Instagram</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-20 flex items-center justify-between gap-6 border-t border-line py-8 md:mt-28">
          <p className="text-sm text-faint">© {new Date().getFullYear()} GLACY. Made with too many timeline layers.</p>
          <Magnetic strength={0.5}>
            <button
              onClick={toTop}
              className="group grid h-16 w-16 place-items-center rounded-full border border-line transition-colors duration-500 hover:border-ink hover:bg-ink hover:text-bg"
              aria-label="Back to top"
            >
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none" className="transition-transform duration-500 ease-out-expo group-hover:-translate-y-1" aria-hidden>
                <path d="M7 13V1m0 0L2 6m5-5 5 5" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          </Magnetic>
        </div>
      </div>

      {/* the final frame: the wordmark, cropped by the page edge */}
      <div className="relative select-none" aria-hidden>
        <p
          data-reveal
          className="translate-y-[18%] bg-gradient-to-b from-ink via-ink/40 to-transparent bg-clip-text text-center font-display text-[27.5vw] font-bold leading-[0.8] tracking-[-0.075em] text-transparent"
        >
          GLACY
        </p>
      </div>
    </footer>
  );
}
