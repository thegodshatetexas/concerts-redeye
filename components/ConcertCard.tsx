import { type EnrichedConcert } from "@/app/page";
import { setlistUrl } from "@/lib/setlistfm";
import { format } from "date-fns";
import { Calendar, MapPin, Music, User } from "lucide-react";

interface ConcertCardProps {
  concert: EnrichedConcert;
  past?: boolean;
}

export function ConcertCard({ concert, past = false }: ConcertCardProps) {
  const dateStr = format(concert.startDate, "EEE, MMM d yyyy");
  const timeStr = format(concert.startDate, "h:mm a");
  const isAllDay =
    concert.startDate.getHours() === 0 &&
    concert.startDate.getMinutes() === 0;

  const genres = concert.artist?.genres ?? [];
  const mapsUrl = concert.location
    ? `https://maps.google.com/?q=${encodeURIComponent(concert.location)}`
    : null;
  const icalUrl = `/api/ical/${encodeURIComponent(concert.uid)}`;
  const setlist = setlistUrl(concert.title);

  return (
    <div
      className={`rounded-xl border p-5 transition-colors ${
        past
          ? "border-white/10 bg-white/5 opacity-60"
          : "border-white/15 bg-white/[0.07] hover:bg-white/10"
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Date badge */}
        <div className="flex min-w-[52px] flex-col items-center rounded-lg bg-red-500/20 px-2 py-2 text-center">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-red-400">
            {format(concert.startDate, "MMM")}
          </span>
          <span className="text-2xl font-bold leading-none text-white">
            {format(concert.startDate, "d")}
          </span>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          {/* Title row with artist photo */}
          <div className="flex items-start justify-between gap-3 mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <Music className="size-3.5 shrink-0 text-red-400" />
              <h3 className="truncate text-base font-semibold text-white">
                {concert.title}
              </h3>
            </div>

            {/* Artist photo (top-right) */}
            {concert.spotifyImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={concert.spotifyImageUrl}
                alt={`${concert.title} artist photo`}
                className="size-12 rounded-full object-cover shrink-0 border border-white/10"
              />
            ) : (
              <div className="size-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                <User className="size-5 text-white/20" />
              </div>
            )}
          </div>

          {/* Opening acts */}
          {concert.openingActs && concert.openingActs.length > 0 && (
            <p className="text-xs text-white/50 mb-1.5">
              w/ {concert.openingActs.join(", ")}
            </p>
          )}

          {/* Genre badges */}
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {genres.map((g) => (
                <span
                  key={g}
                  className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/50"
                >
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* Date / location row */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/60">
            <span className="flex items-center gap-1.5">
              <Calendar className="size-3.5 shrink-0" />
              {dateStr}
              {!isAllDay && <span className="text-white/40">· {timeStr}</span>}
            </span>

            {concert.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3.5 shrink-0" />
                {mapsUrl ? (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate max-w-[200px] hover:text-white/80 underline underline-offset-2 transition-colors"
                  >
                    {concert.location}
                  </a>
                ) : (
                  <span className="truncate max-w-[200px]">{concert.location}</span>
                )}
              </span>
            )}
          </div>

          {concert.description && (
            <p className="mt-2 text-xs text-white/40 line-clamp-2 leading-relaxed">
              {concert.description}
            </p>
          )}

          {/* Action row */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {/* Setlist.fm */}
            <a
              href={setlist}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors"
              title="Search setlists on Setlist.fm"
            >
              🎵 <span>Setlists</span>
            </a>

            {/* Add to Calendar */}
            <a
              href={icalUrl}
              className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors"
              title="Download .ics to add to your calendar"
            >
              📅 <span>Add to Calendar</span>
            </a>

            {/* Google Maps — only if we have a location */}
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors"
                title="Open venue in Google Maps"
              >
                📍 <span>Map</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
