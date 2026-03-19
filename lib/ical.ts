import ICAL from "ical.js";

export interface Concert {
  uid: string;
  title: string;
  startDate: Date;
  endDate: Date;
  location: string;
  description: string;
}

export async function fetchConcerts(): Promise<Concert[]> {
  const feedUrl = process.env.ICAL_FEED_URL;
  if (!feedUrl) {
    console.warn("ICAL_FEED_URL is not set — returning empty concert list.");
    return [];
  }

  const res = await fetch(feedUrl, { next: { revalidate: 3600 } });
  if (!res.ok) {
    throw new Error(`Failed to fetch iCal feed: ${res.status} ${res.statusText}`);
  }

  const icsText = await res.text();
  const jcal = ICAL.parse(icsText);
  const comp = new ICAL.Component(jcal);
  const vevents = comp.getAllSubcomponents("vevent");

  const concerts: Concert[] = vevents.map((vevent) => {
    const event = new ICAL.Event(vevent);

    const startDt = event.startDate;
    const endDt = event.endDate;

    return {
      uid: event.uid ?? crypto.randomUUID(),
      title: event.summary ?? "Untitled",
      startDate: startDt ? startDt.toJSDate() : new Date(),
      endDate: endDt ? endDt.toJSDate() : new Date(),
      location: String(vevent.getFirstPropertyValue("location") ?? ""),
      description: event.description ?? "",
    };
  });

  // Sort ascending by start date
  concerts.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  return concerts;
}
