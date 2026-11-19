"use client";

import Magnetic from "./Magnetic";
import { CHANNEL_URL, INSTAGRAM_URL, SUBSCRIBE_URL } from "@/lib/youtube";

export const YouTubeIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z" />
  </svg>
);
export const InstagramIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
    <circle cx="12" cy="12" r="4.3" />
    <circle cx="17.6" cy="6.4" r="1.1" fill="currentColor" stroke="none" />
  </svg>
);

const CARDS = [
  {
    href: CHANNEL_URL,
    name: "YouTube",
    handle: "@glacyfilms",
    text: "Edits, Shorts and vlogs. New stuff drops every week.",
    cta: "Subscribe",
    Icon: YouTubeIcon,
    glow: "rgba(255,0,51,0.35)",
    accent: "group-hover:text-[#ff0033]",
  },
  {
    href: INSTAGRAM_URL,
    name: "Instagram",
    handle: "@glacy.filmss",
    text: "Behind the scenes, stills and the stuff that doesn't make the edit.",
    cta: "Follow",
    Icon: InstagramIcon,
    glow: "rgba(214,41,118,0.35)",
    accent: "group-hover:text-[#ff4f9a]",
  },
];

export default function Social() {
  const glow = (e: React.PointerEvent<HTMLAnchorElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--gx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--gy", `${e.clientY - r.top}px`);
  };

  return (
    <section id="connect" className="relative mx-auto max-w-[3200px] px-5 py-28 md:px-[clamp(40px,3.5vw,120px)] md:py-40">
      <div className="mb-14 flex flex-col justify-between gap-8 md:mb-20 md:flex-row md:items-end">
        <div>
          <p className="eyebrow mb-5" data-reveal>(04) Connect</p>
          <h2 data-split className="font-display text-[clamp(48px,8vw,160px)] font-bold uppercase leading-[0.86] tracking-[-0.06em]">
            Come hang <span className="ice-text">out.</span>
          </h2>
        </div>
        <div data-reveal>
          <Magnetic>
            <a href={SUBSCRIBE_URL} target="_blank" rel="noopener noreferrer" className="btn btn-solid !h-16 !px-9">
              <YouTubeIcon className="h-5 w-5" />
              Subscribe on YouTube
            </a>
          </Magnetic>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 md:gap-8" data-reveal="stagger">
        {CARDS.map(({ href, name, handle, text, cta, Icon, glow: g, accent }) => (
          <a
            key={name}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onPointerMove={glow}
            className="group relative flex min-h-[340px] flex-col justify-between overflow-hidden rounded-[28px] border border-line bg-surface p-7 transition-[border-color,translate] duration-700 ease-out-expo hover:-translate-y-1.5 hover:border-white/20 md:min-h-[440px] md:p-10"
            style={{ ["--glow" as string]: g }}
          >
            <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 [background:radial-gradient(520px_circle_at_var(--gx,50%)_var(--gy,50%),var(--glow),transparent_60%)]" />
            <div className="relative flex items-start justify-between">
              <Icon className={`h-12 w-12 transition-all duration-700 ease-out-expo group-hover:-translate-y-1 group-hover:scale-110 md:h-16 md:w-16 ${accent}`} />
              <span className="grid h-14 w-14 place-items-center rounded-full border border-line transition-all duration-700 ease-out-expo group-hover:rotate-45 group-hover:border-ink group-hover:bg-ink group-hover:text-bg">
                <svg width="16" height="16" viewBox="0 0 12 12" fill="none" aria-hidden><path d="M3 9 9 3M4 3h5v5" stroke="currentColor" strokeWidth="1.3" /></svg>
              </span>
            </div>
            <div className="relative">
              <p className="eyebrow mb-3">{name}</p>
              <p className="font-display text-[clamp(36px,4.6vw,88px)] font-bold leading-none tracking-[-0.05em]">{handle}</p>
              <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
                <p className="max-w-sm text-muted">{text}</p>
                <span className="font-display text-sm font-semibold uppercase tracking-[0.16em] underline decoration-white/30 underline-offset-8 transition-colors group-hover:decoration-ink">
                  {cta} →
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
