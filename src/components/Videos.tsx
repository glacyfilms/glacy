"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Magnetic from "./Magnetic";
import Hero from "./Hero";
import Footer from "./Footer";

const Multiverse = dynamic(() => import("./Multiverse"), { ssr: false });
import { CHANNEL_URL, type Video } from "@/lib/youtube";

const ease = [0.16, 1, 0.3, 1] as const;
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const fmtDur = (s?: number) => (s == null ? null : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);

function Thumb({ video, sizes, priority }: { video: Video; sizes: string; priority?: boolean }) {
  const [src, setSrc] = useState(video.thumb);
  return (
    <Image
      src={src}
      alt=""
      fill
      sizes={sizes}
      priority={priority}
      className="object-cover"
      onError={() => setSrc(`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`)}
    />
  );
}

function Meta({ video }: { video: Video }) {
  const dur = fmtDur(video.duration);
  return (
    <p className="eyebrow !text-[10px] !tracking-[0.18em]">
      <time dateTime={video.published}>{fmtDate(video.published)}</time>
      {dur && <> · {dur}</>}
      {video.isShort && <> · Short</>}
    </p>
  );
}

/** Thumbnail that tilts toward the pointer, lifts, zooms and lights up. */
function Card({ video, onPlay, sizes, priority, className = "" }: { video: Video; onPlay: (v: Video) => void; sizes: string; priority?: boolean; className?: string }) {
  const tilt = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType !== "mouse") return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--ry", `${(x - 0.5) * 14}deg`);
    el.style.setProperty("--rx", `${(0.5 - y) * 12}deg`);
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
  };
  const reset = (e: React.PointerEvent<HTMLElement>) => {
    e.currentTarget.style.setProperty("--rx", "0deg");
    e.currentTarget.style.setProperty("--ry", "0deg");
  };
  return (
    <div className={`vcard ${className}`} onPointerMove={tilt} onPointerLeave={reset}>
      <button
        type="button"
        onClick={() => onPlay(video)}
        data-cursor="Play"
        className={`vcard__body block w-full bg-raised ${video.isShort ? "aspect-[9/16]" : "aspect-video"}`}
        aria-label={`Play “${video.title}”`}
      >
        <span className="vcard__media">
          <Thumb video={video} sizes={sizes} priority={priority} />
          <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        </span>
        <span className="vcard__glare" />
        <span className="vcard__play">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff" aria-hidden><path d="M8 5v14l11-7z" /></svg>
        </span>
      </button>
    </div>
  );
}

function SmallCard({ video, onPlay, offset }: { video: Video; onPlay: (v: Video) => void; offset: string }) {
  return (
    <article className={`w-[62vw] shrink-0 snap-start sm:w-[38vw] md:w-auto ${offset}`}>
      <Card video={video} onPlay={onPlay} sizes="(min-width: 768px) 20vw, 62vw" />
      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="line-clamp-2 font-display text-base font-medium leading-snug tracking-[-0.01em]">{video.title}</h3>
          <div className="mt-2"><Meta video={video} /></div>
        </div>
        <a
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-muted transition-colors hover:border-ink hover:text-ink"
          aria-label={`Open “${video.title}” on YouTube`}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden><path d="M3 9 9 3M4 3h5v5" stroke="currentColor" strokeWidth="1.4" /></svg>
        </a>
      </div>
    </article>
  );
}

