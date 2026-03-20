import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const { uid } = await params;
  const feedUrl = process.env.ICAL_FEED_URL;

  if (!feedUrl) {
    return new NextResponse("ICAL_FEED_URL not configured", { status: 500 });
  }

  let icsText: string;
  try {
    const res = await fetch(feedUrl, { next: { revalidate: 3600 } });
    if (!res.ok) {
      return new NextResponse("Failed to fetch calendar feed", { status: 502 });
    }
    icsText = await res.text();
  } catch {
    return new NextResponse("Failed to fetch calendar feed", { status: 502 });
  }

  // Split on VEVENT boundaries and find the one matching the UID
  // We reconstruct a valid minimal VCALENDAR wrapping just that event
  const decodedUid = decodeURIComponent(uid);

  // Extract all VEVENT blocks
  const veventRegex = /BEGIN:VEVENT[\s\S]*?END:VEVENT/g;
  const vevents = icsText.match(veventRegex) ?? [];

  const matched = vevents.find((block) => {
    // UID line can appear as "UID:value" or "UID;...params...:value"
    const uidMatch = block.match(/^UID[^:]*:(.+)$/m);
    return uidMatch && uidMatch[1].trim() === decodedUid;
  });

  if (!matched) {
    return new NextResponse("Event not found", { status: 404 });
  }

  // Extract VCALENDAR header lines (PRODID, VERSION, CALSCALE, X-WR-* etc.)
  const headerLines: string[] = [];
  const lines = icsText.split(/\r?\n/);
  let inEvent = false;
  for (const line of lines) {
    if (line.startsWith("BEGIN:VCALENDAR")) continue;
    if (line.startsWith("END:VCALENDAR")) continue;
    if (line.startsWith("BEGIN:VEVENT")) { inEvent = true; continue; }
    if (line.startsWith("END:VEVENT")) { inEvent = false; continue; }
    if (!inEvent) headerLines.push(line);
  }

  const icsOutput = [
    "BEGIN:VCALENDAR",
    ...headerLines.filter((l) => l.trim()),
    matched,
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(icsOutput, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="concert.ics"`,
    },
  });
}
