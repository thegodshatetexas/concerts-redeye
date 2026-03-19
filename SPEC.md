# concerts.redeye.dev — Technical Spec

## Overview
A public webapp showing Greg & his wife's upcoming (and past) concert schedule, pulled from their shared iCloud "Family" calendar via an `.ics` feed URL. Deployed at `concerts.redeye.dev` on redeye-prod.

---

## Tech Stack
| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) | Matches existing project stack; server components for data fetching |
| Language | TypeScript | Type safety, already scaffolded |
| Styling | Tailwind CSS | Already installed, rapid dark-theme UI |
| iCal parsing | `ical.js` | Battle-tested, handles iCloud quirks |
| Date handling | `date-fns` | Lightweight, already installed |
| Icons | `lucide-react` | Already installed |
| External APIs | MusicBrainz (free), setlist.fm (free) | Artist enrichment, no paid key required |
| Deployment | PM2 + Nginx on redeye-prod | Matches existing infra pattern |
| SSL | Certbot (Let's Encrypt) | Already used on server |

---

## Feature List

### MVP
- Fetch iCal feed from `ICAL_FEED_URL` env var (iCloud public calendar link)
- Parse events: title, date/time, location, description
- Display upcoming shows sorted by date
- Past shows in separate tab, dimmed visual treatment
- Dark theme, mobile-first
- 1-hour cache revalidation (Next.js `fetch` + `revalidate`)

### Nice-to-Haves (Phase 2)
- **Artist photos** — MusicBrainz API lookup by artist name
- **Setlist links** — setlist.fm search link per show
- **"Add to calendar"** button — generates `.ics` file for individual show
- **Venue details** — address + Google Maps link
- **Search/filter** — by artist name or venue
- **Artist bio/genre** — MusicBrainz or Last.fm

---

## Data Model

Events extracted from iCal:
```typescript
interface Concert {
  uid: string;           // iCal UID (stable ID)
  title: string;         // Summary/band name
  startDate: Date;
  endDate?: Date;
  location?: string;     // Venue name + address
  description?: string;  // Notes, ticket links, etc.
}
```

Enriched (Phase 2):
```typescript
interface EnrichedConcert extends Concert {
  artistImageUrl?: string;    // MusicBrainz
  setlistUrl?: string;        // setlist.fm search
  genre?: string;             // MusicBrainz
}
```

---

## iCal Integration

1. Owner of "Family" calendar (Greg's wife) generates public sharing link from iCloud.com or Calendar.app on Mac
2. Link format: `webcal://p...ics.icloud.com/published/2/...`
3. Replace `webcal://` with `https://` for fetch compatibility
4. Store in `.env.local` as `ICAL_FEED_URL`
5. `lib/ical.ts` fetches + parses on each request with Next.js 1h revalidation

---

## Deployment Plan

### DNS
Add `concerts` A record to `redeye.dev` zone pointing to `44.251.95.126`

### Nginx vhost
```nginx
server {
    listen 80;
    server_name concerts.redeye.dev;
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Then: `certbot --nginx -d concerts.redeye.dev`

### PM2
```js
// pm2.config.js
module.exports = {
  apps: [{
    name: 'concerts-redeye',
    script: 'node_modules/.bin/next',
    args: 'start',
    cwd: '/var/www/concerts.redeye.dev',
    env: { PORT: 3001, NODE_ENV: 'production' }
  }]
}
```

---

## Open Questions
- [ ] iCal feed URL (needs Greg's wife to generate from iCloud)
- [ ] Port selection (3001 assumed — confirm not in use on redeye-prod)
- [ ] DNS: Who manages redeye.dev zone? (Needs `concerts` A record added)
