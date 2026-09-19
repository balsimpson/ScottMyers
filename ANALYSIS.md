# Archive analysis

`/analysis` reads its saved story-pattern analysis from **`data/story-reviews.json`**. Visiting the page, applying filters, restarting the app, or rebuilding does not regenerate the analysis.

## Saved dataset

Schema version 4 contains one analysis for every source entry, including records with no matching pattern and records whose source is `N/A` or too vague to establish story structure. The complete pass reads every logline in resumable batches; it does not shortlist entries by recurring phrases.

The file contains:

- `version`, `reviewedAt`, `reviewer`, and `method` for provenance.
- `sourceCount` and `sourceSha256` identifying the analysed collection of IDs and exact loglines.
- `data/story-patterns.json` contains the shared canonical pattern catalog. It uses screenplay-friendly labels and descriptions, with one key for each consolidated story pattern.
- `records`, each containing the source `id`, exact `logline`, `status: "analysed"`, zero or more canonical `patterns`, `sourceStatus`, and `structure`.
- `structure.protagonist`, `structure.goal`, `structure.obstacle`, and `structure.stakes`. Values are AI-selected, exact excerpts from the source logline, or `null` when the information is not established. They are not invented screenplay details.
- `sourceStatus: "available"` when some structure can be extracted; `"limited"` when only vague descriptive information is available; `"unavailable"` for a missing/withheld source logline. Limited and unavailable records remain analysed, with null structural fields.

The canonical pattern definitions live in `data/story-patterns.json` and are consumed by `app/utils/story-patterns.ts`. A record can match several patterns or none. Synonymous or nested variants are stored under one key, so `witness protection` and `witness protection program` do not appear as separate patterns. The analysed count and tagged count are intentionally separate. No match is not an incomplete analysis, and the catalog does not describe every possible story type.

This is a structured interpretation of the recorded loglines, not human verification or analysis of full screenplays. Pattern assignment uses the protagonist, goal, obstacle, and stakes fields together with compound story cues and exclusion rules. It cannot establish production outcomes, commercial success, or sale probability.

## Reuse and incremental maintenance

Keep `data/story-reviews.json` with the project. The page imports it directly. Do not regenerate the dataset on a page load or build.

Run `npm run analysis:pending` to get a read-only JSON report of new, changed, or structurally incomplete entries. Unchanged records are omitted from the pending list, even if a title or other non-logline metadata was edited. This command does not call AI or change files.

If a logline changes, its old analysis remains saved but is excluded from the current charts and entry breakdown until refreshed. Run `npm run analysis:enrich` to reprocess the current source in batches, or use `npm run analysis:pending` to identify a smaller incremental set. The checksum is SHA-256 of JSON-encoded `{ id, logline }` objects sorted by ID using `localeCompare`. Source facts remain in `data/deals.json`.

Run `npm run analysis:validate` after updating data. It requires complete current coverage, one record per ID, valid pattern keys, all four structural fields, source-backed excerpts, and a matching checksum. It also checks chart/drilldown agreement, word deduplication, median calculation, missing-period handling, and reuse/invalidation behavior.

## Page implementation

- `app/composables/useArchiveAnalysis.ts` owns filters, comparison periods and the source-entry drawer.
- `app/utils/deal-analysis.ts` calculates counts and shares from filtered entries.
- `app/components/analysis/` contains the charts, period table, source-entry drawer and saved story breakdown.
- `app/assets/css/analysis.css` extends the archive theme for analysis and its overlays.

“Browse analysed loglines” opens every analysed entry in the current selection. “Source details & saved analysis” exposes its four structural fields, including explicit missing-information states.

Shares use every entry within the active year and genre filters, including missing metadata. Period comparisons report percentage-point differences; an empty period produces no change estimate. Genre labels, company names and joint credits remain as recorded. Potential repeat reports count as separate entries. Uneven historical archive coverage and source-description detail still limit comparisons even with complete analysis coverage.

## Runtime and verification

This is a local Nuxt project without Git metadata or a configured deployment target. `/analysis` is prerendered, so source or saved-analysis updates require `npm run build` and a refreshed production preview. No publishing is implied by a local build.

Relevant checks: `npm run analysis:validate`, `npm run analysis:pending`, `npm run typecheck`, and targeted ESLint. Browser checks cover the analysis route, filtered coverage, saved story breakdown, no-pattern and limited-source records, and desktop/mobile presentation.
