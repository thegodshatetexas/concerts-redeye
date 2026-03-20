export function setlistUrl(artistName: string): string {
  return `https://www.setlist.fm/search?query=${encodeURIComponent(artistName)}`;
}
