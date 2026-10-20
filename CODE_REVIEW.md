# Code review — 20 October 2026

Reviewed application state, diary mutations, food search and barcode scanning, recipe/mealset calculations, report caches and exports, backup/deletion paths, settings, authentication, Firestore rules, service worker, and Hosting configuration.

## Confirmed findings and fixes

| Priority | Bug and trigger | Fix |
| --- | --- | --- |
| P1 | Open Food Facts' dedicated search returns data to servers but blocks browser origins; legacy global requests also return 503. | Added an authenticated same-origin Firebase search proxy with exact/fuzzy queries, regional filters, caching, request limits, timeouts, and graceful enrichment failure. Verified using live data in Chrome. |
| P1 | Editing an old diary entry after changing its food in the library recalculates history using the new nutrition. | Prefer the logged snapshot/reconstructed original nutrients when editing. |
| P1 | Pending reads, autosaves, report jobs, or search results can survive an account change. | Cancel queued work, invalidate active requests, clear private UI state, and check session ownership before applying async results. |
| P1 | Changing diary dates while a delete operation is awaiting data can target entries on the newly selected date. | Pin the source date and check account ownership throughout deletion. |
| P1 | Delete-all catches failed Firebase deletions and still reports completion and clears recovery data. | Propagate failures, keep the local recovery data, and suppress background summary reconstruction during deletion. |
| P2 | An earlier, slower food search can overwrite a newer search or repopulate a cleared search. | Added request identity and session checks, including barcode result handling. |
| P2 | Recipe portion counts below one are divided by one despite the form accepting fractional counts. | Use the supported minimum portion count consistently in calculations, snapshots, and report flattening. |
| P2 | Repeated recipe-log submissions create duplicate diary entries; failed submissions produce unhandled rejections. | Lock submission until completion and surface errors in the existing UI. |
| P2 | January 31 → next month skips February. | Move to the first day before shifting a month/year. |
| P2 | Date-only operations change dates in UTC+14/UTC−12. | Perform calendar-only arithmetic in UTC. |
| P2 | Cached averages continue excluding yesterday after midnight. | Record the excluded date and invalidate affected caches after rollover; incremented the cache format version. |
| P2 | An empty report invents logged metric days and a calorie deficit. | Calculate metric days from actual logged dates. |
| P2 | Calorie exports report zero for days with diary entries but no usable summary. | Fall back to the underlying diary entries. |
| P2 | Offline-only barcode lookup still contacts Open Food Facts. | Honor offline-only settings before any network request. |
| P2 | Punctuation-only searches match every food; food names containing many digits are mistaken for barcodes. | Require meaningful search characters and barcode-only input. |
| P2 | Closing a scanner while camera permission is pending can leave a later stream running; late results can replace another popup. | Track scanner cleanup and popup/session identity, stop late streams, and discard cancelled results. |
| P2 | Hosting can upload generated graphs, tests, and new backend source as public static assets. | Exclude these paths from the Hosting upload. |

## Validation and limits

- All 38 built-in Node regression checks pass, covering deterministic data, async races, account cleanup, deletion failure, timeouts, and proxy authentication.
- The real UI passed Chrome checks on desktop and mobile layouts using an in-memory Firebase fixture: all routes, offline search, logging, historical edit preview, duplicate-submit protection, popup persistence, and sign-out cleanup.
- Live browser checks through the proxy code returned results for `milk`, `chikcen`, and Germany-filtered `Milch`.
- Production Firestore data was not imported, deleted, or modified for testing. Firestore emulator integration was not run.
- The new proxy and Hosting rewrite must be deployed together; pushing source does not activate the hosted API fix. Upstream availability and search-index freshness remain outside this app's control.
