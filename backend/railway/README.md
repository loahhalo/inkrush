# INKRUSH Railway backend

Deploy this directory as a Railway service using its Dockerfile. It pins the official Suwayomi stable image. Attach a persistent volume at `/home/suwayomi/.local/share/Tachidesk`. Set `AUTH_USERNAME` and a random `AUTH_PASSWORD` of at least 24 characters using Railway variables. Never commit their values. The startup guard refuses to run without authentication or the expected persistent volume.

Use one replica. The container listens on port 4567 and limits the Java heap to 512 MB; allow additional memory for the JVM and extensions. Embedded Chromium is disabled. The upstream image runs through `tini`; the container uses root because Railway mounts volumes as root. Do not enable automatic chapter downloads. Install Komiku, Kiryuu and Shinigami through Suwayomi after startup. Provider health must be checked from the deployed server.

Generate a Railway HTTPS domain targeting port 4567 after the service is configured. Unauthenticated requests must return 401. In Vercel production set `SUWAYOMI_URL` to that HTTPS origin, `SUWAYOMI_USERNAME` to the backend username, and `SUWAYOMI_PASSWORD` to its password. Keep all three server-side; redeploy the reader after setting them. Credentials are sent in HTTP headers, never image URLs.

The Vercel project builds from the repository root using `vercel.json`; this Railway service builds from `backend/railway`. Railway billing is usage-based; check workspace limits before enabling a paid plan. Back up the volume before upgrades. Migrating a fresh database can change manga/chapter IDs, and local/browser reading progress does not transfer across domains automatically.
