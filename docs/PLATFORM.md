# Unified INKRUSH platform

The Railway reader now builds `platform/`: Next.js App Router, React, TypeScript and Tailwind CSS. The original `public/` reader is retained for compatibility tests and server-side adapters, but its prototype HTML/JavaScript is not served by the production Next app. The public address stays https://inkrush.up.railway.app . Suwayomi remains an authenticated persistent backend.

## Boundaries

```text
platform/
  app/
    layout.tsx                 blocking theme initialization + global CSS
    page.tsx, loading.tsx       consistent server/client loading layouts
    api/library/route.ts       normalized catalog, details and chapter pages
    api/proxy/image/route.ts    authenticated opaque image tickets, streaming
    manifest.ts                Android/desktop install manifest
    healthz/route.ts
  components/
    reader-app.tsx             navigation, library, theme and progress
    catalog.tsx                single catalog, search and clean cover cards
    detail.tsx                 chapter directory
    reader.tsx                 original swipe/page and scroll/chapter controls
    paged-image.tsx             readable overlapping sections for tall pages
    reader-gestures.ts          device-independent gesture rules
    install-app.tsx             native install prompt and browser guidance
    shared.tsx                 skeletons, buffering, retries
    migration.ts               previous per-origin saved titles
  server/
    types.ts                   public DTOs vs provider-only metadata
    providers.ts               MangaProvider, MangaDex/Webtoon/scene adapters
    aggregator.ts              matching, merging, gaps, fallback and caching
    identity.ts                opaque authenticated identifiers
    image-proxy.ts             streaming proxy and SSRF restrictions
```

The browser uses only `/api/library` and `/api/proxy/image`. Provider names, `provider_internal_id`, source IDs, upstream URLs and backend credentials remain on the server. Only actual translation attribution is shown; missing attribution reads `Translation team`. It is not inferred to be official.

## Chapters and fallback

1. Load the primary edition in its selected language.
2. Find missing integer chapters from 1 through the highest known integer. Retain chapter 0, decimal chapters and unnumbered extras. Bound the reported gaps to 300.
3. Always compare up to five other registered providers, even when the baseline is contiguous: a feed can be missing its entire newest section. Reuse cached catalog matches, try punctuation-normalized search and a Latin alias when necessary, and require exact normalized title/alias matches in the same language. Recheck fetched metadata. Sequels and uncertain matches are excluded. Official WEBTOON episode feeds retain their own numbering.
4. Merge releases by chapter number; keep each unnumbered extra distinct. Rank releases by configured provider priority, then measured image resolution when available, then release date. Unknown resolution is not invented. Full-resolution MangaDex pages are requested.
5. Return one chronological chapter list with opaque alternative release IDs. The reader can select a translation release. If the selected release's page-list request fails, try other registered releases for that chapter.

Merged feeds are cached for 20 minutes, with a 1-minute retry when gaps or provider failures remain. Exact upstream editions and successful search matches are cached for 15 minutes; empty searches for 1 minute; catalogs for 15 minutes; page lists for 3 minutes. Adding releases preserves old chapter deep links by matching their release membership. The cache coalesces concurrent requests and uses a bounded 100-entry LRU in one Node process. Upstash REST Redis can be supplied with `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` for shared caching. Redis is optional and has not been purchased. Image bytes are streamed rather than stored in this cache. Provider failures cannot fabricate missing chapters. No anti-bot challenge bypass is implemented.

Asura, Flame, Hive, Weeb Central and MangaKatana are installed through maintained Keiyoushi extensions in the existing backend. The two broad English catalogs supply older/popular manga chapters alongside the scene releases. The source registry automatically exposes supported EN/ID editions internally. Reaper is not currently available in the installed extension catalog. Bato's current public site reports closure; encrypted-state unpacking for that closed service is not implemented. Keep unavailable providers disabled; add a maintained adapter/extension only after testing its search, feed and images.

## Proxy contract

```http
GET /api/proxy/image?url=ENCODED_OPAQUE_IMAGE_TICKET
```

`url` is a server-issued AES-GCM ticket. It wraps a validated provider image route. Arbitrary raw URLs and caller-supplied referrers are rejected/ignored: turning this endpoint into an open proxy would expose the server to SSRF. Adapter code supplies the correct upstream Referer/User-Agent, and Suwayomi additionally receives server-only Basic authentication. Redirects and non-image responses are rejected. Only existing restricted image adapters are registered. The direct-CDN helper checks all DNS results and pins the chosen public IP; it is available for future vetted adapters and is not a general public endpoint.

