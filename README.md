# GLACY — the creator site

Next.js 15 · React 19 · TypeScript · Tailwind v4 · React Three Fiber · GSAP + ScrollTrigger · Framer Motion · Lenis

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

Production:

```bash
npm run build && npm start
```

## Latest videos (no setup needed)

The "Latest releases" section reads the channel's public YouTube feed
(`youtube.com/feeds/videos.xml?channel_id=UCFjJn7pQZ0ZSzKw4oZN4A8A`) on the server.
The page re-renders every 30 minutes (`revalidate = 1800` in `src/app/page.tsx`), so new uploads show up on their own.
That only works on a host that runs the Next server, such as Vercel or `npm start`. A static export won't update.

The feed has no video lengths. To show durations, add a YouTube Data API key:

```bash
cp .env.example .env.local
# then set YOUTUBE_API_KEY=... (Google Cloud console → enable "YouTube Data API v3" → create an API key)
```

The key is only used on the server and is never sent to the browser.

## Where things live

| File | What it does |
| --- | --- |
| `src/lib/youtube.ts` | Feed fetch and parse, optional durations, channel and social URLs |
| `src/components/HeroScene.tsx` | 3D chrome wordmark, ice-dust particles, reflective floor, mouse light, post-processing |
| `src/components/Videos.tsx` | Featured release, editorial grid, tilt cards, player modal |
| `src/components/About.tsx` / `World.tsx` / `Social.tsx` / `Footer.tsx` | The remaining sections |
| `src/components/SmoothScroll.tsx` | Lenis, plus every `data-reveal` / `data-split` / `data-parallax` / `data-scrub-text` animation |
| `public/media/` | Compressed mood clips used in About, and the 3D font (`glacy-font.json`, Space Grotesk Bold, letters G L A C Y only) |

## Fallbacks

- No WebGL2: the hero shows a CSS gradient wordmark instead.
- Phones and machines with 4 or fewer CPU cores: no mirror floor, fewer particles, lower resolution.
- `prefers-reduced-motion`: no smooth scroll, no reveals, no custom cursor, and the 3D logo holds still.
- The hero canvas stops rendering once it scrolls out of view.

## Swap in your own footage

The About section uses stock cinematic loops (`public/media/door|field|snow.mp4`). Replace them with your own clips
at the same file names. Keep them around 960px wide and under about 1 MB.
