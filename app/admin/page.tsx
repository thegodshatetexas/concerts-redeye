import { fetchConcerts } from "@/lib/ical";
import { classifyConcerts } from "@/lib/classifier";
import { getDecisions } from "@/lib/decisions";
import { format } from "date-fns";
import { AdminCard } from "./AdminCard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  let pendingEvents: ReturnType<typeof classifyConcerts> = [];
  let error: string | null = null;

  try {
    const concerts = await fetchConcerts();
    const classified = classifyConcerts(concerts);
    const decisions = getDecisions();

    pendingEvents = classified.filter(
      (c) => c.classification === "pending" && !decisions[c.uid]
    );
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load events.";
  }

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            🎛️ Admin Review
          </h1>
          <p className="mt-2 text-sm text-white/50">
            Events the classifier isn&apos;t sure about — you decide.
          </p>
        </header>

        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-400">
            <strong>Error:</strong> {error}
          </div>
        ) : pendingEvents.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-10 text-center">
            <p className="text-lg font-medium text-white">All caught up! ✅</p>
            <p className="mt-1 text-sm text-white/40">
              No pending events need review right now.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingEvents.map((concert) => (
              <AdminCard key={concert.uid} concert={concert} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
