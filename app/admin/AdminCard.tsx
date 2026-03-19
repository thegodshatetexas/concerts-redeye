"use client";

import { ClassifiedConcert } from "@/lib/classifier";
import { format } from "date-fns";
import { Calendar, MapPin, Music } from "lucide-react";
import { useState } from "react";

interface AdminCardProps {
  concert: ClassifiedConcert;
}

export function AdminCard({ concert }: AdminCardProps) {
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState<"concert" | "not_concert" | null>(null);

  if (dismissed) return null;

  async function decide(decision: "concert" | "not_concert") {
    setLoading(decision);
    await fetch("/api/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid: concert.uid, decision }),
    });
    setDismissed(true);
  }

  const dateStr = format(concert.startDate, "EEE, MMM d yyyy");
  const isAllDay =
    concert.startDate.getHours() === 0 && concert.startDate.getMinutes() === 0;
  const timeStr = isAllDay ? null : format(concert.startDate, "h:mm a");

  return (
    <div className="rounded-xl border border-white/15 bg-white/[0.07] p-5 transition-colors hover:bg-white/10">
      <div className="flex items-start gap-4">
        {/* Date badge */}
        <div className="flex min-w-[52px] flex-col items-center rounded-lg bg-yellow-500/20 px-2 py-2 text-center">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-yellow-400">
            {format(concert.startDate, "MMM")}
          </span>
          <span className="text-2xl font-bold leading-none text-white">
            {format(concert.startDate, "d")}
          </span>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <Music className="size-3.5 shrink-0 text-yellow-400" />
              <h3 className="truncate text-base font-semibold text-white">
                {concert.title}
              </h3>
            </div>
            {/* Score badge */}
            <span className="shrink-0 rounded-full bg-yellow-500/20 px-2.5 py-0.5 text-xs font-semibold text-yellow-300">
              {concert.score} pts
            </span>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/60">
            <span className="flex items-center gap-1.5">
              <Calendar className="size-3.5 shrink-0" />
              {dateStr}
              {timeStr && <span className="text-white/40">· {timeStr}</span>}
            </span>
            {concert.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3.5 shrink-0" />
                <span className="truncate max-w-[200px]">{concert.location}</span>
              </span>
            )}
          </div>

          {concert.description && (
            <p className="mt-2 text-xs text-white/40 line-clamp-2 leading-relaxed">
              {concert.description}
            </p>
          )}

          {/* Action buttons */}
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => decide("concert")}
              disabled={loading !== null}
              className="flex items-center gap-1.5 rounded-lg bg-green-500/20 px-4 py-2 text-sm font-medium text-green-300 transition-colors hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === "concert" ? "Saving…" : "✅ Concert"}
            </button>
            <button
              onClick={() => decide("not_concert")}
              disabled={loading !== null}
              className="flex items-center gap-1.5 rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === "not_concert" ? "Saving…" : "❌ Not a concert"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
