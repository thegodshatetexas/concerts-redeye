import { fetchConcerts } from "@/lib/ical";
import { classifyConcerts } from "@/lib/classifier";
import { getDecisions } from "@/lib/decisions";
import { ConcertList } from "@/components/ConcertList";
import { type Concert } from "@/lib/ical";

export const revalidate = 3600; // revalidate every hour

export default async function HomePage() {
  let concerts: Concert[] = [];
  let error: string | null = null;

  try {
    const allConcerts = await fetchConcerts();
    const classified = classifyConcerts(allConcerts);
    const decisions = getDecisions();

    // Show events that are auto-classified as concerts, or manually confirmed
    concerts = classified.filter((c) => {
      const adminDecision = decisions[c.uid];
      if (adminDecision === "concert") return true;
      if (adminDecision === "not_concert") return false;
      return c.classification === "concert";
    });
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
