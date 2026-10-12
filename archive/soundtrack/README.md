# Archived chapter soundtrack

Removed from the app on 2026-10-12 at the user’s request. This directory is outside public and excluded from deployments. Original music, mood classifier, browser OCR, styles, tests, credits, and design notes are preserved for later development. No credentials are stored here.

To develop it again, copy public files back to the main public directory. Import ChapterSoundtrack from ./music.js in app.js, construct it once, and call update with the current source, manga ID/title, chapter ID/number/title, description, genres, and page URLs after reader state changes. Review playback and OCR behavior before enabling it. Run the archived checks with node --test archive/soundtrack/tests/*.test.mjs.

## Chapter soundtrack

Open the floating music button, then Play soundtrack. YouTube playback uses the official IFrame Player API without an API key. A curated six-track instrumental library by Scott Buckley is ranked against six moods. Licensed audio is an alternative source that streams the composer's CC BY 4.0 files, with track credits displayed in the reader. You can paste another YouTube video URL for the current chapter.

Auto initially estimates mood from chapter title, genres, and story description. Opening the panel starts browser-local English OCR on three pages at 20%, 50%, and 80% of the chapter. A weighted keyword classifier uses extracted dialogue; darkness and edge density provide only weak tie-breakers. This is a heuristic with low/moderate confidence, not a full semantic reading of the entire chapter. Unknown or inaccessible text keeps a clearly labelled metadata estimate. The result is cached per chapter in tab memory. Manual mood overrides, volume, and source preference stay in browser storage.

After the first play action, chapter changes update the matching soundtrack. Closing the panel stops playback. YouTube pauses when its player is out of view or the tab is hidden. Reading stays usable while OCR runs. Chapter changes invalidate stale analysis. OCR loads Tesseract.js 6.0.1 and English language data from public CDNs; chapter images and extracted dialogue are processed in the browser.

All included tracks are by Scott Buckley, released under CC BY 4.0: https://www.scottbuckley.com.au/library/ . The catalog contains Reverie, Undertow, Signal to Noise, Ascension, Ice Cream, and First Snow. Audio is unmodified. The reader links each track's attribution page and the license at https://creativecommons.org/licenses/by/4.0/ .
