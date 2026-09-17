# Graph Report - Food Tracker  (2026-09-17)

## Corpus Check
- 8 files · ~128,289 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 411 nodes · 1647 edges · 11 communities
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 25 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f1e07a23`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- number
- cleanForFirestore
- renderReportOutput
- normalizeSearchText
- app.js
- openCustomFoodEditor
- safeText
- NutriPilot
- AI Coding Tooling
- handleClick
- sw.js

## God Nodes (most connected - your core abstractions)
1. `number()` - 114 edges
2. `handleClick()` - 71 edges
3. `safeText()` - 51 edges
4. `normalizeNutrients()` - 42 edges
5. `cleanForFirestore()` - 39 edges
6. `showToast()` - 37 edges
7. `normalizeSearchText()` - 32 edges
8. `renderReportOutput()` - 30 edges
9. `scaleNutrients()` - 29 edges
10. `updateDailyCalorieSummary()` - 28 edges

## Surprising Connections (you probably didn't know these)
- `renderSearchV2()` --indirect_call--> `renderRecipeSearchCard()`  [INFERRED]
  app.js → app.js  _Bridges community 3 → community 0_
- `renderSearchV2()` --indirect_call--> `showError()`  [INFERRED]
  app.js → app.js  _Bridges community 3 → community 9_
- `renderRecipes()` --indirect_call--> `renderMealsetCard()`  [INFERRED]
  app.js → app.js  _Bridges community 9 → community 6_
- `renderSettingsV2()` --indirect_call--> `importBackupFile()`  [INFERRED]
  app.js → app.js  _Bridges community 9 → community 1_
- `handleClick()` --indirect_call--> `recipePortionAsFood()`  [INFERRED]
  app.js → app.js  _Bridges community 9 → community 0_

## Import Cycles
- None detected.

## Communities (11 total, 0 thin omitted)

### Community 0 - "number"
Cohesion: 0.08
Nodes (65): caloriesByMeal(), cloneSnapshot(), compactNutrients(), contributionPercent(), editEntry(), entryEditData(), entrySelectedUnitIndex(), entryServingOptions() (+57 more)

### Community 1 - "cleanForFirestore"
Cohesion: 0.12
Nodes (50): buildFullBackupPayload(), cleanForFirestore(), clearCurrentLogs(), clearCustomFoods(), compactLoggedEntry(), compactReportItem(), compactReportItemsFromEntry(), copyMealEntries() (+42 more)

### Community 2 - "renderReportOutput"
Cohesion: 0.09
Nodes (56): addNutrients(), aggregateReportRows(), applyReportGoalsFromData(), assertReportCalculationActive(), beginReportCalculation(), buildReportChartData(), buildReportData(), buildReportDayData() (+48 more)

### Community 3 - "normalizeSearchText"
Cohesion: 0.10
Nodes (42): applyReportEntryFilters(), applyReportFlatFilters(), applySearchFilters(), barcodeLookupFailureMessage(), closestSearchQueries(), damerauLevenshteinDistance(), eatenFoodResults(), fetchOpenFoodFacts() (+34 more)

### Community 4 - "app.js"
Cohesion: 0.05
Nodes (60): activateKeyboardSelection(), addRecentSearch(), affectedReportPeriods(), app, auth, authPersistenceReady, cancelReportCacheJob(), clearReportCacheUploadStatus() (+52 more)

### Community 5 - "openCustomFoodEditor"
Cohesion: 0.15
Nodes (19): bindCustomServingUnit(), customFoodNutrientFieldsHTML(), fetchOpenFoodFactsFromHost(), foodHasUsableNutrients(), getOpenFoodFactsByBarcode(), gramsFromServingString(), normalizeOpenFoodFactsProduct(), nutrientInputHTML() (+11 more)

### Community 6 - "safeText"
Cohesion: 0.10
Nodes (39): addIngredientToTarget(), bindServingAmountDefaults(), buildServingOptions(), caloriesText(), displayFoodName(), foodDataWarnings(), foodNutrientsPer100g(), infoButton() (+31 more)

### Community 7 - "NutriPilot"
Cohesion: 0.13
Nodes (14): Data Ownership, Diary First, Firebase, Highlights, NutriPilot, Offline-Capable PWA, Project Structure, Reading the Weekly Calorie Average from Another App (+6 more)

### Community 8 - "AI Coding Tooling"
Cohesion: 0.22
Nodes (8): AGENTS.md maintenance, AI Coding Tooling, Graphify maintenance, Repository exploration, Serena project memory, Shell/tool output, Startup, Task completion

### Community 9 - "handleClick"
Cohesion: 0.09
Nodes (48): addDaysISO(), cancelActiveReportCalculation(), closeModal(), collectSettingsFromForm(), createMealset(), createRecipe(), downloadFile(), exportBackupJson() (+40 more)

### Community 14 - "sw.js"
Cohesion: 0.50
Nodes (3): CACHEABLE_EXTERNAL_PREFIXES, EXTERNAL_ASSETS, STATIC_ASSETS

## Knowledge Gaps
- **33 isolated node(s):** `firebaseConfig`, `app`, `auth`, `db`, `authPersistenceReady` (+28 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `renderCurrentRoute()` connect `handleClick` to `renderReportOutput`, `normalizeSearchText`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `loadReport()` connect `renderReportOutput` to `handleClick`, `app.js`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `updateDailyCalorieSummary()` connect `cleanForFirestore` to `number`, `renderReportOutput`, `app.js`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `handleClick()` (e.g. with `recipePortionAsFood()` and `showBarcodeScanFailure()`) actually correct?**
  _`handleClick()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `firebaseConfig`, `app`, `auth` to the rest of the system?**
  _33 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `number` be split into smaller, more focused modules?**
  _Cohesion score 0.07884615384615384 - nodes in this community are weakly interconnected._
- **Should `cleanForFirestore` be split into smaller, more focused modules?**
  _Cohesion score 0.12408163265306123 - nodes in this community are weakly interconnected._