# INKRUSH

A comic reader with a TikTok-like flow: swipe left/right to turn pages; swipe up/down or scroll on the reading canvas to change chapters. Arrow keys do the same. F toggles immersive mode. Reading progress and your library stay in this browser.

## Run

Requires Node.js 22+ and pnpm 11.

```
pnpm install
pnpm dev
```

Open the local URL printed by the dev server. The reader automatically opens Give My Regards to Black Jack by Shuho Sato from MangaDex, with 127 English chapters at verification. Discover searches the live MangaDex catalog. No API key or separate manga server is required. Availability can change at the source.

## API integration

Keiyoushi distributes Android source extensions rather than a hosted HTTP API. MangaDex is one of those sources. The reader calls the real MangaDex API through restricted same-origin server routes for metadata, English chapters, page locations, and images. Image endpoints permit only known MangaDex hosts and paths; redirects are refused. Page locations refresh after three minutes or on Retry.

Optional other Keiyoushi sources run through Suwayomi. Start `docker compose -f backend/compose.yaml up -d`, open http://127.0.0.1:4567, and install extensions in Browse > Extensions. In INKRUSH Reader settings, enter that server URL. Hosted readers require a reachable HTTPS Suwayomi server. Tokens are kept only in tab memory. The supplied Docker configuration is local-only.

## Build and verify

```
pnpm test
pnpm build
```

The Vinext/Sites runtime provides the server routes and serves the reader from public/reader.html. public/mangadex.js implements the live source; public/api.js retains Suwayomi support. lib/mangadex-*.mjs contain restricted proxies. Original Afterlight artwork remains for the optional demo, documented in ASSETS.md.

Tests cover gestures, URL restrictions, adapter flows, chapter deduplication, page cache refresh, and image proxy behavior. Live browser verification checks real page images, page turns, chapter changes, and catalog search.

Sources: https://github.com/keiyoushi/extensions and https://api.mangadex.org/docs/.

## Chapter soundtrack

Open the floating music button, then Play soundtrack. YouTube playback uses the official IFrame Player API without an API key. A curated six-track instrumental library by Scott Buckley is ranked against six moods. Licensed audio is an alternative source that streams the composer's CC BY 4.0 files, with track credits displayed in the reader. You can paste another YouTube video URL for the current chapter.

Auto initially estimates mood from chapter title, genres, and story description. Opening the panel starts browser-local English OCR on three pages at 20%, 50%, and 80% of the chapter. A weighted keyword classifier uses extracted dialogue; darkness and edge density provide only weak tie-breakers. This is a heuristic with low/moderate confidence, not a full semantic reading of the entire chapter. Unknown or inaccessible text keeps a clearly labelled metadata estimate. The result is cached per chapter in tab memory. Manual mood overrides, volume, and source preference stay in browser storage.

After the first play action, chapter changes update the matching soundtrack. Closing the panel stops playback. YouTube pauses when its player is out of view or the tab is hidden. Reading stays usable while OCR runs. Chapter changes invalidate stale analysis. OCR loads Tesseract.js 6.0.1 and English language data from public CDNs; chapter images and extracted dialogue are processed in the browser.

All included tracks are by Scott Buckley, released under CC BY 4.0: https://www.scottbuckley.com.au/library/ . The catalog contains Reverie, Undertow, Signal to Noise, Ascension, Ice Cream, and First Snow. Audio is unmodified. The reader links each track's attribution page and the license at https://creativecommons.org/licenses/by/4.0/ .
