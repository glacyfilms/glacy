"use client";

import Magnetic from "./Magnetic";
import { LINKS } from "./Nav";
import { CHANNEL_URL, INSTAGRAM_URL } from "@/lib/youtube";

const YouTubeIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z" />
  </svg>
);
const InstagramIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
    <circle cx="12" cy="12" r="4.3" />
    <circle cx="17.6" cy="6.4" r="1.1" fill="currentColor" stroke="none" />
  </svg>
);

/** Fallback-only footer (no WebGL / reduced motion): socials, about, thanks. */
export default function Footer() {
  const toTop = () => (window.glacyScroll ? window.glacyScroll.scrollTo(0, { duration: 2 }) : window.scrollTo({ top: 0, behavior: "smooth" }));

  return (
    <footer id="connect" className="relative overflow-hidden border-t border-line pt-24 md:pt-32">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-ice-deep/10 blur-[140px]" />
      <div className="relative mx-auto max-w-[3200px] px-5 md:px-[clamp(40px,3.5vw,120px)]">
        <div className="grid gap-14 md:grid-cols-12">
          <div className="md:col-span-7">
            <p id="about" className="mb-6 max-w-xl text-muted" data-reveal>
              I&apos;m Glacy. I make videos about whatever I&apos;m into, edit them until they feel right, and play football when I&apos;m not on the timeline.
            </p>
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
