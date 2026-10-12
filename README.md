# INKRUSH

**Live app:** https://inkrush.up.railway.app · **Private GitHub:** https://github.com/loahhalo/inkrush

The production app is now a unified Next.js / React / TypeScript platform in `platform/`, with Tailwind CSS, merged chapter releases and an authenticated streaming image proxy. See [Platform architecture and roadmap](docs/PLATFORM.md). Install its isolated dependencies with `pnpm --dir platform install`, then run `pnpm dev`, `pnpm build`, or `pnpm typecheck` from the repository root. Earlier static-reader instructions below are retained for local compatibility.

The reader, gateway and persistent Indonesian source backend now run on Railway. Choose **Komiku · Suwayomi · ID** for the verified One Piece, One Punch Man and Solo Leveling chapters. See [Railway deployment and operations](docs/RAILWAY.md).

A comic reader with a TikTok-like flow: swipe left/right to turn pages; swipe up/down or scroll on the reading canvas to change chapters. Arrow keys do the same. F toggles immersive mode. Reading progress and your library stay in this browser.

## Run

For the free Windows setup with Indonesian sources, double-click **Start INKRUSH.cmd**, then open http://127.0.0.1:8082/reader#discover. This starts the local gateway and portable Suwayomi together. See [local setup and Railway upgrade instructions](docs/LOCAL-SUWAYOMI.md). No Docker or hosting account is required; both services run while the launcher stays open. On a fresh installation, install the desired extensions in Suwayomi first.

Requires Node.js 22+ and pnpm 11.

```
pnpm install
pnpm dev
```

Open the local URL printed by the dev server. Discover starts with Weeb Central and includes WEBTOON and MangaDex in the source selector. No API key or separate manga server is required. A comic overview loads its actual chapter list before showing reading actions.

## API integration

Keiyoushi distributes Android source extensions rather than a hosted HTTP API. INKRUSH has independent server adapters for the public English pages of Weeb Central and WEBTOON, plus the MangaDex API. All metadata, chapter, and image requests use restricted same-origin routes. No authentication, age-gate cookies, or paid access are bypassed. Weeb Central metadata requests are spaced two seconds apart and cached. WEBTOON episodes that require its app display an official reader link. MangaDex titles without public English page images keep their overview and offer an alternative-source search.

Optional other Keiyoushi sources run through Suwayomi. Start `docker compose -f backend/compose.yaml up -d`, open http://127.0.0.1:4567, and install extensions in Browse > Extensions. In INKRUSH Reader settings, enter that server URL. Hosted readers require a reachable HTTPS Suwayomi server. Tokens are kept only in tab memory. The supplied Docker configuration is local-only.

## Build and verify

Railway builds the reader and gateway from the root `Dockerfile`, and the persistent Suwayomi service from [backend/railway](backend/railway/README.md). Both deploy from GitHub `main`. An optional Vercel deployment uses `vercel.json` and the `api/` wrappers. `scripts/configure-hosted.mjs` disables the source that rejects hosted requests. Backend credentials belong only in service variables, never in GitHub or browser settings.

```
pnpm test
pnpm build
```

The Vinext/Sites runtime provides server routes and serves public/reader.html. public/sources.js dispatches the three public providers. lib/weebcentral.mjs, lib/webtoons.mjs, and lib/mangadex-*.mjs normalize provider data and restrict image hosts. The Vercel package is generated with node scripts/prepare-vercel.mjs. Original Afterlight artwork remains for the optional demo, documented in ASSETS.md.

Tests cover gestures, URL restrictions, adapter flows, chapter deduplication, page cache refresh, and image proxy behavior. Live browser verification checks real page images, page turns, chapter changes, and catalog search.

Sources: https://weebcentral.com/ , https://www.webtoons.com/en/ , https://api.mangadex.org/docs/ , and https://github.com/keiyoushi/extensions-source . Public HTML/mobile episode interfaces can change; the adapters have parser fixtures and visible retry paths.

## Discover and chapter navigation

Weeb Central provides subscribers, popularity, recently added, and latest-update ordering. WEBTOON provides trending/popular rankings and new/updated titles from today’s original schedule. MangaDex provides its catalog ordering and genre/type/status filters; Weeb Central maps those filters to its own type, status, and tag parameters. Predictive search cancels obsolete requests and retains local adaptive history. Search and filter state survives returning from an overview. Existing MangaDex bookmarks remain compatible; other provider title/chapter IDs have distinct namespaces.

The chapter dialog has a fixed header and bounded scrolling, exact chapter-number and title filtering, sorting, current/saved chapter markers, and a jump action. Reader order stays unchanged when the list is sorted. Tall webtoon images render at the reading canvas width in overlapping sections; horizontal page actions advance sections before the next image. Bookmarks retain both the image and section. Normal manga pages stay intact; vertical gestures still change chapters.

## Deferred features

The chapter soundtrack is archived in archive/soundtrack for later development and is absent from public builds.

## Previous Vercel source availability

Weeb Central returned HTTP 403 from the Vercel runtime, although its local reader flow works. The Vercel package disables that source and keeps WEBTOON and MangaDex active. Its Solo Leveling publisher entry opens Tappytoon externally. The new Railway reader also provides Komiku's Bahasa Indonesia edition inside the app; its chapter 1 images were verified along with One Piece and One Punch Man. These are distinct source editions with distinct IDs and progress.

Android installation: open https://inkrush.up.railway.app in Chrome and tap **Install app**, or use the browser menu → **Add to Home screen** → **Install**. Reading uses the original swipe-left/page and scroll/chapter controls by default. See [platform architecture](docs/PLATFORM.md) for fallback coverage and PWA behavior.
