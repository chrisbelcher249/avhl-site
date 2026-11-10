# AVHL simulator headshots — first incremental pass

## Status and scope
- Display-only feature for the event feed and completed-game skater/goalie tables.
- **No changes to the V7 game engine, ratings, owner lineups, game export, simulation IDs, or historical replay schemas.**
- Images are externally hosted at thumbnail resolution and requested lazily in the browser. The Git repository contains only a small JSON manifest with URLs and rights metadata. There are **no image binary files in the site**.
- Missing, blocked or broken photos leave the existing team logo / player number. Historical saved replays also resolve player photos by name at render time, without editing archives.

## Rights and sources
The NHL's official mugshots may be copyrighted and NHL content terms can restrict reuse; **do not automatically ingest or hotlink official NHL portraits** without usage permission. The initial seed uses individually checked photographs published on Wikimedia Commons with clear Creative Commons licensing and accessible credits.

The manifest lives at `public/sim/headshots.json`. Each player entry must contain:
```json
{
  "Player Name": {
    "url": "https://commons.wikimedia.org/wiki/Special:FilePath/PHOTO.jpg?width=128",
    "author": "Photographer Name",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
    "source": "https://commons.wikimedia.org/wiki/File:PHOTO.jpg",
    "note": "Displayed as a cropped thumbnail."
  }
}
```
For photos with original-size/modified crops, credit the actual author and specify modifications. See individual Commons source pages for appropriate source and attribution. Image hosts are restricted to Commons, Wikimedia Upload, or this site; license and source references must use HTTPS.

### Seeded, verified photos
- Connor McDavid — All-Pro Reels (CC BY-SA 2.0), 2022, Wikimedia Commons
- Logan Thompson — The Kip (CC BY-SA 4.0), 2024, Wikimedia Commons
- Auston Matthews — All-Pro Reels / Brian Murphy (CC BY-SA 2.0), 2022, Wikimedia Commons

No assumption is made that every AVHL player has a rights-cleared Commons photo. Additional names can be added gradually, or images licensed for use can be served from the AVHL site with corresponding author/permission metadata.

## User experience
- A lightweight `headshots.js` layer loads `headshots.json` in parallel with regular startup.
- It uses normalized player *names* solely for portrait lookup, not AVHL IDs or gameplay.
- Pictures load lazily, and are invisible until the image load event succeeds, so failed images never replace the original team logo.
- Photos added after feed rows render can hydrate those existing rows.
- A collapsed **Player photo credits** section in the footer provides per-image authors, source links and license links. It takes up very little vertical space.
- No image is embedded into the official game payload or replay archive.

## Tests
Run `npm run test:headshots`. Existing CI also checks this command. A full browser look at the PR preview should confirm Commons URLs resolve from your network, and that the fallback behaves correctly with unavailable images.

## Future expansion
To reach broad roster coverage, obtain rights-cleared portraits or agree an authorized headshot-provider arrangement, then add player/photo entries to the manifest. There should be no automated harvesting of proprietary NHL headshots without rights review.
