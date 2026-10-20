const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const source = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");

function context(names, overrides = {}) {
  const app = vm.createContext({ console, URL, structuredClone, setTimeout, clearTimeout,
    state: { user: { uid: "alice" }, userSession: 1, currentDate: "2026-01-31", settings: {}, customFoods: [], dailyGoals: {} },
    NUTRIENT_KEYS: ["kcal", "protein", "carbs", "fat", "calcium"],
    navigator: { onLine: true }, ...overrides });
  for (const name of ["number", "round", "normalizeSearchText", "normalizeCompactSearchText", "searchTokens", "cleanForFirestore", "emptyNutrients", "normalizeNutrients", "nutrientsFromSnapshot", "foodNutrientsPer100g", "scaleNutrients", "addNutrients", "isUserSessionActive", ...names]) {
    const start = source.search(new RegExp(`^(?:async )?function ${name}\\(`, "m"));
    assert.notEqual(start, -1, name);
    vm.runInContext(source.slice(start, source.indexOf("\n}", start) + 2), app);
  }
  return app;
}
const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};

test("month navigation does not skip February from January 31", () => {
  const app = context(["todayISO", "addDaysISO", "currentWeekRange", "currentMonthRange", "currentYearRange", "periodRange", "shiftReportPeriod"]);
  app.state.reportMode = "month";
  app.state.reportBaseDate = "2026-01-31";
  app.shiftReportPeriod(1);
  assert.equal(app.state.reportRange[0], "2026-02-01");
  app.shiftReportPeriod(-1);
  assert.equal(app.state.reportRange[0], "2026-01-01");
});

