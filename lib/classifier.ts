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
  "house of blues",
  "music factory",
  "music hall",
  "the sphere",
  "live nation",
  "ticketmaster",
  "stubb",
  "stubb's",
  "red rocks",
  "fillmore",
  "palladium",
  "paramount",
  "ryman",
  "toyota center",
  "american airlines center",
  "dos equis pavilion",
  "at&t center",
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

// Patterns that suggest the title IS a concert/show (opt-in positive signals)
const CONCERT_TITLE_RE =
  /\b(tour|live|show|concert|festival|fest|presents|opening|headline|headlining|unplugged|acoustic set|in concert|on tour|ticket|tickets)\b/i;

// Patterns that suggest a plain calendar entry, trip, errand, or life event
const TASK_TITLE_RE =
  /^(appt|appointment|dr\.?|dentist|doctor|meeting|call|flight|pickup|oil change|dinner reservation)\b/i;

// Life event / non-concert patterns — things that score too high without this
const LIFE_EVENT_RE =
  /\b(birthday|bday|graduation|grad|wedding|anniversary|vacation|trip|camping|visit|party|surgery|physical|therapy|haircut|hair cut|hair at|grooming|reservation|conference|renewal|payment|order|pick up|arriving|off work|in office|in san|traveling|travel|✈️|stay:|boil|sick)\b/i;

function containsVenueKeyword(location: string, hasOtherSignals: boolean): boolean {
  // Normalize multi-line addresses (iCloud embeds full addresses with \n)
  const lower = location.toLowerCase().replace(/\\n/g, " ").replace(/\n/g, " ");

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
  const hasDescriptionSignal = containsConcertDescription(concert.description ?? "");
  const hasAppointmentTitle = APPOINTMENT_RE.test(concert.title);
  const hasConcertTitle = CONCERT_TITLE_RE.test(concert.title);
  const hasLifeEventTitle = LIFE_EVENT_RE.test(concert.title);

  // Determine if we have "other signals" (for the center keyword check)
  // A bare band name (no appointment/life event flags) counts as a weak positive signal
  const otherSignals = hasDescriptionSignal || hasConcertTitle || (!hasAppointmentTitle && !hasLifeEventTitle);

  const hasVenueKeyword = hasLocation
    ? containsVenueKeyword(concert.location ?? "", otherSignals)
    : false;

  // +10 — has any location at all (small signal only)
  if (hasLocation) score += 10;

  // +40 — location contains venue keywords (strong signal)
  if (hasVenueKeyword) score += 40;

  // +30 — description contains concert keywords
  if (hasDescriptionSignal) score += 30;

  // +20 — title explicitly contains concert/show/tour language (opt-in, not opt-out)
  if (hasConcertTitle) score += 20;

  // -30 — title contains appointment/task keywords
  if (hasAppointmentTitle) score -= 30;

  // -20 — title looks like a life event (birthday, trip, vacation, wedding, etc.)
  if (hasLifeEventTitle) score -= 20;

  // Cap at 0-100
  score = Math.min(100, Math.max(0, score));

  let classification: Classification;
  if (score >= 60) {
    classification = "concert";
  } else if (score < 10) {
    // Only auto-hide if there are truly zero positive signals
    classification = "not_concert";
  } else {
    classification = "pending";
  }

  return { ...concert, classification, score };
}

export function classifyConcerts(concerts: Concert[]): ClassifiedConcert[] {
  return concerts.map(classifyConcert);
}
