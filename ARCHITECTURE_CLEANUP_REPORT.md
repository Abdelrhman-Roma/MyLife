# ARCHITECTURE_CLEANUP_REPORT.md — Phase 2

**Scope note:** everything below is a real, grepped/inspected finding — including two dead ends I hit and corrected mid-audit (a shell-quoting bug that produced false "0 references" results on the first pass, and a `--include`/`--exclude-dir` glob-expansion bug that produced false "2 references" results on the second pass). I'm documenting both because the corrected methodology (`find -prune | xargs grep`) is what the numbers below are actually based on, and because it's the honest account of how I verified rather than assumed.

## 1–2. Duplicate folders / duplicate JS files

**No real duplicate folders found.** Top-level structure (`core/`, `css/`, `data/`, `design-system/`, `firebase/`, `js/`, `locales/`, `pages/`, `repositories/`, `services/`, `utils/`) has no overlapping purpose between any two folders.

**9 filename collisions checked, all false positives — this is the established, correct pattern, not duplication:**
`auth.js`, `calendar.js`, `goals.js`, `habits.js`, `nutrition.js`, `prayer.js`, `study.js`, `todo.js`, `workout.js` each exist as both `js/X.js` (the real page logic) and `js/pages/X.js` (a small bootstrap that imports from it) — this bootstrap/module split is deliberate and consistent across all 8 migrated pages. `firebase/auth.js` (low-level Firebase SDK wrapper) and `js/pages/auth.js` (the login/register page's bootstrap) share a name coincidentally but serve entirely different purposes. **Nothing to change here.**

## 3. Duplicate CSS files

**Found 4 real ones, and they are NOT simple dead code — they're unshipped work, so I did not delete them:**

| File | Content | Linked from any page? | Assessment |
|---|---|---|---|
| `css/space-video.css` | Complete, substantial (per-planet color theming, animated video background layer, reduced-motion handling) | **No** | Looks like a fully-built, never-activated visual feature, not legacy. **Not deleted** — deleting a real unshipped feature would violate "do not remove features." Flagged for a product decision (activate it, or confirm intentionally shelved) at a later phase. |
| `css/momentum-theme.css` | 132 lines, explicitly self-described as "loads after the visual layer" | **No** | Same situation — built, documented, never wired in. Not deleted. |
| `css/momentum-layout.css` | Real `.main-panel`/`.mission-status` layout rules | **No** | `.mission-status` isn't used in any markup anywhere (checked) — that part is genuinely inert. But `.main-panel` rules overlap with `shared.css`'s existing (linked) rules for the same selector, so this may be an intended refinement layer, not pure duplication. Not deleted — same reasoning. |
| `css/momentum-overrides.css` | Real `.auth-motto` styling + an auth-page background-image override + the same unused `.mission-status` rule | **No — and this was a real, live bug, not just dead code** | See the bug fix below. |

### Bug found and fixed: the login page's tagline was rendering completely unstyled

`index.html` renders `<p class="auth-motto" id="auth-motto">` (a rotating motivational tagline under the login form, driven by `js/pages/auth.js`). Its only styling — including the color (`#a9caff`) and the fade transition when the text changes — lives in `css/momentum-overrides.css`, which **was never linked from `index.html`**. The element was rendering as unstyled black default text with no animation, every single time anyone visited the login page. Confirmed by checking `index.html`'s actual `<link>` tags against every class the markup references.

**Fix:** added the missing `<link rel="stylesheet" href="css/momentum-overrides.css" />` to `index.html`. This is restoring already-designed, already-referenced-in-markup styling — not a redesign. Rebuilt and confirmed the compiled CSS output now contains the `.auth-motto` rule (`grep` on the built `main-*.css` shows it present). The file's other rule (`.mission-status`) is inert on this page since nothing on `index.html` uses that class, so linking the whole file has no other side effect.

## 4. Duplicate CSS variables — investigated, mostly a false alarm, one confirmed real issue

Initial scan showed `--surface`, `--bg`, `--ink`, etc. defined "10 times" — on inspection, 9 of those are `css/variables.css`'s own intentional per-theme/per-palette blocks (light theme, dark theme, several accent palettes each scoping their own values) — this is correct, standard theming, not duplication.

**The one real issue:** `css/variables.css`'s default `:root` block defines light-theme values (`--bg:#f8fafc`, white surface), but `css/momentum.css` — which loads *after* `variables.css` on every page — **also** defines a plain `:root` block with different, dark "celestial" values (`--bg:#060914`). Since both are `:root` with equal CSS specificity, load order decides, and `momentum.css` always wins. This means `variables.css`'s own default light-theme block is **permanently unreachable** — dead weight, not a live bug (the actual light/dark theme switching mechanism appears to work through separate, properly-scoped attribute selectors elsewhere in `variables.css`, not through this particular default block). **Not touched this phase** — CSS theme load order is exactly what Phase 26 (Theming) is for, and touching it without being able to visually verify both themes live is too risky to do blind.

## 5–25. Duplicate helpers / utilities / services / repositories / Firebase wrappers / state / render / init / boot / auth / storage / sync / theme / localization / notification / dashboard / statistics / cache / service worker / constants / config

**Repositories, services, Firebase wrappers, state management, sync, caching, service worker, dashboard/statistics aggregation:** all confirmed single-instance in the prior sessions' work — one `BaseRepository`, one Firestore/Auth wrapper pair, one `RepoAggregatorSync`, one `sw.js`, one dashboard aggregation path. Re-checked this phase, nothing new found duplicated at that layer.

**Duplicate helper functions — found 8 real, self-contained duplicate pairs**, all following the same pattern: `js/calendar.js` and `js/study.js` (both ES modules, so they can't share a classic-script global the way `shared.js`'s functions can) each independently define their own copies of small date-math helpers:

| Function | Duplicated in | Identical logic? |
|---|---|---|
| `pad2` | calendar.js, study.js | Yes, byte-identical |
| `toISO` | calendar.js, study.js | Yes, byte-identical |
| `todayISO` | calendar.js, study.js | Yes, byte-identical |
| `nowStamp` | calendar.js, study.js | Yes, byte-identical |
| `addDays` | calendar.js, study.js | Yes, byte-identical (workout.js also has an `addDays`, but with a different signature/contract — string input vs Date input — that one is a name coincidence, not a duplicate) |
| `startOfWeek` | calendar.js, workout.js | Same behavior, different code style |
| `parseISO` | calendar.js, study.js | **Nearly** identical — study.js's version has a defensive fallback (`(m \|\| 1)`) for malformed date strings that calendar.js's lacks. Worth noting as drift, not just duplication. |

**Why these exist:** each of these pages was migrated to its own ES module independently (across earlier phases of this project), and rather than import a shared date-utility module, each page's migration re-implemented the same handful of small helpers locally. This isn't dead code — every one of these is actively called by its own file — so per this phase's own removal rule ("nothing imports it"), **none of these are safe to delete right now**. Consolidating them into one shared `utils/dateHelpers.js` module requires updating every call site in both files, which is a real (if small) refactor, not a deletion. **Marked for later migration** — natural to fold into Phases 11–18 when each page is revisited for its own repository work anyway, rather than opening a separate cross-cutting change here.

**Duplicate render/notification functions — found 3, all "keep, don't touch yet":**

- `notificationItemHtml`/`notificationCenterHtml` exist in both `js/shared.js` and `js/notification-center.js`. Initially looked like a pure duplicate-to-delete, but tracing it precisely showed shared.js's version is what actually **creates** the `#notification-bell`/`#notification-panel` DOM elements every page needs, and `notification-center.js`'s `renderPanel()` explicitly requires those elements to already exist (`if (!bell || !panel) return;`). This is a shell-plus-overlay pattern, not true duplication — deleting shared.js's version would break every page's notification bell. **What IS real and wasteful:** shared.js's shell-creation call also renders a full (stale, legacy-data-driven) notification list that gets thrown away immediately when `notification-center.js` overwrites it — a minor, narrow performance smell, not a correctness bug. Flagged for Phase 21 (Notification system consolidation), not touched here — this function is called from `refreshChrome()`, which runs on every page's every topbar update, and I'm not confident enough in the exact DOM contract to touch it without live verification.
- `recentActivityHtml` in `shared.js` (Dashboard-wide) vs `study.js` (Study-page-local) — same name, different scope/purpose (Dashboard shows tasks+habits+goals+events+meals; Study's own version shows only study/assignments/notes). Not a real duplicate, just a repeated naming pattern. No action needed.
- `nutritionSummaryCard` (`shared.js`, used by generic pages, renders a card with a progress meter bar) vs `nutritionSummaryCard2` (`js/pages/account.js` — note the "2" suffix, a strong copy-paste signal) — genuinely duplicated intent, but with **different markup**: account.js's version is missing the progress meter the rest of the app shows. This is a real visual inconsistency on the Profile page, but I can't tell from code alone whether that's a deliberate simplification or an oversight, and merging them risks a visible UI change on a page I haven't touched before. **Flagged, not merged.**

## Project cleanup — deleted this phase (all individually confirmed zero real references)

- `assist/images/Mercury.jpg`, `Venus.jpg`, `Rockets.jpg`, `Nebulae.jpg`, `Uranus.jpg`, `Earth2.png`, `saturn.jpg` — 7 planet/space images never referenced by `PLANET_ASSETS` (the config mapping pages to hero images) or anywhere else.
- `assist/Momentum Logo.png` — superseded by `Momentum_Logo-removebg-preview.png` (used 16× throughout the app); the original was never referenced anywhere.
- `firebase-debug.log` — a stray local `firebase deploy` CLI log file (62KB), evidently left over from someone's machine (`C:\Users\Asus\...`, Windows). Not part of the app; incidentally confirms this project has been deployed to Firebase Hosting under project `momentum-6bb1d`, matching the `.env.local` config from earlier sessions.

**Everything else in `data/` (all 114 Quran chapter JSON files + index + Hadith/Azkar data)** is legitimately used — referenced dynamically by chapter number (`chapters/${id}.json`), not as static literal filenames, so a plain grep for "is this exact file mentioned" would have (and initially did) wrongly flag these as unused. Correctly identified as live data on closer inspection; not touched.

## Standardization

Not performed this phase. Given the number of real findings above that need call-site updates (not just renames), and the explicit instruction to keep each phase safe and working, I did not touch naming conventions, import styles, or module boundaries this round — that's Phase 41's dedicated job, after the underlying duplication (helpers, CSS layering) has actually been resolved. Renaming things whose consolidation isn't done yet would just create more churn to redo later.
