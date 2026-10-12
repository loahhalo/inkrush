# INKRUSH on Railway

Live reader: https://reader-production-ff95.up.railway.app/reader#discover

Private source repository: https://github.com/loahhalo/inkrush

Railway project: https://railway.com/project/2313c64c-d861-4b13-86dd-27ddd0458e5c

## Services

| Service | Build context | Start | Resources |
|---|---|---|---|
| reader | Repository root, `Dockerfile` | Node 24, `scripts/serve-hosted.mjs`, port 8080 | 1 replica, maximum 0.25 GB / 0.5 vCPU |
| suwayomi | `backend/railway`, `Dockerfile` | Official pinned Suwayomi container, port 4567 | 1 replica, maximum 1 GB / 1 vCPU; Java heap 512 MB |

The reader serves static files and the normalized gateway. Its `/healthz` check has a 120-second deployment timeout. Images stream through restricted provider routes. Weeb Central is disabled in hosted builds; MangaDex EN/ID, WEBTOON, and installed Indonesian extensions are available.

Suwayomi has a persistent `suwayomi-volume` mounted at `/home/suwayomi/.local/share/Tachidesk`. Installed extensions are Komiku, Kiryuu and Shinigami. Basic authentication is mandatory. The pinned official image index digest is `sha256:1fac27c387dc2ea9949e1a01ad7f6d6de9d72d3988338a95476748e5c45c4582`. Embedded Chromium and automatic global updates are disabled. The startup guard refuses to run without credentials or the expected volume mount.

Builds use Dockerfile autodetection and saved Railway service settings. Deprecated `railway.json` files are not required. Keep the reader's root directory at `/` and Suwayomi's Git build root at `/backend/railway` when configuring GitHub deployments. Both use `Dockerfile` within their build context.

## Credentials and management

Suwayomi management is at https://suwayomi-production-6248.up.railway.app . Use the username and password stored in that service's `AUTH_USERNAME` and `AUTH_PASSWORD` Railway variables. The reader has corresponding server-only `SUWAYOMI_URL`, `SUWAYOMI_USERNAME`, and `SUWAYOMI_PASSWORD` variables. Values are excluded from Git and build contexts. Never put credentials into image URLs or public JavaScript.

The original Vercel site remains unchanged. Its connector could not modify the owning team, so the completed cloud deployment uses Railway for both services. The repository still includes an optional Vercel deployment configuration.

## Verified coverage

On 12 October 2026 the public reader's Komiku source returned:

| Title | Hosted manga ID | Chapter entries | Chapter 1 pages | First image |
|---|---|---:|---:|---|
| One Piece | `sw:m:1` | 1,214 | 51 | HTTP 200, JPEG |
| One Punch Man | `sw:m:3` | 348 | 18 | HTTP 200, PNG |
| Solo Leveling | `sw:m:7` | 182 | 79 | HTTP 200, JPEG |

Counts include source-specific entries and do not guarantee completeness. The first image of chapter 1 was tested for each title. One Piece was also checked in the browser. Unauthenticated backend GraphQL returns 401; authenticated access returns 200. Installed sources survived a backend restart. Kiryuu and Shinigami are installed, but their chapter images have not been accepted as working in this deployment.

## Updates and backups

The public app does not require this PC to stay on. Browser progress and saved titles remain local to each browser origin. The local reader, old Vercel site, and Railway site have separate storage; progress transfer is not automatic.

Commit source changes to GitHub. For manual deployment with an authenticated Railway CLI, use `railway up --service reader` from the repository root. For Suwayomi, use the configured Git build root or deploy from `backend/railway` with `--path-as-root` and explicit project/service selectors. After updating, verify `/healthz`, Discover, chapter grids, and an actual decoded image. Back up the Suwayomi volume before changing the image or database version. Do not replace it with ephemeral storage.

Trending currently uses the bundled MangaDex snapshots and in-memory cache. Shared Redis and scheduled ranking refresh remain optional future configuration. No additional database service was purchased.

Railway is usage-billed. This setup initially runs using the account's existing trial credit. Select a paid plan in Railway before trial expiry or credit exhaustion if the app should stay available. CPU/RAM caps bound individual services; they are not a monthly spending cap.
