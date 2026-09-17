# Graph Report - Food Tracker  (2026-09-17)

## Corpus Check
- 8 files · ~129,049 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 417 nodes · 1673 edges · 11 communities
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 27 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `66b01618`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- number
- cleanForFirestore
- loadReport
- renderSearchV2
- app.js
- openCustomFoodEditor
- NutriPilot
- AI Coding Tooling
- handleClick
- normalizeReportRow
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
- `renderRecipes()` --indirect_call--> `showError()`  [INFERRED]
  app.js → app.js  _Bridges community 4 → community 9_
- `renderSettingsV2()` --indirect_call--> `importBackupFile()`  [INFERRED]
  app.js → app.js  _Bridges community 9 → community 1_
- `openDeleteAllDataModal()` --indirect_call--> `updateDeleteProgress()`  [INFERRED]
  app.js → app.js  _Bridges community 9 → community 0_

## Import Cycles
- None detected.

## Communities (11 total, 0 thin omitted)

### Community 0 - "number"
Cohesion: 0.07
Nodes (79): addIngredientToTarget(), applyReportEntryFilters(), bindServingAmountDefaults(), buildServingOptions(), caloriesText(), cloneSnapshot(), compactNutrients(), contributionPercent() (+71 more)

### Community 1 - "cleanForFirestore"
Cohesion: 0.08
Nodes (79): buildFullBackupPayload(), buildReportDayData(), caloriesByMeal(), cleanForFirestore(), clearCurrentLogs(), clearCustomFoods(), closeModal(), compactLoggedEntry() (+71 more)

### Community 2 - "loadReport"
Cohesion: 0.09
Nodes (49): addNutrients(), assertReportCalculationActive(), beginReportCalculation(), buildReportChartData(), buildReportData(), calculateAndStoreReportCache(), calorieRowsForExport(), cancelReportCacheJob() (+41 more)

### Community 3 - "renderSearchV2"
Cohesion: 0.09
Nodes (44): applySearchFilters(), closestSearchQueries(), compareFoodSearchMatches(), damerauLevenshteinDistance(), eatenFoodResults(), fetchOpenFoodFacts(), fetchOpenFoodFactsFromHost(), findPersonalFoodMatch() (+36 more)

### Community 4 - "app.js"
Cohesion: 0.05
Nodes (72): activateKeyboardSelection(), addRecentSearch(), app, applyReportFlatFilters(), applyReportGoalsFromData(), auth, authPersistenceReady, clearReportCacheUploadStatus() (+64 more)

### Community 5 - "openCustomFoodEditor"
Cohesion: 0.26
Nodes (12): bindCustomServingUnit(), customFoodNutrientFieldsHTML(), nutrientInputHTML(), nutrientSectionHTML(), openCustomFoodCreateModal(), openCustomFoodEditor(), renderSearch(), saveCustomFood() (+4 more)

### Community 7 - "NutriPilot"
Cohesion: 0.13
Nodes (14): Data Ownership, Diary First, Firebase, Highlights, NutriPilot, Offline-Capable PWA, Project Structure, Reading the Weekly Calorie Average from Another App (+6 more)

### Community 8 - "AI Coding Tooling"
Cohesion: 0.22
Nodes (8): AGENTS.md maintenance, AI Coding Tooling, Graphify maintenance, Repository exploration, Serena project memory, Shell/tool output, Startup, Task completion

### Community 9 - "handleClick"
Cohesion: 0.09
Nodes (39): addDaysISO(), affectedReportPeriods(), barcodeLookupFailureMessage(), cancelActiveReportCalculation(), collectSettingsFromForm(), currentMonthRange(), currentWeekRange(), currentYearRange() (+31 more)

### Community 10 - "normalizeReportRow"
Cohesion: 0.29
Nodes (11): aggregateReportRows(), flattenReportEntry(), flattenReportItem(), foodFrequencyRows(), foodNameFromReportItem(), gramsFromReportItem(), limitReportFlatRows(), normalizeReportRow() (+3 more)

### Community 14 - "sw.js"
Cohesion: 0.50
Nodes (3): CACHEABLE_EXTERNAL_PREFIXES, EXTERNAL_ASSETS, STATIC_ASSETS

## Knowledge Gaps
- **33 isolated node(s):** `firebaseConfig`, `app`, `auth`, `db`, `authPersistenceReady` (+28 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `renderCurrentRoute()` connect `cleanForFirestore` to `handleClick`, `renderSearchV2`, `app.js`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `loadReport()` connect `loadReport` to `handleClick`, `app.js`, `cleanForFirestore`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `updateDailyCalorieSummary()` connect `cleanForFirestore` to `number`, `loadReport`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `handleClick()` (e.g. with `recipePortionAsFood()` and `showBarcodeScanFailure()`) actually correct?**
  _`handleClick()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `firebaseConfig`, `app`, `auth` to the rest of the system?**
  _33 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `number` be split into smaller, more focused modules?**
  _Cohesion score 0.07205452775073028 - nodes in this community are weakly interconnected._
- **Should `cleanForFirestore` be split into smaller, more focused modules?**
  _Cohesion score 0.07724764686790003 - nodes in this community are weakly interconnected._