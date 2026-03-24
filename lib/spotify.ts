interface CacheEntry {
  data: string | null;
  expires: number;
}

const cache = new Map<string, CacheEntry>();
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

let accessToken: string | null = null;
let tokenExpires = 0;

async function getAccessToken(): Promise<string | null> {
  if (accessToken && tokenExpires > Date.now() + 60_000) return accessToken;

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!res.ok) return null;

    const json = (await res.json()) as { access_token: string; expires_in: number };
    accessToken = json.access_token;
    tokenExpires = Date.now() + json.expires_in * 1000;
    return accessToken;
  } catch {
    return null;
  }
}

/**
 * Search Spotify for an artist by name, return the largest available image URL.
 * Returns null if not found or on any error.
 * Results are cached in-memory for 24h.
 */
export async function getArtistImage(artistName: string): Promise<string | null> {
  const key = artistName.toLowerCase().trim();

  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.data;

  try {
    const token = await getAccessToken();
    if (!token) {
      cache.set(key, { data: null, expires: Date.now() + TTL_MS });
      return null;
    }

    const url = `https://api.spotify.com/v1/search?type=artist&limit=1&q=${encodeURIComponent(artistName)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      cache.set(key, { data: null, expires: Date.now() + TTL_MS });
      return null;
    }

    const json = await res.json() as SpotifySearchResponse;
    const artists = json.artists?.items ?? [];
    if (artists.length === 0) {
      cache.set(key, { data: null, expires: Date.now() + TTL_MS });
      return null;
    }

    const images = artists[0].images ?? [];
    if (images.length === 0) {
      cache.set(key, { data: null, expires: Date.now() + TTL_MS });
      return null;
    }

    // Sort by area descending, pick the largest
    const sorted = [...images].sort(
      (a, b) => (b.width ?? 0) * (b.height ?? 0) - (a.width ?? 0) * (a.height ?? 0)
    );
    const imageUrl = sorted[0].url;

    cache.set(key, { data: imageUrl, expires: Date.now() + TTL_MS });
    return imageUrl;
  } catch {
    cache.set(key, { data: null, expires: Date.now() + TTL_MS });
    return null;
  }
}

interface SpotifyImage {
  url: string;
  width?: number;
  height?: number;
}

interface SpotifyArtist {
  name: string;
  images: SpotifyImage[];
}

interface SpotifySearchResponse {
  artists?: {
    items: SpotifyArtist[];
  };
}
