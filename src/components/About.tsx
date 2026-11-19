const PASSIONS = ["Video editing", "Football", "Content creation", "Vlogging", "Creative experiments"];

/** A clip in a camera-style frame: the media drifts inside its own frame on scroll. */
function Frame({ src, label, tc, className, speed }: { src: string; label: string; tc: string; className: string; speed: string }) {
  return (
    <figure className={`group absolute overflow-hidden rounded-2xl bg-surface ring-1 ring-white/10 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.9)] ${className}`}>
      <div className="absolute -inset-y-[15%] inset-x-0" data-parallax={speed}>
        <video
          src={`/media/${src}.mp4`}
          poster={`/media/${src}.jpg`}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="h-full w-full object-cover transition-transform duration-[1.4s] ease-out-expo group-hover:scale-105"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      <figcaption className="absolute inset-x-4 bottom-3 flex items-center justify-between font-display text-[10px] uppercase tracking-[0.2em] text-white/80">
        <span className="flex items-center gap-2"><span className="rec-dot h-1.5 w-1.5 rounded-full bg-red-500" />{label}</span>
        <span className="tabular-nums">{tc}</span>
      </figcaption>
    </figure>
  );
}

export default function About() {
  return (
    <section id="about" className="relative overflow-hidden py-28 md:py-40">
      <div className="mx-auto max-w-[3200px] px-5 md:px-[clamp(40px,3.5vw,120px)]">
        <p className="eyebrow mb-8" data-reveal>(02) About</p>
        <h2 data-scrub-text className="max-w-[16ch] font-display text-[clamp(48px,9.5vw,200px)] font-bold uppercase leading-[0.86] tracking-[-0.06em]">
          Not just creating. <span className="ice-text">Experiencing.</span>
        </h2>

        <div className="mt-20 grid gap-16 md:mt-32 md:grid-cols-12 md:gap-10">
          <div className="md:col-span-5 lg:col-span-4" data-reveal="stagger">
            <p className="font-display text-2xl font-medium leading-snug tracking-[-0.02em] md:text-3xl">
              I&apos;m Glacy. I make videos about whatever I&apos;m into that week, and I edit them until they feel right.
            </p>
            <p className="mt-6 leading-relaxed text-muted">
              Editing started as messing around with clips from films I love. Now it&apos;s half my personality. Timing a cut to the beat, finding the
              shot that makes the whole thing land, that&apos;s the part I live for.
            </p>
            <p className="mt-4 leading-relaxed text-muted">
              When I&apos;m not on the timeline I&apos;m probably playing football, at the gym, or filming something random that might end up in a
              vlog. Everything&apos;s content if you look at it the right way.
            </p>
            <ul className="mt-10 flex flex-wrap gap-2">
              {PASSIONS.map((p) => (
                <li key={p} className="rounded-full border border-line bg-white/[0.02] px-4 py-2 text-sm text-ink/80 transition-colors hover:border-ice/50 hover:text-ice">
                  {p}
                </li>
              ))}
            </ul>
          </div>

          {/* collage of frames, each on its own depth */}
          <div className="relative h-[560px] [perspective:1400px] md:col-span-7 md:col-start-6 md:h-[760px] lg:col-span-7 lg:col-start-6">
            <div data-parallax="-0.25" className="absolute inset-0">
              <Frame src="door" label="Scene 01" tc="00:00:12:04" speed="0.12" className="left-0 top-[6%] aspect-[4/5] w-[58%] md:w-[46%]" />
            </div>
            <div data-parallax="0.15" className="absolute inset-0">
              <Frame src="field" label="Scene 02" tc="00:01:48:19" speed="0.12" className="right-0 top-0 aspect-[3/4] w-[46%] md:w-[38%]" />
            </div>
            <div data-parallax="0.45" className="absolute inset-0">
              <Frame src="snow" label="Scene 03" tc="00:03:27:11" speed="0.12" className="bottom-[2%] right-[14%] aspect-video w-[66%] md:w-[52%]" />
            </div>
          </div>
        </div>
      </div>

      {/* passions marquee */}
      <div className="mt-28 border-y border-line py-6 md:mt-40" aria-hidden>
        <div className="marquee">
          {[0, 1].map((k) => (
            <div key={k} className="flex shrink-0 items-center">
              {PASSIONS.map((p, i) => (
                <span key={p} className={`px-8 font-display text-[clamp(40px,6vw,110px)] font-bold uppercase leading-none tracking-[-0.05em] ${i % 2 ? "outline-text" : ""}`}>
                  {p}
                  <span className="ml-16 inline-block h-[0.18em] w-[0.18em] rotate-45 bg-ice align-middle" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
