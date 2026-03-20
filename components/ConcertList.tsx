"use client";

import { useState, useCallback } from "react";
import { type EnrichedConcert } from "@/app/page";
import { ConcertCard } from "@/components/ConcertCard";
import { SearchFilter } from "@/components/SearchFilter";

interface ConcertListProps {
  concerts: EnrichedConcert[];
}

type Tab = "upcoming" | "past";

function matchesQuery(concert: EnrichedConcert, q: string): boolean {
  if (!q) return true;
  const lower = q.toLowerCase();
  return (
    concert.title.toLowerCase().includes(lower) ||
    (concert.location ?? "").toLowerCase().includes(lower)
  );
}

export function ConcertList({ concerts }: ConcertListProps) {
  const [tab, setTab] = useState<Tab>("upcoming");
  const [query, setQuery] = useState("");
  const handleQueryChange = useCallback((v: string) => setQuery(v), []);

  const now = new Date();
  const upcoming = concerts.filter((c) => c.startDate >= now);
  const past = concerts
    .filter((c) => c.startDate < now)
    .sort((a, b) => b.startDate.getTime() - a.startDate.getTime()); // newest first

  const base = tab === "upcoming" ? upcoming : past;
  const active = base.filter((c) => matchesQuery(c, query));

  return (
    <div>
      {/* Tab bar */}
      <div className="mb-4 flex gap-1 rounded-xl bg-white/5 p-1">
        {(["upcoming", "past"] as Tab[]).map((t) => {
          const count = t === "upcoming" ? upcoming.length : past.length;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-red-500 text-white shadow"
                  : "text-white/50 hover:text-white/80"
              }`}
            >
              <span className="capitalize">{t}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  tab === t ? "bg-red-400/40" : "bg-white/10"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <SearchFilter value={query} onChange={handleQueryChange} />

      {/* Concert cards */}
      {active.length === 0 ? (
        <div className="rounded-xl border border-white/10 py-16 text-center text-white/40">
          <p className="text-4xl mb-3">🎸</p>
          <p className="text-sm">
            {query
              ? "No concerts match your search."
              : tab === "upcoming"
              ? "No upcoming concerts. Time to buy tickets!"
              : "No past concerts on record."}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {active.map((concert) => (
            <li key={concert.uid}>
              <ConcertCard concert={concert} past={tab === "past"} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
