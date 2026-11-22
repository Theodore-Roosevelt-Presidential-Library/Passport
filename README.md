# T.R. Passport

A digital passport from the Theodore Roosevelt Presidential Library. Visitors collect a stamp and a photo at each national park, monument and historic site tied to Theodore Roosevelt, modeled on the National Park Service Passport book: region pages, an illustrated sticker for every site, and a round rubber-stamp cancellation with the visit date.

**Live:** https://passport.labs.trlibrary.com (GitHub Pages, `CNAME` in this repo)

**Status:** prototype. All data stays in the visitor's browser. Where data collection will live is still to be decided (see below).

## What it does

- **Cover and ID page.** Issue a passport with a name and hometown; the ID page carries a passport number and a machine-readable-zone line.
- **Passport book.** Sites grouped by NPS Passport region. Uncollected sites show a faded sticker in a dashed ring; collected sites show the full-color sticker with an inked cancellation.
- **Get your stamp.** Three steps:
  1. **Check in** with the phone's GPS. Each site has one or more points and a radius in `data/sites.json`. Outside the radius the app says how far away you are.
  2. **Add a photo** (camera or library, downscaled to 1600 px JPEG).
  3. **Stamp** with animation. Repeat visits add more cancellations.
- **Journal.** Every visit with its stamp and photos.
- **Share card.** 1080×1350 PNG with the photo, sticker and cancellation, through the phone share sheet or as a download.
- **Offline.** A service worker caches the app for parks with no signal.
- **Prototype settings** (About tab): simulate location, download data as JSON, reset.

## Files

```
index.html             app shell, meta and Open Graph tags
css/app.css            styles (brand tokens from the Brand repo)
js/app.js              router, views, stamp flow, share card
js/cancel.js           canvas renderer for the cancellation stamps
js/store.js            local data layer: localStorage + IndexedDB for photos
data/sites.json        regions and sites
assets/stickers/       circular site illustrations (WebP, 640 px)
assets/brand/          logo and marks from the Brand repo
assets/fonts/          licensed brand web fonts (see below)
tools/sticker.py       crops a generated illustration into a sticker
docs/stickers.md       illustration prompts and style rules
sw.js, manifest.webmanifest   offline + add-to-home-screen
```

## Adding a site

1. Add an entry to `data/sites.json` (`id`, `name`, `short`, `designation`, `agency`, `region`, `city`, `state`, `points`, `radiusKm`, `tr`, `url`, `sticker`).
2. Generate the illustration with the prompt pattern in `docs/stickers.md`.
3. `python3 tools/sticker.py <id> <image-url>` writes `assets/stickers/<id>.webp`.
4. Send the `tr` connection copy through HistorianPanel before publishing.

`agency` is there so the book can grow past NPS (USFS, FWS, BLM, state parks).

## Data collection: options for later

`js/store.js` is the only file that touches storage. Replace it with an API client when the home is chosen. A visit record looks like:

```json
{ "id": "…", "siteId": "thro", "date": "2026-11-21T21:50:00Z", "verified": "gps", "distanceKm": 0.4, "photoIds": ["…"] }
```

Options to weigh: Supabase or Firebase (accounts + photo storage), a small Cloudflare Worker + R2, or tying passports to ACME/Constant Contact contacts for marketing follow-up.

## Before launch

- [ ] HistorianPanel review of every `tr` line in `data/sites.json` (Mesa Verde copy touches Ancestral Pueblo history and goes to human review)
- [ ] Brand review of stickers and cancellations
- [ ] Decide data home, accounts, and photo consent/terms
- [ ] Confirm check-in radii on the ground
- [ ] Add to labs.trlibrary.com

## License

The code is MIT licensed (see `LICENSE`). The MIT license does not cover the brand fonts, logos, marks or sticker illustrations in `assets/`; those belong to the Theodore Roosevelt Presidential Library.

## Fonts

Dharma Gothic and Frutiger Next web fonts are licensed to the Theodore Roosevelt Presidential Library for its own websites. They are not licensed for any other use.

## Credits

Stamp illustrations were generated with Higgsfield in the Library's brand palette. Not affiliated with the National Park Service or the Passport To Your National Parks program.