Set `PLATFORM_SIGNING_KEY` to a stable random secret for opaque identifiers. The existing deployment uses `SUWAYOMI_PASSWORD` as its stable key fallback; neither value enters public code. Changing the signing key invalidates previous public identifiers, so retain it across deployments.

## First paint and image loading

The exact blocking theme script is in `platform/app/layout.tsx`. It runs in `<head>` before the body, sets `data-theme`, `color-scheme`, background and foreground CSS variables, and chooses an initial route-shaped skeleton. CSS is bundled with Next; system fonts avoid late font downloads. Server and first client render use the same deterministic shell. `Suspense` and `loading.tsx` provide matching skeleton cards. There is no demo-story render or mount-time full-layout replacement.

Cards and skeletons share a 3:4 cover ratio and grid rules. Cover cards are whole-card anchors, with titles below covers and metadata only when known. The strip reader reserves page space using known dimensions or a 1:2 fallback, displays a spinner, fades in decoded images, and offers inline retry. When a page above the viewport changes its reserved height, its height delta is compensated. Exact heights cannot be guaranteed before a source supplies dimensions; the default ratio is an estimate.

## Reader controls and Android installation

Page mode remains the default for every comic. Swipe left/right (or drag with a mouse) to move through pages; scroll/swipe up/down to change chapter. Long images use the existing `stripMetrics` algorithm to show readable overlapping sections, with left/right advancing sections before changing image. Pinch zoom is allowed; browser panning does not consume chapter gestures. Wheel input is normalized and guarded against inertial multiple chapter changes. Strip mode is an explicit choice for vertical-format stories; native scrolling reads the strip in that mode.

`app/manifest.ts` exposes `/manifest.webmanifest` with a stable root identity, standalone display, 192/512 PNG icons and a maskable icon. `InstallApp` captures Chromium’s `beforeinstallprompt` and opens the native dialog only on a user click. If unavailable (including in-app browsers), the same button opens Android/iOS browser installation instructions. Installation controls disappear in standalone mode.

`platform/public/sw.js` provides a same-origin, bounded static asset cache and offline navigation fallback. API responses and proxied comic images are excluded. Navigation is network-first to prevent serving obsolete app HTML after deployments. The app needs connectivity to fetch new chapters; this does not promise downloaded/offline comics. Docker copies the platform public assets into the standalone runtime. Regenerate brand icons with `node scripts/generate-app-icons.mjs` after installing platform dependencies.

On Android, visit the live HTTPS address in Chrome, tap **Install app**, or use the browser menu → **Add to Home screen** → **Install**. Device installation itself must be checked on the Android phone; the desktop browser verifies the manifest, assets, worker registration and installation guidance.

## Deployment and verification

From the repository root:

```text
node --test tests/*.test.mjs
node platform/node_modules/typescript/bin/tsc --project platform/tsconfig.json --noEmit
node platform/node_modules/next/dist/bin/next build platform --webpack
```

Docker installs the isolated frozen platform lockfile and builds Next standalone. Reader watch paths include `/platform/**`, `/lib/**`, the imported provider modules and the root Docker files. Suwayomi keeps its existing image, volume and credentials.

Browser checks should cover cold reload without a demo flash, search and language switching, clean cards, title deep links, duplicate releases, page/chapter navigation, strip buffering/retry, mobile widths and theme switching. API checks should verify that serialized public data contains no internal IDs, upstream hostnames or provider routing labels, and that arbitrary image URLs fail before network access.

## Upgrade sequence

1. Use the merged reader and inspect upstream failure rates on Railway.
2. Add Redis when multiple reader replicas or persistent shared feeds are needed.
3. Add verified alias mappings for titles whose provider names differ; uncertain matches should stay unmerged.
4. Add more maintained scene extensions after per-provider acceptance tests.
5. Collect actual image dimensions/resolution and read velocity before ranking with those signals. Add a scheduled worker for large catalog enrichment rather than fetching every source during every request.
6. Add account-based synchronization if users need library/progress shared across devices. Current progress remains local to each browser origin.
