# ScottMyers

Nuxt 4 / Vue / TypeScript spec script archive, using Nuxt UI 4 and Tailwind 4. Use npm and `package-lock.json`, never pnpm.

## Working rules

- Before editing, check `pwd`, `git remote -v`, `git branch --show-current`, and `git status --short`. Expected checkout: `/Users/balsimpson/Documents/Projects/ScottMyers`; origin: `https://github.com/balsimpson/ScottMyers.git`. Verify the branch rather than assuming `main`.
- Preserve unrelated dirty and untracked work. Reviews and plans are read-only unless implementation is requested. Make the smallest in-scope change. Do not commit, push, deploy, delete, or send external messages without explicit authorization. Use only Luna when subagents are needed.
- Current files and package scripts are authoritative. `README.md` is a starter template; `HOMEPAGE_IMPROVEMENT_PLAN.md` is a proposal, not a completion record. `ANALYSIS.md` describes saved-analysis maintenance; verify its implementation claims against current code.
- No project-specific deployment target is established by checked-in configuration. Vercel Analytics does not establish hosting. Confirm the target before release work.

## Main surface and components

**Analysis is a panel in the homepage's main surface, opened by the Analysis button in the search dock. It is not a separate page or route.**

`app/app.vue` supplies `UApp`, `NuxtPage`, and page metadata. `app/pages/index.vue` owns the homepage shell, loading state, dock, and view switching. The dock and the About/search wrappers are inline in this file, not separate components.

| Panel or control | Implementation and behavior |
| --- | --- |
| Deal feed | `app/pages/index.vue` renders full-screen deal sections with `app/components/DealPanel.vue`. `app/composables/useDealFeed.ts` owns shuffle, navigation, and which deal details render. |
| Search results | Inline `search-surface` in `app/pages/index.vue`, using `DealPanel` with `compact`. `app/composables/useDealSearch.ts` owns query/results. Selecting a result clears search and navigates to that deal in the feed. |
| About panel | Inline `archive-info-surface` in `app/pages/index.vue`, controlled by `infoOpen` and the dock's About button. Contains archive context and the source link. |
| Analysis panel | `archive-analysis-surface` in `app/pages/index.vue` mounts `app/components/ArchiveAnalysis.vue` when `analysisOpen` is true. `toggleAnalysis()` closes About/search. The wrapper owns its close and color-mode buttons. |
| Search dock | Inline `search-dock` in `app/pages/index.vue`: About button, search input/clear button, Analysis toggle, and shuffle control. It sits outside the view transition. |
| Analysis source drawer | `app/components/analysis/DealDrawer.vue`, a `USlideover` opened by chart selections or “Open analysed loglines”. Lists matching source entries and reveals saved analysis in each entry's details. This is an overlay, not the main Analysis panel. |
| Public SEO archive | `app/pages/loglines/index.vue`, `app/pages/loglines/page/[page].vue`, and `app/pages/loglines/[id].vue` provide crawlable archive and source-record pages. `app/pages/what-is-a-logline.vue` provides the explanatory landing page. |

The main transition chooses About, then Analysis, then feed or matching search results. `closeSearch()` and Escape clear all three open flags. Do not create routes for these homepage views. The old `app/pages/analysis.vue` is deleted in the working tree, but `nuxt.config.ts` still has a `/analysis` prerender rule; recheck this mismatch for routing/build work rather than restoring the old page.

### Inside the Analysis panel

`ArchiveAnalysis.vue` composes the summary, year/genre filters, story patterns, word rankings, period comparison, buyers, yearly trend, genres, and logline lengths. Nuxt auto-imports files in `app/components/analysis/` with the `Analysis` prefix:

| Component file | Template name and responsibility |
| --- | --- |
| `app/components/analysis/BarList.vue` | `AnalysisBarList`: selectable ranked bars for patterns, words, buyers, genres, and lengths. |
| `app/components/analysis/YearChart.vue` | `AnalysisYearChart`: selectable yearly deal counts. |
| `app/components/analysis/PeriodComparison.vue` | `AnalysisPeriodComparison`: two period selectors, comparison basis, and selectable comparison rows. |
| `app/components/analysis/DealDrawer.vue` | `AnalysisDealDrawer`: selected source entries, expandable details, and incremental display. |
| `app/components/analysis/StoryBreakdown.vue` | `AnalysisStoryBreakdown`: saved protagonist, goal, obstacle, and stakes; nested inside drawer entry details. |

## State, data, and styles

