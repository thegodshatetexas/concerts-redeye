import { fetchConcerts } from "@/lib/ical";
import { classifyConcerts } from "@/lib/classifier";
import { getDecisions } from "@/lib/decisions";
import { lookupArtist, type ArtistInfo } from "@/lib/musicbrainz";
import { getArtistImage } from "@/lib/spotify";
import { getOpeningActs } from "@/lib/setlistfm";
import { ConcertList } from "@/components/ConcertList";
import { type Concert } from "@/lib/ical";

export const revalidate = 3600; // revalidate every hour

export interface EnrichedConcert extends Concert {
  artist?: ArtistInfo;
  spotifyImageUrl?: string;
  openingActs?: string[];
}

export default async function HomePage() {
  let concerts: EnrichedConcert[] = [];
  let error: string | null = null;

  try {
    const allConcerts = await fetchConcerts();
    const classified = classifyConcerts(allConcerts);
    const decisions = getDecisions();

    // Show events that are auto-classified as concerts, or manually confirmed
    const filtered = classified.filter((c) => {
      const adminDecision = decisions[c.uid];
      if (adminDecision === "concert") return true;
      if (adminDecision === "not_concert") return false;
      return c.classification === "concert";
    });

    // Enrich with MusicBrainz, Spotify, and Setlist.fm — best-effort
    const enriched: EnrichedConcert[] = [];
    for (const concert of filtered) {
      let artist: ArtistInfo | undefined;
      let spotifyImageUrl: string | undefined;
      let openingActs: string[] | undefined;

      try {
        const info = await lookupArtist(concert.title);
        if (info) artist = info;
      } catch {
        // best-effort
      }

      try {
        const imgUrl = await getArtistImage(concert.title);
        if (imgUrl) spotifyImageUrl = imgUrl;
      } catch {
        // best-effort
      }

      try {
        const acts = await getOpeningActs(concert.title, concert.startDate);
        if (acts.length > 0) openingActs = acts;
      } catch {
        // best-effort
      }

      enriched.push({ ...concert, artist, spotifyImageUrl, openingActs });
    }

    concerts = enriched;
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load concerts.";
  }

  const total = concerts.length;
  const now = new Date();
  const upcomingCount = concerts.filter((c) => c.startDate >= now).length;

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            🎸 My Concerts
          </h1>
          {total > 0 && (
            <p className="mt-2 text-sm text-white/50">
              {upcomingCount} upcoming · {total - upcomingCount} past
            </p>
          )}
        </header>

        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-400">
            <strong>Error:</strong> {error}
          </div>
        ) : (
          <ConcertList concerts={concerts} />
        )}
      </div>
    </main>
  );
}
