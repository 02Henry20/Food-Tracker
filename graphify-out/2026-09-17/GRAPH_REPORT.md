# Graph Report - Food Tracker  (2026-09-17)

## Corpus Check
- 8 files · ~128,766 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 416 nodes · 1665 edges · 15 communities
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 27 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ebc2888c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- safeText
- cleanForFirestore
- normalizeReportData
- normalizeSearchText
- app.js
- openCustomFoodEditor
- renderReportOutput
- NutriPilot
- AI Coding Tooling
- handleClick
- number
- loadReport
- rebuildReportCacheInBackground
- saveReportCacheInBackground
- sw.js

## God Nodes (most connected - your core abstractions)
1. `number()` - 114 edges
2. `handleClick()` - 71 edges
3. `safeText()` - 52 edges
4. `normalizeNutrients()` - 42 edges
5. `cleanForFirestore()` - 39 edges
6. `showToast()` - 37 edges
7. `normalizeSearchText()` - 33 edges
8. `renderReportOutput()` - 30 edges
9. `scaleNutrients()` - 29 edges
10. `updateDailyCalorieSummary()` - 28 edges

## Surprising Connections (you probably didn't know these)
- `renderSearchV2()` --indirect_call--> `renderMealsetSearchCard()`  [INFERRED]
  app.js → app.js  _Bridges community 3 → community 0_
- `renderSearchV2()` --indirect_call--> `showError()`  [INFERRED]
  app.js → app.js  _Bridges community 3 → community 9_
- `fetchOpenFoodFactsFromHost()` --indirect_call--> `normalizeOpenFoodFactsProduct()`  [INFERRED]
  app.js → app.js  _Bridges community 3 → community 10_
- `renderRecipes()` --indirect_call--> `renderMealsetCard()`  [INFERRED]
  app.js → app.js  _Bridges community 9 → community 0_
- `renderSettingsV2()` --indirect_call--> `importBackupFile()`  [INFERRED]
  app.js → app.js  _Bridges community 9 → community 1_

## Import Cycles
- None detected.

## Communities (15 total, 0 thin omitted)

### Community 0 - "safeText"
Cohesion: 0.08
Nodes (74): addIngredientToTarget(), bindServingAmountDefaults(), buildServingOptions(), caloriesText(), cloneSnapshot(), displayFoodName(), editEntry(), entryEditData() (+66 more)

### Community 1 - "cleanForFirestore"
Cohesion: 0.07
Nodes (79): buildFullBackupPayload(), buildReportDayData(), caloriesByMeal(), cleanForFirestore(), clearCurrentLogs(), clearCustomFoods(), closeModal(), compactLoggedEntry() (+71 more)

### Community 2 - "normalizeReportData"
Cohesion: 0.22
Nodes (22): addNutrients(), buildReportChartData(), buildReportData(), compactReportCacheData(), compactReportChartData(), effectiveGoalsForDate(), effectiveMacroGoals(), emptyNutrients() (+14 more)

### Community 3 - "normalizeSearchText"
Cohesion: 0.09
Nodes (47): applyReportEntryFilters(), applyReportFlatFilters(), applySearchFilters(), closestSearchQueries(), compareFoodSearchMatches(), damerauLevenshteinDistance(), eatenFoodResults(), fetchOpenFoodFacts() (+39 more)

### Community 4 - "app.js"
Cohesion: 0.08
Nodes (29): app, auth, authPersistenceReady, clearReportCacheUploadStatus(), collectionFreshness(), db, DEFAULT_SETTINGS, els (+21 more)

### Community 5 - "openCustomFoodEditor"
Cohesion: 0.23
Nodes (13): bindCustomServingUnit(), customFoodNutrientFieldsHTML(), nutrientInputHTML(), nutrientSectionHTML(), openCustomFoodCreateModal(), openCustomFoodEditor(), registerTempFood(), renderSearch() (+5 more)

### Community 6 - "renderReportOutput"
Cohesion: 0.13
Nodes (16): applyReportGoalsFromData(), compareReportValue(), goalStatus(), macroCalories(), macroSplitSummaryHTML(), metricCardHTML(), nutrientVisible(), paginatedReportRows() (+8 more)

### Community 7 - "NutriPilot"
Cohesion: 0.13
Nodes (14): Data Ownership, Diary First, Firebase, Highlights, NutriPilot, Offline-Capable PWA, Project Structure, Reading the Weekly Calorie Average from Another App (+6 more)

### Community 8 - "AI Coding Tooling"
Cohesion: 0.22
Nodes (8): AGENTS.md maintenance, AI Coding Tooling, Graphify maintenance, Repository exploration, Serena project memory, Shell/tool output, Startup, Task completion

### Community 9 - "handleClick"
Cohesion: 0.08
Nodes (42): addDaysISO(), barcodeLookupFailureMessage(), cancelActiveReportCalculation(), collectSettingsFromForm(), createMealset(), createRecipe(), currentMonthRange(), currentWeekRange() (+34 more)

### Community 10 - "number"
Cohesion: 0.10
Nodes (31): activateKeyboardSelection(), aggregateReportRows(), contributionPercent(), dailySummaryNutrients(), flattenReportEntry(), flattenReportItem(), foodFrequencyRows(), foodHasUsableNutrients() (+23 more)

### Community 11 - "loadReport"
Cohesion: 0.21
Nodes (15): assertReportCalculationActive(), beginReportCalculation(), calorieRowsForExport(), csvCell(), dateRange(), delay(), exportEntries(), fetchEntriesForRange() (+7 more)

### Community 12 - "rebuildReportCacheInBackground"
Cohesion: 0.25
Nodes (9): affectedReportPeriods(), calculateAndStoreReportCache(), cancelReportCacheJob(), isReportCacheJobActive(), queueReportCacheRebuild(), rebuildReportCacheInBackground(), reportAbortError(), reportCacheDoc() (+1 more)

### Community 13 - "saveReportCacheInBackground"
Cohesion: 0.33
Nodes (7): addRecentSearch(), firestoreSafeCompactReportCache(), markSearchStateSaved(), pendingReportCacheLocalKey(), removeLocal(), saveReportCacheInBackground(), storeCompactReportCache()

### Community 14 - "sw.js"
Cohesion: 0.50
Nodes (3): CACHEABLE_EXTERNAL_PREFIXES, EXTERNAL_ASSETS, STATIC_ASSETS

## Knowledge Gaps
- **33 isolated node(s):** `firebaseConfig`, `app`, `auth`, `db`, `authPersistenceReady` (+28 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `renderCurrentRoute()` connect `cleanForFirestore` to `handleClick`, `normalizeSearchText`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `loadReport()` connect `loadReport` to `cleanForFirestore`, `normalizeReportData`, `app.js`, `renderReportOutput`, `handleClick`, `rebuildReportCacheInBackground`, `saveReportCacheInBackground`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `updateDailyCalorieSummary()` connect `cleanForFirestore` to `normalizeReportData`, `number`, `rebuildReportCacheInBackground`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `handleClick()` (e.g. with `recipePortionAsFood()` and `showBarcodeScanFailure()`) actually correct?**
  _`handleClick()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `firebaseConfig`, `app`, `auth` to the rest of the system?**
  _33 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `safeText` be split into smaller, more focused modules?**
  _Cohesion score 0.07997038134024435 - nodes in this community are weakly interconnected._
- **Should `cleanForFirestore` be split into smaller, more focused modules?**
  _Cohesion score 0.07497565725413827 - nodes in this community are weakly interconnected._