- `app/composables/useArchiveAnalysis.ts`: filters, computed chart data, comparison periods, drawer selection/open state. `app/utils/deal-analysis.ts`: aggregation. `app/utils/story-patterns.ts`: taxonomy and saved-review lookup.
- `data/deals.json`: source records. `data/story-reviews.json`: saved analysis. `data/story-patterns.json`: pattern definitions. `app/data/deals.ts`: shared types, `sourceDealFields`, and filtering. Preserve IDs, records, and source wording; never invent missing details.
- `server/routes/robots.txt.ts` and `server/routes/sitemap.xml.ts`: crawl controls and the generated public URL inventory. Use `NUXT_PUBLIC_SITE_URL` for the production origin.
- Analysis reuse requires the same ID and exact logline. Changed loglines invalidate old reviews. Structural excerpts must come from the source; unknown values stay null. Never regenerate analysis on page load/build.
- Extraction, cleanup, `genre:enrich`, and `analysis:enrich*` write data; they are not checks. `analysis:enrich:ai` calls an external API and requires explicit task scope.
- `app/assets/css/main.css`: homepage/feed/dock/theme. `app/assets/css/analysis.css`: analysis and drawer. `app/app.config.ts`: Nuxt UI theme. `app/utils/deal-formatting.ts`: shared deal metadata formatting.
- Prefer Nuxt UI and Tailwind, compact content, and one visual layer. Keep inputs/textareas full width at both root and inner control. Extract reusable state into composables.

## Run and verify

Local runtime checked with Node `22.23.1` and npm `10.9.8`; no Node version is pinned. Use `npm ci` only when dependencies need installing. Find an existing server with `lsof -nP -iTCP -sTCP:LISTEN` and confirm its checkout with `lsof -a -p <PID> -d cwd`. Reuse it, or run `npm run dev -- --host localhost --port 3000` from the root. Use the actual printed URL; never assume a port belongs to this project or kill unrelated servers.

| Change | Relevant checks |
| --- | --- |
| Documentation | Verify paths/commands and whitespace; no app build needed. |
| Vue/TypeScript | `npm run typecheck`; `npx eslint <changed-files>`. |
| Source/schema/normalization | `npm run data:validate`. |
| Analysis/taxonomy/aggregation | `npm run analysis:validate`; `npm run analysis:pending` reports stale/missing entries without writing. |
| Routing/SSR/prerender/dependencies | `npm run build`, then `npm run preview -- --host localhost --port 4173`; inspect affected routes. |
| UI | Test the affected flow at desktop/mobile sizes and light/dark themes. |

There is no `npm test` script or dedicated end-to-end suite. Do not run enrichment to hide validation failures. Rebuild production previews after prerendered-content changes. Separate static, browser, persistence, and hosted results; a build or HTTP 200 does not prove UI or deployment success.

## In-app browser

To show the page, call `mcp__codex_app__open_in_codex` with `{"target":{"type":"browser","url":"http://localhost:3000"}}`, substituting the verified URL. Opening the panel is not a test.

For interaction, discover `mcp__node_repl__js`. In its persistent Node REPL, initialize the installed Browser plugin:

```js
var { setupBrowserRuntime } = await import('/Users/balsimpson/.codex/plugins/cache/openai-bundled/browser/26.915.31029/scripts/browser-client.mjs');
var agent = await setupBrowserRuntime();
var browsers = await agent.browsers.list();
var browser = await agent.browsers.get(browsers.find(b => b.type === 'iab').id);
console.log(await browser.documentation());
console.log(await browser.tabs.list());
```

This setup was verified locally. If a plugin update moves the import, find it with `rg --files "$HOME/.codex/plugins/cache/openai-bundled/browser" -g browser-client.mjs`. Read supplied Browser skill/runtime instructions before interacting; current tool instructions take precedence.

Reuse a matching tab with `var tab = await browser.tabs.get(id)`, or create one with `var tab = await browser.tabs.new()` and `await tab.goto(url)`. Inspect `await tab.playwright.domSnapshot()` before choosing locators. For visuals use `await nodeRepl.emitImage(await tab.screenshot({ fullPage: false }))`; for errors use `await tab.dev.logs({ levels: ['error', 'warn'], limit: 20 })`. Reload when needed and inspect fresh output. Use `await tab.markDeliverable()` to retain a testing tab for the user.

Prefer the in-app browser for local checks or connected Brave. Chrome requires an explicit request. Report missing browser tooling as blocked, not verified. For Analysis testing, open `/`, press the dock's “Toggle archive analysis” button, then test the affected filters/chart/drawer and close behavior. Do not test the former `/analysis` page as a substitute.
