interface CacheEntry {
  data: string[];
  expires: number;
}

const cache = new Map<string, CacheEntry>();
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function setlistUrl(artistName: string): string {
  return `https://www.setlist.fm/search?query=${encodeURIComponent(artistName)}`;
}

/**
 * Look up opening acts for an artist on a given date via Setlist.fm API.
 * Returns an array of opener names (empty array if none found or on any error).
 * Results are cached in-memory for 24h.
 */
export async function getOpeningActs(
  artistName: string,
  eventDate: Date
): Promise<string[]> {
  const apiKey = process.env.SETLISTFM_API_KEY;
  if (!apiKey) return [];

  // Setlist.fm date format: DD-MM-YYYY
  const dd = String(eventDate.getDate()).padStart(2, "0");
  const mm = String(eventDate.getMonth() + 1).padStart(2, "0");
  const yyyy = eventDate.getFullYear();
  const dateStr = `${dd}-${mm}-${yyyy}`;

  const key = `${artistName.toLowerCase().trim()}:${dateStr}`;

  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.data;

  try {
    const url = `https://api.setlist.fm/rest/1.0/search/setlists?artistName=${encodeURIComponent(artistName)}&date=${dateStr}`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "x-api-key": apiKey,
      },
    });

    if (!res.ok) {
      cache.set(key, { data: [], expires: Date.now() + TTL_MS });
      return [];
    }

    const json = await res.json() as SetlistFmResponse;
    const setlists = json.setlist ?? [];

    // Collect all unique support/opening act names across matching setlists
    const openers = new Set<string>();
    for (const setlist of setlists) {
      for (const set of setlist.sets?.set ?? []) {
        if (set.encore === undefined || set.encore === 0) {
          // Support acts are typically marked with a name on the set
          if (set.name && set.name.toLowerCase() !== setlist.artist?.name?.toLowerCase()) {
            openers.add(set.name);
          }
        }
      }
    }

    const result = Array.from(openers);
    cache.set(key, { data: result, expires: Date.now() + TTL_MS });
    return result;
  } catch {
    cache.set(key, { data: [], expires: Date.now() + TTL_MS });
    return [];
  }
}

interface SetlistFmArtist {
  name?: string;
}

interface SetlistFmSet {
  name?: string;
  encore?: number;
  song?: unknown[];
}

interface SetlistFmSets {
  set: SetlistFmSet[];
}

interface SetlistFmSetlist {
  artist?: SetlistFmArtist;
  sets?: SetlistFmSets;
}

interface SetlistFmResponse {
  setlist?: SetlistFmSetlist[];
}
