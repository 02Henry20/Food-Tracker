# Graph Report - Food Tracker  (2026-09-17)

## Corpus Check
- 8 files · ~129,089 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 417 nodes · 1675 edges · 18 communities
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 27 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ebc2888c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- number
- handleClick
- renderReportOutput
- renderSearchV2
- app.js
- safeText
- renderMicroRows
- NutriPilot
- AI Coding Tooling
- periodRange
- normalizeReportRow
- normalizeOpenFoodFactsProduct
- finishBarcodeLookup
- renderReportCacheUploadStatus
- sw.js
- activateKeyboardSelection
- setRoute
- searchLibraryItems

## God Nodes (most connected - your core abstractions)
1. `number()` - 115 edges
2. `handleClick()` - 71 edges
3. `safeText()` - 52 edges
4. `normalizeNutrients()` - 42 edges
5. `cleanForFirestore()` - 39 edges
6. `showToast()` - 37 edges
7. `normalizeSearchText()` - 33 edges
8. `scaleNutrients()` - 30 edges
9. `renderReportOutput()` - 30 edges
10. `updateDailyCalorieSummary()` - 28 edges

## Surprising Connections (you probably didn't know these)
- `renderSearchV2()` --indirect_call--> `renderMealsetSearchCard()`  [INFERRED]
  app.js → app.js  _Bridges community 3 → community 0_
- `renderSearchV2()` --indirect_call--> `showError()`  [INFERRED]
  app.js → app.js  _Bridges community 3 → community 1_
- `renderRecipes()` --indirect_call--> `showError()`  [INFERRED]
  app.js → app.js  _Bridges community 5 → community 1_
- `openDeleteAllDataModal()` --indirect_call--> `updateDeleteProgress()`  [INFERRED]
  app.js → app.js  _Bridges community 1 → community 0_
- `handleClick()` --indirect_call--> `showBarcodeScanFailure()`  [INFERRED]
  app.js → app.js  _Bridges community 1 → community 12_

## Import Cycles
- None detected.

## Communities (18 total, 0 thin omitted)

### Community 0 - "number"
Cohesion: 0.08
Nodes (76): addIngredientToTarget(), applyReportEntryFilters(), bindServingAmountDefaults(), buildServingOptions(), caloriesText(), cloneSnapshot(), compactNutrients(), contributionPercent() (+68 more)

### Community 1 - "handleClick"
Cohesion: 0.06
Nodes (100): addDaysISO(), buildFullBackupPayload(), buildReportDayData(), caloriesByMeal(), cleanForFirestore(), clearCurrentLogs(), clearCustomFoods(), closeModal() (+92 more)

### Community 2 - "renderReportOutput"
Cohesion: 0.08
Nodes (58): addNutrients(), applyReportFlatFilters(), applyReportGoalsFromData(), assertReportCalculationActive(), beginReportCalculation(), buildReportChartData(), buildReportData(), calculateAndStoreReportCache() (+50 more)

### Community 3 - "renderSearchV2"
Cohesion: 0.12
Nodes (35): applySearchFilters(), closestSearchQueries(), compareFoodSearchMatches(), damerauLevenshteinDistance(), eatenFoodResults(), fetchOpenFoodFacts(), findPersonalFoodMatch(), foodIdentity() (+27 more)

### Community 4 - "app.js"
Cohesion: 0.09
Nodes (24): addRecentSearch(), app, auth, authPersistenceReady, collectionFreshness(), dailySummaryNutrients(), db, DEFAULT_SETTINGS (+16 more)

### Community 5 - "safeText"
Cohesion: 0.09
Nodes (35): bindCustomServingUnit(), createMealset(), createRecipe(), customFoodNutrientFieldsHTML(), infoButton(), itemAmountText(), itemFavoriteButton(), nutrientInputHTML() (+27 more)

### Community 6 - "renderMicroRows"
Cohesion: 0.40
Nodes (5): compareReportValue(), nutrientVisible(), renderMicroRows(), reportMicroRows(), sortReportRows()