function PlayerModal({ video, onClose }: { video: Video | null; onClose: () => void }) {
  useEffect(() => {
    if (!video) return;
    window.glacyScroll?.stop();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => {
      window.glacyScroll?.start();
      window.removeEventListener("keydown", esc);
    };
  }, [video, onClose]);

  return (
    <AnimatePresence>
      {video && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 md:p-10"
          role="dialog"
          aria-modal="true"
          aria-label={video.title}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <button className="absolute inset-0 bg-black/80 backdrop-blur-2xl" onClick={onClose} aria-label="Close player" tabIndex={-1} />
          <motion.div
            className="relative flex max-h-full w-full max-w-6xl flex-col items-center gap-6 md:flex-row md:items-end md:justify-center md:gap-12"
            initial={{ y: 60, scale: 0.94, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 40, scale: 0.97, opacity: 0 }}
            transition={{ duration: 0.8, ease }}
          >
            <div
              className={`relative overflow-hidden rounded-3xl bg-black shadow-[0_60px_120px_-40px_rgba(79,141,255,0.45)] ring-1 ring-white/10 ${
                video.isShort ? "aspect-[9/16] h-[min(78svh,820px)] max-w-full" : "aspect-video w-full md:w-[70%]"
              }`}
            >
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                title={video.title}
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
              />
            </div>
            <div className="w-full max-w-sm text-center md:text-left">
              <p className="eyebrow mb-3 text-ice">Now playing</p>
              <h3 className="font-display text-2xl font-bold leading-tight tracking-[-0.03em] md:text-4xl">{video.title}</h3>
              <div className="mt-3"><Meta video={video} /></div>
              {video.tags.length > 0 && (
                <p className="mt-4 hidden text-sm text-faint md:block">{video.tags.join("  ")}</p>
              )}
              <div className="mt-6 flex justify-center gap-3 md:justify-start">
                <a href={video.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost !h-12">
                  Open on YouTube
                </a>
                <button onClick={onClose} className="btn btn-solid !h-12" autoFocus>
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function Videos({ videos }: { videos: Video[] }) {
  const [active, setActive] = useState<Video | null>(null);
  const close = useCallback(() => setActive(null), []);
  // the 3D journey needs WebGL2 and a viewer who is fine with motion; everyone else gets the grid
  const [journey, setJourney] = useState(false);
  useEffect(() => {
    let gl = false;
    try { gl = !!document.createElement("canvas").getContext("webgl2"); } catch {}
    setJourney(gl && !matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);
  useEffect(() => { if (journey) requestAnimationFrame(() => ScrollTrigger.refresh()); }, [journey]);
  const [latest, ...rest] = videos;
  const grid = rest.slice(0, 5);
  // staggered vertical offsets give the row its floating, editorial rhythm
  const offsets = ["md:mt-0", "md:mt-24", "md:mt-10", "md:mt-32", "md:mt-4"];

  if (journey && latest)
    return (
      <>
        <section id="top" aria-label="GLACY — latest releases" className="relative">
          <Multiverse videos={videos.slice(0, 10)} onPlay={setActive} />
        </section>
        <PlayerModal video={active} onClose={close} />
      </>
    );

  return (
    <>
    <Hero videos={videos} />
    <section id="work" className="relative mx-auto max-w-[3200px] px-5 py-28 md:px-[clamp(40px,3.5vw,120px)] md:py-40">
      <div className="mb-14 flex flex-col gap-8 md:mb-20 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow mb-5" data-reveal>(01) Latest releases</p>
          <h2 data-split className="font-display text-[clamp(48px,9vw,180px)] font-bold uppercase leading-[0.85] tracking-[-0.06em]">
            Latest <span className="outline-text">releases</span>
          </h2>
        </div>
        <div data-reveal className="flex flex-col items-start gap-5 md:items-end">
          <p className="flex items-center gap-2 text-sm text-muted">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ice opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-ice" />
            </span>
            Synced live from YouTube
          </p>
          <Magnetic>
            <a href={`${CHANNEL_URL}/shorts`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
              View all videos
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden><path d="M3 9 9 3M4 3h5v5" stroke="currentColor" strokeWidth="1.4" /></svg>
            </a>
          </Magnetic>
        </div>
      </div>

      {!latest ? (
        <div data-reveal className="rounded-3xl border border-line bg-surface p-10 text-center md:p-20">
          <p className="font-display text-3xl font-bold tracking-[-0.03em]">The feed is taking a breather.</p>
          <p className="mt-3 text-muted">YouTube didn&apos;t answer just now. Everything is still on the channel.</p>
          <a href={CHANNEL_URL} target="_blank" rel="noopener noreferrer" className="btn btn-solid mt-8">Go to the channel</a>
        </div>
      ) : (
        <>
          {/* featured: newest upload */}
          <div className="grid items-center gap-10 md:grid-cols-12 md:gap-16">
            <div data-reveal className="relative md:col-span-5 lg:col-span-4 lg:col-start-2">
              <div className="absolute -inset-10 -z-10 rounded-full bg-ice-deep/20 blur-[100px]" />
              <Card video={latest} onPlay={setActive} sizes="(min-width: 768px) 35vw, 90vw" priority className="mx-auto max-w-[min(380px,42svh)]" />
            </div>
            <div data-reveal="stagger" className="md:col-span-7 lg:col-span-6">
              <p className="eyebrow mb-5 text-ice">● New drop</p>
              <h3 className="font-display text-[clamp(32px,4.2vw,80px)] font-bold leading-[0.95] tracking-[-0.045em]">{latest.title}</h3>
              <div className="mt-5"><Meta video={latest} /></div>
              {latest.tags.length > 0 && (
                <ul className="mt-6 flex flex-wrap gap-2">
                  {latest.tags.slice(0, 5).map((t) => (
                    <li key={t} className="rounded-full border border-line px-3 py-1 text-xs text-muted">{t}</li>
                  ))}
                </ul>
              )}
              <div className="mt-9 flex flex-wrap gap-3">
                <Magnetic>
                  <button onClick={() => setActive(latest)} className="btn btn-solid">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
                    Play here
                  </button>
                </Magnetic>
                <a href={latest.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">Open on YouTube</a>
              </div>
            </div>
          </div>

          {grid.length > 0 && (
            <div className="-mx-5 mt-24 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-6 md:mx-0 md:mt-36 md:grid md:grid-cols-5 md:gap-8 md:overflow-visible md:px-0 lg:gap-10 [&::-webkit-scrollbar]:hidden" data-lenis-prevent-touch>
              {grid.map((v, i) => (
                <SmallCard key={v.id} video={v} onPlay={setActive} offset={offsets[i]} />
              ))}
            </div>
          )}
        </>
      )}

      <PlayerModal video={active} onClose={close} />
    </section>
    <Footer />
    </>
  );
}
