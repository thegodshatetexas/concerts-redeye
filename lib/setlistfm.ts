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
 *
 * Strategy:
 * 1. Search for the headliner's setlist by artist name + date to get the venue ID
 * 2. Query all setlists at that venue on the same date
 * 3. Return all other artists on the bill as openers
 *
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

  const headers = {
    Accept: "application/json",
    "x-api-key": apiKey,
  };

  try {
    // Step 1: find the headliner's setlist to get the venue ID
    const headlinerUrl = `https://api.setlist.fm/rest/1.0/search/setlists?artistName=${encodeURIComponent(artistName)}&date=${dateStr}`;
    const headlinerRes = await fetch(headlinerUrl, { headers });

    if (!headlinerRes.ok) {
      cache.set(key, { data: [], expires: Date.now() + TTL_MS });
      return [];
    }

    const headlinerJson = await headlinerRes.json() as SetlistFmResponse;
    const headlinerSetlist = headlinerJson.setlist?.[0];

    if (!headlinerSetlist?.venue?.id) {
      cache.set(key, { data: [], expires: Date.now() + TTL_MS });
      return [];
    }

    const venueId = headlinerSetlist.venue.id;
    const headlinerName = headlinerSetlist.artist?.name ?? artistName;

    // Step 2: get all setlists at that venue on the same date
    const venueUrl = `https://api.setlist.fm/rest/1.0/search/setlists?venueId=${venueId}&date=${dateStr}`;
    const venueRes = await fetch(venueUrl, { headers });

    if (!venueRes.ok) {
      cache.set(key, { data: [], expires: Date.now() + TTL_MS });
      return [];
    }

    const venueJson = await venueRes.json() as SetlistFmResponse;
    const allSetlists = venueJson.setlist ?? [];

    // Step 3: everyone except the headliner is an opener
    const openers = allSetlists
      .map((s) => s.artist?.name ?? "")
      .filter((name) => name && name.toLowerCase() !== headlinerName.toLowerCase());

    const result = Array.from(new Set(openers));
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

interface SetlistFmVenue {
  id?: string;
  name?: string;
}

interface SetlistFmSetlist {
  artist?: SetlistFmArtist;
  venue?: SetlistFmVenue;
}

interface SetlistFmResponse {
  setlist?: SetlistFmSetlist[];
}
