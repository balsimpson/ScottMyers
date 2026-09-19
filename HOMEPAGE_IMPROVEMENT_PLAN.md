# Homepage improvement plan

Reviewed 18 September 2026. Scope: `/`, its CSS, feed animation, search, and shared data. This document is an implementation plan; application code has not been changed.

## Assessment

The homepage has useful optimizations, but I would not call the overall implementation efficient yet. The main cost is rendering and hydrating the whole archive, followed by reshuffling it immediately after mount. CSS cleanup is worthwhile, but reducing selector count alone will not solve that workload.

Keep the existing paper palette, serif typography, logline-first presentation, search dock, and shuffle interaction. Improve how the page renders and responds before changing its visual identity.

### Verified baseline

| Item | Observed state |
| --- | --- |
| Project | `/Users/balsimpson/Documents/Projects/ScottMyers` |
| Git | This directory is not a Git repository. Remote, branch, and tracked dirty state are unavailable. |
| Instructions | Supplied AGENTS.md instructions apply. No additional project or ancestor AGENTS.md was found. |
| Runtime | Node 22.23.1, npm 10.9.8; installed Nuxt 4.5.2, Nuxt UI 4.11.1, Tailwind 4.3.3. |
| Local server | Existing Node process runs from this project and listens on port 3000. A read of `http://localhost:3000/` returned HTTP 200 and the archive title. |
| Deployment | No project-specific deployment target was identified. The README contains starter-template deployment links, which do not establish a deployed site. |
| Homepage source | `app/pages/index.vue`: 461 lines, 12,344 bytes. |
| Global CSS source | `app/assets/css/main.css`: 906 lines, 18,556 bytes, 20 `!important` declarations including reduced-motion overrides. These are source figures, not production transfer sizes. |
| Archive | 2,562 records. Source JSON is 2,329,824 bytes. Locally minified JSON is 2,037,754 bytes, or 461,331 bytes with gzip. This is a data-size illustration, not a measured client bundle. |
| Current local HTML | 4,128,571 uncompressed bytes, containing 2,562 `.deal-screen` sections and no ready class on the feed. Development tooling contributes to this response. |
| Existing production output | `.output/public/index.html` contains seven deal sections and is 25,456 bytes. It differs from the current source and must not be used as the current production baseline. |

Static source inspection, data measurements, installed component inspection, and a local HTTP response were checked. The Impeccable mechanical detector returned no findings for the homepage and stylesheet; that does not override the manual findings below. Browser frame timing, screenshots, heap usage, keyboard behavior, actual responsive layout, and hosted behavior remain unverified. No usable browser inspection tool was available in this session. No build, lint, or typecheck was run because only this document was added.

## What already works well

- `content-visibility: auto` and intrinsic sizing skip some offscreen layout and paint work. Preserve this where applicable. They do not prevent Vue from creating or hydrating the full list. See [MDN content-visibility](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/content-visibility).
- The feed uses native scrolling, stable deal IDs, passive scroll listeners, and a debounced fallback rather than a continuous JavaScript animation loop.
- Arrival animations already use transform and opacity alongside blur, and run only for the selected deal rather than infinitely.
- Reduced-motion CSS exists. It needs to cover JavaScript scrolling as well.
- System fonts avoid font download overhead. The homepage has no image or video payload to optimize.
- Search uses prebuilt normalized text, computed results, and capped rendered result lists. Keep these choices unless profiling identifies a specific problem.

## Findings and recommended changes

### P1: Render fewer complete deal panels

**Evidence:** `app/pages/index.vue:269` loops over the complete archive. Every record renders its metadata through `metadataFor(deal)`. `app/data/deals.ts:1` imports the complete JSON. `content-visibility` does not reduce DOM creation, HTML transfer, hydration, or Vue's list patching work.

**Implementation:** First extract a `DealPanel.vue` component and move feed behavior into `useDealFeed.ts`. Give each panel stable data and boolean active/entering props, rather than the global active ID. Format metadata once per record when needed, outside the parent's render loop. Keep the existing `useDealSearch.ts` as the search owner.

