# Manga source evaluation

Checked 12 October 2026 for INKRUSH. Repository documentation and live service health are different checks. No additional provider was enabled in production during this evaluation.

## Current integration

- MangaDex English and Indonesian readers are implemented. Indonesian catalog requests use `availableTranslatedLanguage[]=id`; chapter feeds use `translatedLanguage[]=id`. A title can exist in metadata while having no readable chapters in the selected language.
- The gateway supports Suwayomi and installed English/Indonesian sources. The free local setup now verifies Komiku search, chapter lists and chapter 1 images for One Piece, One Punch Man and Solo Leveling. Kiryuu and Shinigami were installed and checked for One Piece search. Hosted availability remains unverified. See [LOCAL-SUWAYOMI.md](LOCAL-SUWAYOMI.md).
- AniList enriches cached rankings with exact linked adaptation metadata. It does not supply chapter images. Jikan is not currently integrated.

## Supplied alternatives

The following were single read-only search requests for `one piece` from the development environment. They do not prove permanent outages or describe behavior from every hosting region.

| Project | Published endpoint checked | Observed result | Decision |
|---|---|---|---|
| [KanekiCraynet/api-manga](https://github.com/KanekiCraynet/api-manga) | `https://api-manga-five.vercel.app/search?keyword=one%20piece&provider=komikcast` | HTTP 402, `DEPLOYMENT_DISABLED` | Do not connect this public instance. A self-hosted deployment needs separate source and image tests. |
| [Romi666/komikku-api](https://github.com/Romi666/komikku-api) | `https://komiku-api.fly.dev/api/comic/search/one%20piece` | HTTP 404 JSON; upstream `data.komiku.id` DNS lookup failed | The API host responded, but its upstream search was broken in this check. |
| [Al-Ghozy03/komikcast-api](https://github.com/Al-Ghozy03/komikcast-api) | `https://komikcast-api.vercel.app/search?keyword=one%20piece` | HTTP 500, `status:failed`, empty data | Do not enable without a successful end-to-end read. |
| [febryardiansyah/manga-api](https://github.com/febryardiansyah/manga-api) | `https://mangamint.kaedenoki.net/api/search/one%20piece` | Connection reset (`ECONNRESET`) | No usable search response obtained. |
| Consumet | Supplied GitHub repositories | Research tool returned HTTP 451 for both repositories; implementation/provider health could not be verified here | Keep unverified. Do not assume the listed providers or routes work today. |

Endpoint corrections from the repositories: KanekiCraynet documents `/search?keyword=...` with provider selection, rather than a bare `/search` query convention. Romi666 documents `/api/comic/search/{query}`. MangaMint's chapter route is `/chapter/{chapterEndpoint}`, not the Komikcast-style `/read/` route. Each adapter needs its own response normalization.

## Recommended deployment path

Use MangaDex as the primary source and the existing Suwayomi gateway for additional Indonesian providers. This avoids adding four separate scraper adapters before any of their published services can return a usable search response. Extension availability and maintenance do not guarantee a working source or an update within a particular number of hours.

1. Start with the [official Suwayomi Docker project](https://github.com/Suwayomi/Suwayomi-Server-docker). Use persistent storage; select and pin a tested release image for deployment. Its documented service port is 4567 and data directory is `/home/suwayomi/.local/share/Tachidesk`.
2. Configure HTTPS and authentication on the backend host. The INKRUSH server adapter supports native Basic authentication through `SUWAYOMI_USERNAME` and `SUWAYOMI_PASSWORD`, or a Bearer-authenticated reverse proxy through `SUWAYOMI_TOKEN`. It sends the selected header to both GraphQL and image requests. Configure one method, not both. Keep credentials out of browser settings, URLs and source control. Explicit loopback HTTP is allowed only in local mode, never in a Vercel process.
3. Add the repository URL published by [Keiyoushi](https://github.com/keiyoushi/extensions): `https://github.com/keiyoushi/extensions/raw/repo/index.pb`. Install the desired Indonesian extensions that are currently available. Installation alone is not acceptance testing.
4. Test One Piece, One-Punch Man and Solo Leveling on that server: verify the correct edition/language, chapter list, and at least one decoded page image for each available title. Record missing chapters rather than substituting an unrelated title. Preserve each provider's IDs and progress separately.
5. Set server-side Vercel environment variables and redeploy. Check `/api/gateway?action=sources`, then search and open a chapter through the deployed reader. This checks Vercel-to-backend reachability and image authentication as well as extension health.
6. Enable Redis and daily ranking sync as described in [ARCHITECTURE.md](ARCHITECTURE.md). Current measured Trending candidates come from MangaDex; Suwayomi popularity is not yet incorporated into that ranking.

Do not automatically retry a missing translation against arbitrary similarly named titles. A future cross-source fallback should show source and language, use verified identity mappings, and let the reader choose an edition. Respect provider rate-limit responses; client or proxy rotation is not a guarantee of access.

No VPS, paid service, Redis database, or new hosted source was provisioned. The production reader remains on its already verified providers.
