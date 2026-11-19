export const CHANNEL_ID = "UCFjJn7pQZ0ZSzKw4oZN4A8A";
export const CHANNEL_URL = "https://www.youtube.com/@glacyfilms";
export const SUBSCRIBE_URL = `${CHANNEL_URL}?sub_confirmation=1`;
export const INSTAGRAM_URL = "https://www.instagram.com/glacy.filmss/";

export type Video = {
  id: string;
  title: string;
  tags: string[];
  published: string;
  url: string;
  thumb: string;
  isShort: boolean;
  duration?: number; // seconds, only with YOUTUBE_API_KEY
};

const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const pick = (xml: string, re: RegExp) => decode(xml.match(re)?.[1] ?? "");

export function parseFeed(xml: string): Video[] {
  return xml
    .split("<entry>")
    .slice(1)
    .map((e) => {
      const id = pick(e, /<yt:videoId>([^<]+)<\/yt:videoId>/);
      const raw = pick(e, /<title>([^<]*)<\/title>/).trim();
      const url = pick(e, /<link rel="alternate" href="([^"]+)"/) || `https://www.youtube.com/watch?v=${id}`;
      const isShort = url.includes("/shorts/");
      const tags = raw.match(/#[\p{L}\p{N}_]+/gu) ?? [];
      const title = raw.replace(/#[\p{L}\p{N}_]+/gu, "").replace(/\s+/g, " ").trim() || raw;
      return {
        id,
        title,
        tags,
        published: pick(e, /<published>([^<]+)<\/published>/),
        url,
        isShort,
        // oar2 = the vertical-friendly frame YouTube makes for Shorts
        thumb: `https://i.ytimg.com/vi/${id}/${isShort ? "oar2" : "hqdefault"}.jpg`,
      };
    })
    .filter((v) => v.id);
}

const isoToSeconds = (iso: string) => {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  return m ? +(m[1] ?? 0) * 3600 + +(m[2] ?? 0) * 60 + +(m[3] ?? 0) : undefined;
};

async function withDurations(videos: Video[]): Promise<Video[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key || !videos.length) return videos;
  try {
    const ids = videos.map((v) => v.id).join(",");
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ids}&key=${key}`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return videos;
    const data: { items?: { id: string; contentDetails: { duration: string } }[] } = await res.json();
    const map = new Map(data.items?.map((i) => [i.id, isoToSeconds(i.contentDetails.duration)]));
    return videos.map((v) => ({ ...v, duration: map.get(v.id) }));
  } catch {
    return videos;
  }
}

/** Latest uploads from the public channel feed. Re-fetched every 30 min (ISR), so new uploads appear automatically. */
export async function getLatestVideos(): Promise<Video[]> {
  try {
    const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`, {
      next: { revalidate: 1800 },
    });
    if (!res.ok) return [];
    return withDurations(parseFeed(await res.text()));
  } catch {
    return [];
  }
}