Then prototype rendering full panel content only for the active deal and a small neighborhood, initially two deals on either side. Lightweight sections can preserve IDs and snap positions while eliminating most nested markup and icon components. Update the render neighborhood during scrolling through a requestAnimationFrame-coalesced handler; keep arrival animation tied to settled scrolling. Waiting until scroll end to mount content would expose empty panels during fast scrolling.

Treat this as a measured prototype. If the remaining 2,562 shell elements still dominate, evaluate full list virtualization with spacers. Do not add a virtualization dependency before measuring the smaller change. Vue's [performance guidance](https://vuejs.org/guide/best-practices/performance.html) supports stable props and virtualization for large lists.

**Required behavior:** Keep all records searchable. Search must resolve the target index, mount the target content, await the DOM update, then navigate. Preserve shuffle order and stable IDs. Compare short and long search jumps; use an immediate jump for distant targets if smooth traversal exposes unloaded content. Preserve at least the first meaningful record in server HTML. Explicitly test browser find and assistive-technology access because unmounted content is unavailable to them. If full-document access is required, provide an accessible complete-list route before adopting windowing.

**Acceptance:** At rest, no more than five full deal panels are mounted with the initial window design; search finds every record; fast scroll, distant jumps, and shuffle never leave a visible empty panel. Measure reduced HTML, hydration time, and DOM count rather than assuming a percentage improvement.

### P1: Make initial content visible without waiting for animation setup

**Evidence:** `main.css:118` sets the feed to `opacity: 0` and disables pointer events. `index.vue:239` calls `shuffleFeed()` after mount, which reorders all records before setting `feedReady`. With JavaScript unavailable, the feed remains invisible.

**Implementation:** Render a readable initial deal in deterministic order on the server and retain it during hydration. Make content visible by default. Recommended behavior is to randomize when the visitor presses Shuffle; if randomization on every visit must be preserved, keep the first record readable and randomize subsequent records after hydration, or use a server/client-shared seed with a deployment strategy that supports it. Prerendering does not produce a different random order per visitor by itself.

**Acceptance:** The initial logline is readable with JavaScript disabled or delayed. Hydration produces no mismatch. Shuffle does not fade the whole archive to blank.

### P1: Respect reduced motion in JavaScript

**Evidence:** `index.vue:163` passes `behavior: 'smooth'` explicitly to `scrollIntoView()`. The CSS reduced-motion rule changes CSS scroll behavior, but does not change that explicit JavaScript option.

**Implementation:** Let CSS own the preference by using `behavior: 'auto'` in JavaScript and restricting smooth CSS scrolling to `prefers-reduced-motion: no-preference`. Alternatively, use a reactive media-query preference and request an instant jump when reduced motion is active. Use one policy for search navigation and shuffle resets. See [MDN scrollIntoView](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView).

Replace the document-wide `0.01ms` transition override with scoped rules for archive motion after checking Nuxt UI's own reduced-motion behavior. Keep focus, selection, and hover feedback visible.

**Acceptance:** Search selection, shuffle, and arrival effects have no travel animation under reduced motion, including when the preference changes while the page is open.

### P2: Remove persistent inactive blur and simplify the arrival effect

**Evidence:** `main.css:150` blurs and fades every inactive panel to 12% opacity. The active deal updates after scroll settles, leaving newly visible content dimmed during movement. `main.css:850` animates blur, opacity, and translation across four content groups. The final group completes after 730 ms, comprising a 210 ms delay and 520 ms duration.

**Implementation:** Keep visible text readable by default. Remove inactive blur and use a short, optional opacity/translation entrance on the newly settled panel. Start with 240–320 ms and no more than 120 ms total stagger, then judge it in the actual viewport. Remove the animation class when the final group completes and ensure the underlying styles match the final frame. Avoid leaving `filter: blur(0)` or animation fill state as the normal resting style.

