# Visitor statistics and future advertising

## Open your statistics

Private Google Analytics property: INKRUSH, property 559077369, account 412098171, web stream 16131982455, Measurement ID `G-3178KL4EBM`. These are public installation identifiers, not authentication credentials. Only authorized Google account users can view reports. Reporting time uses Bangkok (UTC+7), currency USD.

- Live activity: https://analytics.google.com/analytics/web/#/a412098171p559077369/realtime/overview . Or double-click `INKRUSH live statistics.url` in the project folder.
- Historical traffic: Google Analytics → Reports. Users estimates people/devices; Sessions counts visits; Views counts tracked screens. Inspect acquisition for sources and engagement for views. Realtime shows recent activity in the last 5/30 minutes; it is not an exact simultaneous-reader count.
- Google Search traffic only: https://search.google.com/search-console?resource_id=https%3A%2F%2Finkrush.site%2F . Search Console does not measure all visits and is not a realtime visitor dashboard.
- Hosting load and costs: Railway → INKRUSH → Observability / Workspace Usage. Requests are not equivalent to human visitors.

Statistics begin when this integration is deployed and a visitor opts in. They cannot reconstruct earlier visits. Reports can lag and exclude blockers, declined consent and unprocessed visitors. There are no artificial live numbers or server-memory counters that reset on deployment.

## Privacy and event design

Google Analytics is not loaded until Allow analytics is selected. No thanks leaves reading available without the Google tag. The footer exposes Privacy choices to change this. Revocation disables future Google events and removes accessible `_ga` cookies; past collected records are not removed retroactively. Preferences are per browser/origin. The `/privacy` page explains storage and links to Google's data policies.

Manual page_view events use grouped routes (Discover, Comic details, Reader, Library, Preferences, guide and collection paths). Raw search queries, opaque comic/chapter identifiers, saved libraries and user-provided strings are not sent. A manga page swipe does not count as a website page view; chapter/screen navigation does. Manual hash events and immersive-reader history events are tracked. Enhanced measurement was disabled on stream creation to avoid history double-counting. Google Signals, ad storage, ad personalization and ad user data remain disabled in the analytics tag. Optional account sharing and marketing emails were declined. The owner accepted Google's agreement themselves.

## Future ads: off by default

The first integration supports manual Google AdSense units only on public collection pages and reading-guide articles. No reader ads, overlays, popunders, autoplay, sticky swipe targets or automatic chapter interstitials are added. No ad script loads while configuration is incomplete. Ads do not depend on analytics opt-in; advertising requires its own appropriate CMP setup.

One-time setup, after actual publisher/inventory approval and content permissions are established:

1. Configure an approved Google-certified consent management flow as required for your audience. The analytics opt-in banner is NOT a certified advertising CMP. This implementation does not install a CMP or falsely imply consent readiness.
2. In Railway reader service Variables, add real `INKRUSH_ADS_CLIENT=ca-pub-<16 digits>` and `INKRUSH_ADS_SLOT=<ad unit ID>`.
3. Set `INKRUSH_ADS_APPROVED=true` only after approval. Set `INKRUSH_ADS_CMP_READY=true` only after the real consent flow is installed/tested. Add the real provider-supplied ads.txt record when onboarding; do not invent publisher IDs or a sellers.json relationship.
4. Double-click **Enable advertising.cmd**. It reads authenticated Railway configuration privately, validates all prerequisites and flips only `INKRUSH_ADS_ENABLED=true`. Railway deploys the new setting. **Disable advertising.cmd** flips it off. These files require Node 22.13+ and an authenticated Railway CLI. They cannot be run by ordinary site visitors.

Equivalent commands: `node scripts/advertising.mjs status`, `node scripts/advertising.mjs on`, `node scripts/advertising.mjs off`. They use the existing linked project, reader service, production environment. No credentials are stored in the shortcuts or sent to browsers. Account approval, payment details and terms are not automated by the switch. Do not enable Google Auto ads without separately reviewing placements, as that could defeat the no-reader-ads design.

No ad account has been created, no publisher approval claimed and no advertising enabled by this change.

## Verified deployment

Deployed commit 39d6690, Railway deployment 3bce0e51-2060-49f0-ab22-0baac0c5f59c. Production build and 105 tests passed. Live browser network inspection found zero Google tag/collection requests before consent; after opt-in, Google accepted page_view with HTTP 204. Hash navigation to Library sent one sanitized page_view. Google Realtime displayed one test visitor, one session_start and three page views (Privacy, Discover, Library). Privacy choices → No thanks followed by reload loaded no analytics tag. No advertising tag loaded. Advertising readiness predicates were unit-tested; a live activation-command test was rejected by automatic approval review and was not run. No ads were activated.
