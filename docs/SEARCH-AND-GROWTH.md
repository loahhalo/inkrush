# INKRUSH search and visitor growth

Canonical public domain: https://inkrush.site . The Railway address remains compatible with existing device libraries; canonical tags consolidate the public search URLs.

## Shipped search foundation

- Server-rendered `/browse/trending`, `/browse/latest`, `/browse/new`, `/browse/popular` collections with real title links.
- Stable authenticated comic URLs `/comics/<opaque-id>/<title-slug>` with real title, author, language, genres, a limited synopsis excerpt, canonical URL, cover preview and ComicSeries/BreadcrumbList data. Incorrect slugs redirect; tampered IDs return 404; temporary upstream failures remain errors instead of fake empty titles.
- `/guides` and three original reading guides covering Android installation, Page/Strip controls and discovery. These pages contain real useful content, not keyword doorway pages or fabricated reviews.
- Root server HTML includes links to all collections and guides. Comic cards expose crawlable hrefs while ordinary root clicks retain the original hash reader flow. Old chapter links, swipe/scroll gestures and fullscreen behavior remain compatible.
- `/robots.txt`, `/sitemap.xml`, descriptive metadata, website data and an original 1200×630 sharing image. The sitemap includes static pages and deduplicated current Popular/Latest title URLs. It omits fake modification dates and adult titles identified in metadata; discovery preferences still apply.
- Catalog search snapshots last 15 minutes and share existing provider caches. Metadata-only provider calls avoid loading all chapters on crawler visits. API/private reading endpoints are excluded from general crawling; same-origin cover images remain available to crawlers.
- Share story buttons use the native share sheet or copy a canonical comic URL. No visitor tracking scripts, advertising spend or third-party account credentials are added.

## Google Search Console

1. Add the URL-prefix property `https://inkrush.site/` in https://search.google.com/search-console . Use the owner's account.
2. Install the exact HTML verification tag supplied by Google, after the owner approves granting that account verified-owner access. Keep it in the root layout; Google periodically checks it. Do not invent a token or remove other owners' tokens.
3. Verify ownership, then submit `https://inkrush.site/sitemap.xml` in Sitemaps.
4. Inspect the homepage, a collection, a guide and a comic URL. Request indexing for the homepage and a small set of useful pages. Do not submit API URLs or fragment-only chapter links. A submission is not an indexing or ranking guarantee.
5. Review Page indexing and Search results reports after data becomes available. Fix reported crawl errors; measure clicks, impressions, search queries and click-through rate before increasing content volume.

## First month, without paid traffic

Week 1: complete verification and sitemap submission. Share the canonical site link with existing readers; ask what made finding a story difficult. Prepare a short mobile demo of search → chapter selection → page swipe → zoom.

Week 2: use Search Console queries and reader feedback to choose one useful original guide or a carefully researched recommendation list. Explain who each recommendation suits and verify actual chapter availability. Avoid copying publisher descriptions in bulk.

Week 3: with the owner's explicit approval of accounts and posts, publish the demo to their TikTok/Instagram/YouTube channels. Share one helpful answer in relevant communities only where their rules allow a link. No unsolicited messages, purchased links, fake engagement or mass posting.

Week 4: compare clicks, impressions and landing pages. Improve titles/snippets on pages with impressions but weak click-through; improve reader onboarding on pages with visits but weak return use. Fix slow or failed images before expanding promotion.

Prepared demo copy (not posted): “Find your next manga, manhwa or manhua. Pick a chapter, swipe through pages, and keep reading on your phone. Try INKRUSH: https://inkrush.site”.

No social posts, messages, backlinks, advertisements or recurring jobs are created automatically by this change. Search indexing takes Google's own crawl and evaluation; these changes make pages eligible and discoverable, not guaranteed to rank.
