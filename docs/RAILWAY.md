# INKRUSH on Railway

Shareable reader address: https://inkrush.site

The existing https://inkrush.up.railway.app address remains available.

The root address opens the reader. Discover, title links, chapters, the API gateway and proxied comic images use this same public domain. Suwayomi remains a separate authenticated backend service; readers do not need its management address. The free Railway domain was renamed from `reader-production-ff95.up.railway.app` on 12 October 2026. Browser progress is stored per origin and does not move automatically from the previous address.

Private source repository: https://github.com/loahhalo/inkrush

Railway project: https://railway.com/project/2313c64c-d861-4b13-86dd-27ddd0458e5c

## Services

| Service | Build context | Start | Resources |
|---|---|---|---|
| reader | Repository root, multi-stage `Dockerfile`, builds `platform/` | Next.js standalone on Node 24, port 8080 | 1 replica, maximum 0.25 GB / 0.5 vCPU |
| suwayomi | `backend/railway`, `Dockerfile` | Official pinned Suwayomi container, port 4567 | 1 replica, maximum 1 GB / 1 vCPU; Java heap 512 MB |

The reader runs the Next.js platform, unified library API and streaming image proxy. Its implementation, provider acceptance and roadmap are documented in [PLATFORM.md](PLATFORM.md). Its `/healthz` check has a 120-second deployment timeout. Images stream through restricted provider routes. Provider routing is server-only; the interface exposes language editions and translation groups.

Suwayomi has a persistent `suwayomi-volume` mounted at `/home/suwayomi/.local/share/Tachidesk`. Installed extensions are Komiku, Kiryuu, Shinigami, Asura Scans, Flame Comics and Hive Scans. Basic authentication is mandatory. The pinned official image index digest is `sha256:1fac27c387dc2ea9949e1a01ad7f6d6de9d72d3988338a95476748e5c45c4582`. Embedded Chromium and automatic global updates are disabled. The startup guard refuses to run without credentials or the expected volume mount.

Both services are connected to the private GitHub repository's `main` branch for automatic deployment. Builds use Dockerfile autodetection and saved Railway service settings. Deprecated `railway.json` files are not required. The reader's root directory is `/` and Suwayomi's Git build root is `/backend/railway`. Both use `Dockerfile` within their build context. Backend deployments watch `/backend/railway/**` so frontend edits do not unnecessarily restart its database.

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

Commit source changes to GitHub. For manual deployment with an authenticated Railway CLI, use `railway up --service reader` or `railway up --service suwayomi` from the repository root with the correct project selected. The saved Suwayomi root directory selects its backend files. After updating, verify `/healthz`, Discover, chapter grids, and an actual decoded image. Back up the Suwayomi volume before changing the image or database version. Do not replace it with ephemeral storage.

Trending currently uses the bundled MangaDex snapshots and in-memory cache. Shared Redis and scheduled ranking refresh remain optional future configuration. No additional database service was purchased.

Railway is usage-billed. The user chose to keep the account's existing trial credit for now; no subscription was purchased. Select a paid plan in Railway before trial expiry or credit exhaustion if the app should stay available. Hobby was offered at $5 upfront with $5 of included monthly usage and additional charges above that. CPU/RAM caps bound individual services; they are not a monthly spending cap.

## Custom domain

`inkrush.site` is attached to the reader service on port 8080. Hostinger manages DNS using its existing nameservers. The root is an ALIAS (`@`) pointing to `vfca9grn.up.railway.app`, TTL 300 seconds; Railway manages the valid HTTPS certificate and HTTP-to-HTTPS redirect. Existing email and domain-verification records are retained.

The current Railway plan permits only one custom hostname on this service. `www.inkrush.site` is not attached and should not be used as the share link; Hostinger forwarding was not accepted, and its previous CNAME to the root was restored. No plan upgrade or billing change was made.