Blur has a rendering cost that depends on the affected area, browser, and device; this audit did not measure dropped frames. Prefer transform and opacity, and profile any retained filter. Do not add blanket `will-change` or `translateZ(0)`. See [web.dev animation guidance](https://web.dev/articles/animations-guide).

**Acceptance:** Scrolling text remains readable; no repeated animation restart occurs at the same settled index; performance traces show no animation-driven layout; reduced-motion users see the same information immediately.

### P2: Consolidate feed state and lifecycle management

**Evidence:** `index.vue:169` always assigns the same value to `activeDealId` and `enteringDealId`. Both classes currently describe the same state. Native `scrollend` and a timer fallback are both registered. The animation-frame callback is not tracked for cancellation, and listener removal relies on a template ref during unmount.

**Implementation:** Let `useDealFeed.ts` own order, active index, navigation, shuffle, and cleanup. Use one active state. Keep a separate entering ID only if it has a real completion lifecycle. Feature-detect native `scrollend` and use the timer fallback only when needed. Retain the actual listener target or use a lifecycle-safe composable. Track and cancel scheduled frames and timers on disposal; prevent stale shuffle callbacks from winning after repeated clicks.

Keep the existing Fisher–Yates shuffle. Its algorithm is not the main problem. Do not replace it with a random comparator sort.

**Acceptance:** Rapid shuffle clicks settle on the latest order, route changes leave no callbacks behind, and active state remains correct after viewport resize and orientation changes.

### P2: Reduce CSS duplication and fix component styling ownership

**Evidence and implementation:**

- `main.css:24` and `main.css:40` repeat the dark token set. The unconditional system-dark query can also make archive tokens stay dark under an explicit light preference. Let Nuxt color mode own the applied theme class; retain a system fallback only while no explicit class exists, and share the dark values without duplicating them.
- The former data-editor styles are no longer part of the public app. Verify the resulting homepage CSS chunk before claiming a transfer reduction.
- `main.css:275` uses many `!important` declarations to restyle a primary solid Nuxt UI button. Choose the closest component variant and use its `ui` slots or a named component theme for the shared dock treatment. Remove overrides only after confirming computed styles.
- Search input and shuffle button repeat border, radius, translucent background, shadow, and blur. Define a small shared dock treatment, keeping their distinct sizing and interaction states.
- `main.css:462` targets `.search-filter [data-slot="base"]`. In installed Nuxt UI, the select trigger itself is the base element, so verify whether the class lands on that same element. Prefer `:ui="{ base: ... }"` to an assumed descendant structure. Give filter controls full width. Keep the search input root and inner input full width too.
- `main.css:484` transitions background and transform, and the hover/focus rule changes both. These declarations are used and should not be marked redundant. Review repeated width/max-width constraints on the logline wrapper and dock after responsive comparison, not through a blanket rewrite.

Use Tailwind for straightforward layout in extracted components and keep the archive's typography, color tokens, and keyframes in small named style blocks. Replacing every CSS declaration with utilities is not a performance objective.

**Acceptance:** System/light/dark preferences agree across archive and Nuxt UI controls; both filter controls fill their grid cells; QA styles stay functional; fewer overrides remain without layout or focus regressions.

### P2: Resolve long-content behavior before changing panel geometry

**Evidence:** Panels have fixed `100svh` height and paint containment, while the content includes long titles, wrapping metadata, and loglines up to 876 characters. Large vertical gaps and the fixed dock reduce usable space. This is an overflow risk from source inspection, not a visually confirmed defect.

**Implementation:** Check the longest records at narrow and short viewports and 200% zoom. Prefer content-driven minimum-height panels on constrained screens if fixed panels cannot accommodate the text. If panels become variable height, replace `scrollTop / clientHeight` active-index arithmetic with intersection or measured-position tracking. Update snap behavior, intrinsic-size estimates, and any windowing implementation together. Do not silently truncate archival content to preserve a screen-sized layout.

**Acceptance:** Full loglines and metadata remain reachable at 320 px width and landscape height; the dock does not cover the final content; the correct panel remains active after resize. Test mobile keyboard opening with search focused.

### P2: Preserve search accessibility while reducing render work

**Evidence:** Search is a conditional custom section. Selecting a result removes the focused result button, but does not explicitly move focus to the destination. Escape is handled both on `<main>` and through `defineShortcuts`.

**Implementation:** Keep one Escape owner and define where focus returns on close. After selection, move focus to the destination heading or panel without a second scroll. Connect the input to the results region with appropriate expanded/controls state; announce result counts without making every keystroke noisy. Preserve real labels and current copy. Verify one page-level heading and suitable deal headings during extraction.

**Acceptance:** Search, filters, selection, close, and shuffle work using keyboard alone, with visible focus and no lost focus after conditional content unmounts.

### P3: Reduce data and source redundancy only where it pays off

`searchText` intentionally duplicates normalized record text to avoid rebuilding it on every keystroke. Do not delete it as apparent duplication without measuring the CPU/payload tradeoff. Likewise, imports from both the page and composable do not prove duplicate bundled JSON; inspect the production dependency graph.

After DOM improvements, measure the client archive chunk. If data transfer remains material, generate a homepage data projection that excludes QA-only provenance fields, keeping the original dataset authoritative. Consider deferred search data only if it improves initial load without delaying the first query. Preserve schema consistency and all searchable fields.

`TemplateMenu.vue` and `AppLogo.vue` have no references in current application source. They are cleanup candidates, not proven shipped bundle costs. The starter README also uses pnpm despite the project's npm requirement. Update documentation in a later cleanup; do not remove files or dependencies without explicit authorization.

## Implementation order and checkpoints

1. **Capture a current baseline.** Build with `npm run build` when implementation begins and use the resulting local production preview, not the mismatched existing output. Record compressed HTML/CSS/JS sizes, DOM count, hydration timing, and scroll/search/shuffle traces.
2. **Fix visible defaults and motion.** Make initial content readable, handle reduced motion in CSS and JavaScript, remove inactive blur, and consolidate feed state. Verify the existing behavior before adding rendering changes.
3. **Extract and reduce rendering.** Introduce `DealPanel.vue` and `useDealFeed.ts`; cache display metadata and prototype the bounded content window. Decide long-content geometry before finalizing index calculations. Retest search navigation, fast scrolling, and shuffle together.
4. **Clean CSS ownership.** Separate QA styles, consolidate tokens and dock styling, fix select slot targeting, and remove verified redundant declarations. Preserve the current appearance.
5. **Measure again.** Compare the same records, viewports, interactions, and build mode. Change data loading or add full virtualization only if the remaining profile warrants it.

Suggested ownership after implementation: `index.vue` composes the page; `DealPanel.vue` presents one record; `useDealFeed.ts` manages feed behavior; `useDealSearch.ts` manages filtering; a small formatting utility handles dates and display metadata. Extract `ArchiveSearch.vue` only if the search markup remains large enough to justify it. No general animation framework is needed.

## Verification checklist for implementation

- Run `npm run typecheck`, lint the changed application files, and run `npm run build`. Run `npm run data:validate` only if the dataset or extraction/projection contract changes.
- Test `/` in the in-app browser or connected Brave, in light and dark themes at desktop, 390 px and 320 px widths, and a short landscape viewport. Check 200% zoom and the longest actual records.
- Check normal and reduced motion, initial load with delayed or disabled JavaScript, repeated shuffle, fast wheel/touch scrolling, near/far search selection, no results, clearing filters, Escape, and keyboard focus restoration.
- Record performance under the same throttling and viewport before and after. Aim for lower HTML/DOM/hydration cost and no attributable repeated tasks over 50 ms during ordinary interaction. Treat this as an acceptance target, not a result already achieved.
- Confirm the removed data-editor route and write API are absent from the production build.
- Report static checks, local browser results, and production artifact measurements separately. Hosted and real-device verification require their own evidence and are not implied by a successful build.

Recommended first implementation scope: readable initial rendering, motion corrections, feed-state cleanup, and measurement. Follow with bounded panel rendering, which is the largest likely efficiency improvement. CSS deduplication comes after those changes.