### Community 7 - "NutriPilot"
Cohesion: 0.13
Nodes (14): Data Ownership, Diary First, Firebase, Highlights, NutriPilot, Offline-Capable PWA, Project Structure, Reading the Weekly Calorie Average from Another App (+6 more)

### Community 8 - "AI Coding Tooling"
Cohesion: 0.22
Nodes (8): AGENTS.md maintenance, AI Coding Tooling, Graphify maintenance, Repository exploration, Serena project memory, Shell/tool output, Startup, Task completion

### Community 9 - "periodRange"
Cohesion: 0.28
Nodes (9): affectedReportPeriods(), currentMonthRange(), currentWeekRange(), currentYearRange(), periodRange(), queueReportCacheRebuild(), reportPeriodMeta(), scheduleReportRecalculationForDate() (+1 more)

### Community 10 - "normalizeReportRow"
Cohesion: 0.29
Nodes (11): aggregateReportRows(), flattenReportEntry(), flattenReportItem(), foodFrequencyRows(), foodNameFromReportItem(), gramsFromReportItem(), limitReportFlatRows(), normalizeReportRow() (+3 more)

### Community 11 - "normalizeOpenFoodFactsProduct"
Cohesion: 0.25
Nodes (9): fetchOpenFoodFactsFromHost(), foodHasUsableNutrients(), getOpenFoodFactsByBarcode(), gramsFromServingString(), normalizeOpenFoodFactsProduct(), openFoodFactsHost(), searchOpenFoodFacts(), selectedOpenFoodFactsHosts() (+1 more)

### Community 12 - "finishBarcodeLookup"
Cohesion: 0.53
Nodes (6): barcodeLookupFailureMessage(), finishBarcodeLookup(), openBarcodeModal(), setBarcodeStatus(), showBarcodeScanFailure(), startBarcodeScan()

### Community 13 - "renderReportCacheUploadStatus"
Cohesion: 0.33
Nodes (6): clearReportCacheUploadStatus(), ensureReportCacheUploadHost(), renderReportCacheUploadStatus(), reportCacheUploadLabel(), reportCacheUploadStatusHTML(), setReportCacheUploadStatus()

### Community 14 - "sw.js"
Cohesion: 0.50
Nodes (3): CACHEABLE_EXTERNAL_PREFIXES, EXTERNAL_ASSETS, STATIC_ASSETS

### Community 15 - "activateKeyboardSelection"
Cohesion: 0.67
Nodes (4): activateKeyboardSelection(), handleKeyboardNavigation(), selectableCardsForKeyboard(), updateKeyboardSelection()

### Community 16 - "setRoute"
Cohesion: 0.67
Nodes (4): cancelActiveReportCalculation(), resetReportsToThisWeek(), setRoute(), updateInAppIcons()

### Community 17 - "searchLibraryItems"
Cohesion: 0.67
Nodes (3): libraryItemSearchParts(), searchLibraryItems(), sortFavoriteFirst()

## Knowledge Gaps
- **33 isolated node(s):** `firebaseConfig`, `app`, `auth`, `db`, `authPersistenceReady` (+28 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `renderCurrentRoute()` connect `handleClick` to `renderSearchV2`, `safeText`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `loadReport()` connect `renderReportOutput` to `setRoute`, `periodRange`, `safeText`, `handleClick`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `updateDailyCalorieSummary()` connect `handleClick` to `number`, `periodRange`, `renderReportOutput`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `handleClick()` (e.g. with `recipePortionAsFood()` and `showBarcodeScanFailure()`) actually correct?**
  _`handleClick()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `firebaseConfig`, `app`, `auth` to the rest of the system?**
  _33 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `number` be split into smaller, more focused modules?**
  _Cohesion score 0.07508771929824562 - nodes in this community are weakly interconnected._
- **Should `handleClick` be split into smaller, more focused modules?**
  _Cohesion score 0.06363636363636363 - nodes in this community are weakly interconnected._