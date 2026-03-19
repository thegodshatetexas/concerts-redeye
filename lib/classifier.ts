import { Concert } from "@/lib/ical";

export type Classification = "concert" | "not_concert" | "pending";

export interface ClassifiedConcert extends Concert {
  classification: Classification;
  score: number; // 0-100
}

// Venue keywords that strongly indicate a concert location
const VENUE_KEYWORDS = [
  "arena",
  "amphitheater",
  "amphitheatre",
  "club",
  "theater",
  "theatre",
  "hall",
  "ballroom",
  "pavilion",
  "stadium",
  "auditorium",
  "coliseum",
  "festival grounds",
  "bowl",
];

// Center is included only when paired with other signals — we handle it separately
const CENTER_KEYWORD = "center";

// Description keywords strongly indicating a concert
const CONCERT_DESCRIPTION_KEYWORDS = [
  "tickets",
  "ticket",
  "doors",
  "opener",
  "general admission",
  "ga",
  "setlist",
  "opening act",
  "live music",
  "show starts",
];

// Title keywords that suggest it's NOT a concert (appointment/task)
const APPOINTMENT_KEYWORDS = [
  "\\bdr\\.?\\b",
  "\\bdentist\\b",
  "\\bdoctor\\b",
  "\\bappt\\b",
  "\\bappointment\\b",
  "\\bmeeting\\b",
  "\\bcall\\b",
  "\\bflight\\b",
  "\\bpickup\\b",
  "\\boil change\\b",
  "\\bdinner reservation\\b",
];

const APPOINTMENT_RE = new RegExp(APPOINTMENT_KEYWORDS.join("|"), "i");

// Patterns that suggest a band/artist name in the title (not an appointment)
// We award the +20 if the title doesn't match appointment patterns and
// isn't clearly a plain calendar/task entry.
const TASK_TITLE_RE =
  /^(appt|appointment|dr\.?|dentist|doctor|meeting|call|flight|pickup|oil change|dinner reservation)\b/i;

function containsVenueKeyword(location: string, hasOtherSignals: boolean): boolean {
  const lower = location.toLowerCase();

  // Check strong venue keywords first
  for (const kw of VENUE_KEYWORDS) {
    if (lower.includes(kw)) return true;
  }

  // "center" only counts when paired with other signals
  if (hasOtherSignals && lower.includes(CENTER_KEYWORD)) return true;

  return false;
}

function containsConcertDescription(description: string): boolean {
  const lower = description.toLowerCase();
  return CONCERT_DESCRIPTION_KEYWORDS.some((kw) => lower.includes(kw));
}

export function classifyConcert(concert: Concert): ClassifiedConcert {
  let score = 0;

  const hasLocation = Boolean(concert.location && concert.location.trim().length > 0);
  const hasDescriptionSignal = containsConcertDescription(concert.description);
  const hasAppointmentTitle = APPOINTMENT_RE.test(concert.title);

  // Determine if we have "other signals" (for the center keyword check)
  const otherSignals = hasDescriptionSignal || !hasAppointmentTitle;

  const hasVenueKeyword = hasLocation
    ? containsVenueKeyword(concert.location, otherSignals)
    : false;

  // +10 — has any location at all
  if (hasLocation) score += 10;

  // +40 — location contains venue keywords
  if (hasVenueKeyword) score += 40;

  // +30 — description contains concert keywords
  if (hasDescriptionSignal) score += 30;

  // +20 — title looks like a band/artist (not appointment or task pattern)
  if (!TASK_TITLE_RE.test(concert.title) && !hasAppointmentTitle) score += 20;

  // -30 — title contains appointment/task keywords
  if (hasAppointmentTitle) score -= 30;

  // Cap at 0-100
  score = Math.min(100, Math.max(0, score));

  let classification: Classification;
  if (score >= 60) {
    classification = "concert";
  } else if (score < 30) {
    classification = "not_concert";
  } else {
    classification = "pending";
  }

  return { ...concert, classification, score };
}

export function classifyConcerts(concerts: Concert[]): ClassifiedConcert[] {
  return concerts.map(classifyConcert);
}