test("date-only helpers advance correctly in UTC+14 and UTC-12", () => {
  const original = process.env.TZ;
  try {
    for (const zone of ["Pacific/Kiritimati", "Etc/GMT+12", "Europe/Berlin"]) {
      process.env.TZ = zone;
      const app = context(["todayISO", "addDaysISO", "currentWeekRange", "currentMonthRange"]);
      assert.equal(app.addDaysISO("2026-01-31", 1), "2026-02-01", zone);
      assert.equal(app.currentWeekRange("2026-10-19")[0], "2026-10-19", zone);
      assert.equal(app.currentMonthRange("2026-10-19")[0], "2026-10-01", zone);
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});

test("editing a historical food uses its saved nutrients after the library changes", () => {
  const app = context(["displayFoodName", "entrySourceFood", "servingDisplayName", "entryEditData"]);
  app.state.customFoods = [{ id: "food", name: "Yogurt", nutrientsPer100g: { kcal: 200 } }];
  const entry = { itemType: "food", itemId: "food", amount: 100, unit: "g", gramsEquivalent: 100, nutrientsSnapshot: { kcal: 80 } };
  assert.equal(app.entryEditData(entry, 100, { mode: "grams" }).nutrientsSnapshot.kcal, 80);
  assert.equal(app.entryEditData(entry, 200, { mode: "grams" }).nutrientsSnapshot.kcal, 160);
});

test("older overlapping food searches cannot overwrite newer results", async () => {
  const milk = deferred();
  const app = context(["runFoodSearch"], {
    looksLikeBarcode: () => false,
    searchPersonalLibrary: () => [], getCachedSearch: () => [],
    mergeFoodResults: (local, api) => [...local, ...api],
    fetchOpenFoodFacts: query => query === "milk" ? milk.promise : Promise.resolve([{ name: "Bread" }]),
    setCachedSearch() {}, renderSearchV2() {}, foodSearchFailureMessage: () => "Failed"
  });
  const first = app.runFoodSearch("milk");
  await app.runFoodSearch("bread");
  milk.resolve([{ name: "Milk" }]);
  await first;
  assert.equal(app.state.searchQuery, "bread");
  assert.equal(app.state.searchResults[0].name, "Bread");
  assert.equal(app.state.searchLoading, false);
});

test("clearing a search invalidates any pending result", async () => {
  const pending = deferred();
  const app = context(["runFoodSearch"], {
    looksLikeBarcode: () => false, searchPersonalLibrary: () => [], getCachedSearch: () => [],
    mergeFoodResults: (local, api) => api, fetchOpenFoodFacts: () => pending.promise,
    setCachedSearch() {}, renderSearchV2() {}, foodSearchFailureMessage: () => "Failed"
  });
  const first = app.runFoodSearch("milk");
  await app.runFoodSearch("");
  pending.resolve([{ name: "Milk" }]);
  await first;
  assert.equal(app.state.searchResults.length, 0);
});

test("clearing a diary pins its original date across asynchronous reads", async () => {
  const pending = deferred();
  const deleted = [];
  const app = context(["clearCurrentLogs"], {
    confirm: () => true, getDocs: () => pending.promise, entryCollection: date => date,
    entryDoc: (id, date) => `${date}/${id}`, deleteDoc: async ref => deleted.push(ref),
    writeLocal() {}, updateDailyCalorieSummary: async () => {}, showToast() {}
  });
  const clearing = app.clearCurrentLogs();
  app.state.currentDate = "2026-02-01";
  pending.resolve({ docs: [{ id: "entry" }] });
  await clearing;
  assert.deepEqual(deleted, ["2026-01-31/entry"]);
});

test("calorie export falls back to diary entries when summaries are missing", async () => {
  const app = context(["mapWithConcurrency", "calorieRowsForExport"], {
    dateRange: () => ["2026-01-31"], readDailySummaryForReport: async () => null,
    fetchEntriesForDate: async () => [{ nutrientsSnapshot: { kcal: 450 } }]
  });
  assert.equal((await app.calorieRowsForExport("2026-01-31", "2026-01-31"))[0].totalKcal, 450);
});

test("an empty report has zero logged metric days and no invented deficit", () => {
  const app = context(["reportMetricDates"], { todayISO: () => "2026-01-31" });
  assert.equal(app.reportMetricDates([], ["2026-01-30", "2026-01-31"]).length, 0);
});

test("report caches excluding yesterday expire after midnight", async () => {
  const cached = { version: 21, mode: "week", start: "2026-01-26", end: "2026-02-01", metricExcludedDate: "2026-01-30" };
  const app = context(["readReportCache"], {
    REPORT_CACHE_VERSION: 21, getDoc: async () => ({ exists: () => true, data: () => cached }),
    reportCacheDoc: key => key, dateRange: () => ["2026-01-26", "2026-01-30", "2026-01-31", "2026-02-01"],
    todayISO: () => "2026-01-31", normalizeReportData: value => value
  });
  assert.equal(await app.readReportCache({ key: "week", mode: "week", start: cached.start, end: cached.end }), null);
});

test("offline-only barcode lookup never contacts the API", async () => {
  let calls = 0;
  const app = context(["lookupBarcodeCached"], {
    getCachedBarcode: () => null, selectedOpenFoodFactsHosts: () => ["world.openfoodfacts.org"],
    fetch: async () => { calls += 1; throw new Error("unexpected network"); }
  });
  app.state.settings.databasePreference = "offline-only";
  await assert.rejects(app.lookupBarcodeCached("12345678"));
  assert.equal(calls, 0);
});

test("punctuation-only search does not match every food", () => {
  const app = context(["damerauLevenshteinDistance", "fuzzyTokenScore", "searchMatchScore", "searchMatchTier"]);
  assert.equal(app.searchMatchScore(["Milk"], "---"), 0);
  assert.equal(app.searchMatchTier(["Milk"], "---"), 0);
});

test("food names containing digits are not mistaken for a barcode", () => {
  const app = context(["looksLikeBarcode"]);
  assert.equal(app.looksLikeBarcode("Milk 12345678"), false);
  assert.equal(app.looksLikeBarcode("3017 6204 22003"), true);
});

test("fractional recipe portions use the same divisor in calculation and display", () => {
  const app = context(["recalculateTarget", "targetPortionDivisor"]);
  const recipe = { portions: 0.5 };
  assert.equal(app.recalculateTarget("recipe", recipe, [{ nutrientsSnapshot: { kcal: 200 } }]).nutrientsPerPortion.kcal, 400);
  assert.equal(app.targetPortionDivisor("recipe", recipe), 0.5);
});

test("old daily-goal reads cannot populate another account's cache", async () => {
  const pending = deferred();
  let writes = 0;
  const app = context(["ensureDailyGoalSnapshot"], {
    getDoc: () => pending.promise, dailyGoalDoc: date => date,
    writeLocal: () => writes++, setDoc: async () => writes++
  });
  const loading = app.ensureDailyGoalSnapshot("2026-01-31");
  app.state.user = { uid: "bob" };
  app.state.userSession++;
  pending.resolve({ exists: () => true, data: () => ({ calorieGoal: 3000 }) });
  assert.equal(await loading, null);
  assert.equal(writes, 0);
  assert.equal(Object.keys(app.state.dailyGoals).length, 0);
});

test("session reset cancels queued work and removes private result state", () => {
  const cleared = [];
  let modalClosed = 0;
  const app = context(["resetFoodSearchState", "resetUserSession"], {
    clearTimeout: timer => cleared.push(timer),
    cancelReportCacheJob: key => app.state.reportCacheJobs.delete(key),
    cancelActiveReportCalculation() {}, closeModal: () => modalClosed++,
    clearReportCacheUploadStatus() {}, document: { querySelectorAll: () => [] }
  });
  Object.assign(app.state, {
    unsubs: [], dailySummaryJobs: new Map([["date", { timeout: "summary" }]]),
    reportCacheJobs: new Map([["week", {}]]), settingsSaveTimer: "settings", dayGoalSaveTimer: "goals",
    charts: {}, tempFoods: new Map([["food", { name: "private" }]]), keyboardSelection: {},
    reportData: { private: true }, searchResults: [{ name: "private" }]
  });
  app.resetUserSession();
  assert.ok(cleared.includes("settings") && cleared.includes("summary"));
  assert.equal(app.state.reportCacheJobs.size, 0);
  assert.equal(app.state.tempFoods.size, 0);
  assert.equal(app.state.reportData, null);
  assert.equal(app.state.searchResults.length, 0);
  assert.equal(modalClosed, 1);
});

test("delete-all propagates a failed delete and keeps the local recovery data", async () => {
  let localClears = 0;
  const app = context(["deleteAllAccountData"], {
    discoverLoggedDatesForDelete: async () => ["2026-01-31"], nextPaint: async () => {},
    estimateDeleteWork: async () => ({ total: 3 }), entryCollection: date => date,
    getDocs: async () => { throw new Error("permission-denied"); },
    cancelActiveReportCalculation() {}, cancelReportCacheJob() {}, removeAllLocalUserData: () => localClears++
  });
  app.state.dailySummaryJobs = new Map();
  app.state.reportCacheJobs = new Map();
  await assert.rejects(app.deleteAllAccountData(), /Could not delete entries.*permission-denied/);
  assert.equal(localClears, 0);
  assert.equal(app.state.deletingAccountData, false);
});

test("a camera stream arriving after the popup closes is stopped immediately", async () => {
  const permission = deferred();
  let stopped = 0;
  const video = { isConnected: true, play: async () => { throw Error("closed video must not play"); } };
  const app = context(["stopBarcodeScan", "startBarcodeScan"], {
    document: { getElementById: () => video }, window: { BarcodeDetector: true },
    navigator: { mediaDevices: { getUserMedia: () => permission.promise } }
  });
  const scanning = app.startBarcodeScan();
  app.stopBarcodeScan();
  video.isConnected = false;
  permission.resolve({ getTracks: () => [{ stop: () => stopped++ }] });
  await scanning;
  assert.equal(stopped, 1);
});

test("a late barcode result cannot close a different popup", async () => {
  const pending = deferred();
  let closed = 0;
  const video = { isConnected: true };
  const app = context(["finishBarcodeLookup"], {
    document: { getElementById: () => video }, setBarcodeStatus() {},
    lookupBarcodeCached: () => pending.promise, closeModal: () => closed++
  });
  const lookup = app.finishBarcodeLookup("12345678");
  video.isConnected = false;
  pending.resolve({ name: "Milk" });
  assert.equal(await lookup, false);
  assert.equal(closed, 0);
});
