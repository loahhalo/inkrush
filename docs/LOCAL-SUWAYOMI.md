# Free local INKRUSH + Suwayomi

The optional local setup below is preserved. A full hosted Railway deployment is now available; see [RAILWAY.md](RAILWAY.md) for its URL and operations.

No hosting account, Docker installation, domain purchase, or paid service is required. The reader and Suwayomi run on this Windows PC. The public Vercel website cannot reach a server bound to this PC's loopback address; use the local reader for these additional sources.

## Open and restart

- Reader: http://127.0.0.1:8082/reader#discover
- Suwayomi source management: http://127.0.0.1:4567
- Next time, double-click `Start INKRUSH.cmd` in the project directory, then open the reader address.
- Keep the launcher terminal running. Ctrl+C stops the local test. Do not start a second instance on the same ports. If the reader is already running, use its address.
- Node.js 22.13 or newer is required. The PowerShell launcher also recognizes this computer's bundled Codex Node runtime.

The first-run download is the official portable Suwayomi Windows x64 release **v2.4.2366**, with its own Java runtime. `scripts/setup-suwayomi.ps1` checks SHA-256 `b955f374a8d94b8d1c2750ae28fa7eb2066b479957561b5ba9cf8ac993c8fc13` before extraction. This is a pinned version; future upgrades should be verified and tested before changing it.

## Local files and access

`scripts/start-local.mjs` starts both services and binds them to **127.0.0.1 only**. No router port forwarding or public tunnel is configured. The initial Suwayomi configuration disables automatic chapter downloads, tray/browser startup, embedded Chromium, and automatic WebUI updates. It uses the bundled WebUI version. First startup may still download that WebUI version from upstream.

The ignored `.runtime/suwayomi/` directory contains:

```text
downloads/   Verified release archive
portable/    Portable server and bundled Java
data/        Suwayomi database, installed extensions, settings, cache, backups
server.log   Backend startup/provider logs
reader.log   Local gateway logs
session.json Local process IDs and reader address
```

Keep `data/` when updating the portable binary. The launcher only creates `server.conf` if it does not already exist. Local runtime files are excluded from Git and Vercel packaging. Windows temporary files used by Suwayomi are managed by Suwayomi itself.

The local gateway sets `INKRUSH_LOCAL=1` and `SUWAYOMI_URL=http://127.0.0.1:4567`. HTTP is accepted only for an explicit loopback IP in local mode, and is rejected in a Vercel process. Credentials embedded in URLs are rejected. The browser receives same-origin image URLs rather than backend credentials.

## Sources

The Keiyoushi store is configured using its published repository index. Installed for this test:

| Source | Source ID | Verified scope |
|---|---|---|
| Komiku | `4838485846640015979` | One Piece, One Punch Man and Solo Leveling search, chapter lists and first page of chapter 1 |
| Kiryuu | `3639673976007021338` | One Piece search |
| Shinigami | `3411809758861089969` | One Piece search |

Komikcast and WestManga were not present under those names in the fetched Indonesian extension list. They were not installed. Extension availability changes.

In Discover select **Komiku · Suwayomi · ID**, search a title, open its chapter grid, then select a chapter. Counts observed on 12 October 2026: One Piece 1,214 entries; One Punch Man 348; Solo Leveling 182. These counts include source-specific entries and are not a guarantee of completeness. Only the first chapter image for each title was checked through the API; browser verification is recorded separately in `outputs/local-suwayomi-verification.md`.

After installing another extension in Suwayomi, reload INKRUSH to refresh its source dropdown. Local source discovery caches for five seconds. No challenge solver is configured. Source errors remain errors rather than silently changing language or edition.

The generated local ZIP excludes this PC's runtime and database. On a fresh computer, open Suwayomi, go to Browse > Extensions, and install the desired Indonesian extensions from the configured Keiyoushi store. Reload INKRUSH and select the source. This PC already has the three extensions listed above installed.

## Railway upgrade path

Keep the same frontend/API contract and `sw:s:`, `sw:m:`, `sw:c:` ID formats. The next hosting step is a Suwayomi container with a persistent Railway volume mounted at `/home/suwayomi/.local/share/Tachidesk`, an HTTPS Railway-generated address, and authentication. No Railway account or billing was created in this local setup.

The gateway now supports native Basic authentication using server-side `SUWAYOMI_USERNAME` and `SUWAYOMI_PASSWORD`. A reverse proxy with Bearer authentication can instead use `SUWAYOMI_TOKEN`. Configure one method, not both. Remote servers must use HTTPS. Secrets must not be put in `public/`, URLs, or browser settings.

Before migration:

1. Make a Suwayomi backup and preserve this local data directory. Pin the destination server version to the same tested release first.
2. Stop the local server before copying its database. Preserve database records and test identifier stability; backup import can remap internal manga/chapter IDs, so do not assume that restoring into a fresh database preserves every `sw:m:`/`sw:c:` bookmark.
3. Restore or migrate the database, settings and extensions to the Railway volume; replace local path/network settings for the container. Do not copy the Windows Java runtime into Linux.
4. Test the three titles and page images from the deployed gateway. Set Vercel `SUWAYOMI_URL` plus the selected authentication variables, then redeploy.
5. Reading progress and saved titles are currently browser-local. `127.0.0.1:8082` and `inkrush-mu.vercel.app` have separate storage. Implement and use library/progress export/import before switching domains if local progress must move. Hosting migration alone does not transfer browser storage.
6. Connect Redis for shared cache and daily Trending updates when needed. Additional source popularity is not yet part of the MangaDex Trending ranking.

## References

- [Pinned official release](https://github.com/Suwayomi/Suwayomi-Server/releases/tag/v2.4.2366)
- [Suwayomi configuration](https://github.com/Suwayomi/Suwayomi-Server/wiki/Configuring-Suwayomi%E2%80%90Server)
- [Official container project](https://github.com/Suwayomi/Suwayomi-Server-docker)
- [Keiyoushi extension repository](https://github.com/keiyoushi/extensions)
