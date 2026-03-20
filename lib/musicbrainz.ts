export interface ArtistInfo {
  mbid: string;
  name: string;
  type: string;
  genres: string[];
  imageUrl?: string;
}

interface CacheEntry {
  data: ArtistInfo | null;
  expires: number;
}

const cache = new Map<string, CacheEntry>();
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const RATE_LIMIT_MS = 1100; // MusicBrainz asks for max 1 req/sec
let lastRequestTime = 0;

const MB_HEADERS = {
  "User-Agent": "concerts-redeye/1.0 (greg@redeye.dev)",
  Accept: "application/json",
};

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const wait = RATE_LIMIT_MS - (now - lastRequestTime);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestTime = Date.now();
  return fetch(url, { headers: MB_HEADERS });
}

/**
 * Look up an artist on MusicBrainz by name.
 * Returns null if not found or on any error.
 * Results are cached in-memory for 24h.
 */
export async function lookupArtist(name: string): Promise<ArtistInfo | null> {
  const key = name.toLowerCase().trim();

  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.data;

  try {
    const url = `https://musicbrainz.org/ws/2/artist/?query=artist:${encodeURIComponent(name)}&fmt=json&limit=1`;
    const res = await rateLimitedFetch(url);
    if (!res.ok) {
      cache.set(key, { data: null, expires: Date.now() + TTL_MS });
      return null;
    }

    const json = await res.json();
    const artists: MBArtist[] = json.artists ?? [];
    if (artists.length === 0) {
      cache.set(key, { data: null, expires: Date.now() + TTL_MS });
      return null;
    }

    const artist = artists[0];
    const genres = (artist.tags ?? [])
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map((t) => t.name);

    const info: ArtistInfo = {
      mbid: artist.id,
      name: artist.name,
      type: artist.type ?? "Unknown",
      genres,
      imageUrl: undefined, // CAA doesn't serve artist images; omit
    };

    cache.set(key, { data: info, expires: Date.now() + TTL_MS });
    return info;
  } catch {
    cache.set(key, { data: null, expires: Date.now() + TTL_MS });
    return null;
  }
}

interface MBArtist {
  id: string;
  name: string;
  type?: string;
  tags?: { name: string; count: number }[];
}
