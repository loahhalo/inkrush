# INKRUSH

A phone-first comic reader with a TikTok-like reading flow. Swipe left/right for pages; swipe up/down or use the mouse wheel on the comic canvas for chapters. Desktop arrow keys do the same. F toggles immersive mode. Progress, library, and motion preferences are stored in this browser.

## Run

Requires Node.js 20 or newer. No frontend dependencies or build are needed.

```sh
node preview.mjs
```

Open http://127.0.0.1:8080. The original Afterlight demo contains two chapters and six illustrated pages. It runs without a backend.

## Keiyoushi integration

Keiyoushi publishes Android extension packages, not an HTTP manga API. Suwayomi runs those extensions and exposes the GraphQL endpoint used by this reader.

1. Install Docker, then run `docker compose -f backend/compose.yaml up -d`. The supplied config uses Suwayomi preview, matching the current GraphQL schema, and preconfigures the Keiyoushi store. It binds the server to localhost and persists its data in a named volume.
2. Open http://127.0.0.1:4567. Under Browse → Extensions, install a source you want to use. Configure that source in Suwayomi if required.
3. In INKRUSH, open Sources / Reader settings. Connect to `http://127.0.0.1:4567` when running the frontend locally.
4. Discover now shows installed sources, popular comics, paginated search results, chapters, and page images served by Suwayomi.

For the hosted HTTPS reader, provide an HTTPS Suwayomi endpoint reachable from your browser. Do not expose the unauthenticated local configuration directly to the internet. Configure authentication on the remotely hosted server. The connection dialog supports a bearer access token held only in tab memory; image requests use Suwayomi's supported token parameter only for the selected server origin. Tokens are never written to local storage. After expiry/reload, reconnect with a fresh token. Basic-auth-only servers and automatic refresh are not supported in this version.

Existing Suwayomi servers can add `https://raw.githubusercontent.com/keiyoushi/extensions/repo/index.min.json` in extension repository/store settings. All extension installation and trust decisions stay in Suwayomi's management interface.

## Verification

`node --test tests/*.test.mjs` checks gesture direction/thresholds, URL safety, source ordering, large source IDs, GraphQL error handling, and the adapter's browse-to-image flow with fixtures. A live Suwayomi instance is required to verify extension execution and source availability; the static hosted preview does not run Android extensions itself.

## Files

- `dist/`: standalone website, ready for static hosting.
- `dist/api.js`: Suwayomi GraphQL client.
- `dist/core.js`: gesture and URL helpers.
- `backend/compose.yaml`: optional extension runtime.
- `ASSETS.md`: original demo artwork prompts and generation details.

Reference: https://github.com/keiyoushi/extensions and https://github.com/Suwayomi/Suwayomi-Server. Third-party content remains subject to the source's availability and terms.
