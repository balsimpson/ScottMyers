# Scott Myers spec script archive

The [Scott Myers Spec Script Deals archive](https://scottmyers.vercel.app/) is a searchable reading tool for 2,562 deal records and loglines collected from 1991 through 2025.

It keeps the source records together with writers, genres, agencies, studios, sale details, and saved story-pattern analysis. The homepage opens as a shuffled reading feed, with search and analysis controls in the dock.

## What is included

- A full-screen feed for browsing the archive one logline at a time.
- Search across titles, loglines, writers, companies, genres, agencies, notes, and sale details.
- An analysis panel with saved story patterns, word counts, year trends, genre comparisons, and source-entry drilldowns.
- A local `/qa/deals` editor for correcting source-backed fields in `data/deals.json`.

The archive is based on Scott Myers' [Spec Script Deals download](https://www.patreon.com/GoIntoTheStory/posts/download-spec-168834157). It is a structured interpretation of the recorded source material, not a review of the full screenplays or a prediction of commercial outcomes.

## Local development

Install dependencies with npm:

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in a browser. Run the production build and preview with:

```bash
npm run build
npm run preview -- --host localhost --port 4173
```

## Data and analysis

- `data/deals.json` is the canonical archive of source records.
- `data/story-reviews.json` stores the saved analysis for the current loglines.
- `data/story-patterns.json` contains the shared story-pattern definitions.

The analysis is read from JSON at runtime. It is not regenerated on page load or during a normal build. If a logline changes, run the pending report before deciding whether to refresh its saved analysis.

## Useful checks

```bash
npm run typecheck
npm run lint
npm run data:validate
npm run analysis:validate
npm run analysis:pending
```

`npm run analysis:enrich` writes refreshed saved analysis. `npm run analysis:enrich:ai` calls an external AI service, so run it only when an intentional data update is in scope.

## Stack

- Nuxt 4
- Vue and TypeScript
- Nuxt UI 4
- Tailwind CSS 4
- Chart.js and Vue Chart.js
