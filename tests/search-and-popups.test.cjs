const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

// The static app imports Firebase from a CDN. Evaluate its actual functions in
// isolation so these regression checks need neither Firebase nor an account.
const source = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
function functionSource(name) {
  const start = source.search(new RegExp(`^(?:async )?function ${name}\\(`, "m"));
  assert.notEqual(start, -1, `Missing function ${name}`);
  const end = source.indexOf("\n}", start);
  return source.slice(start, end + 2);
}

function createContext(overrides = {}) {
  const context = vm.createContext({
    URL, console, AbortController, setTimeout, clearTimeout,
    FOOD_SEARCH_TERMS: JSON.parse(source.match(/const FOOD_SEARCH_TERMS = (".*")\.split/)[1]).split(" "),
    readSearchCache: () => ({ searches: {} }),
    navigator: { language: "de-DE", onLine: true },
    state: { settings: { searchRegions: ["world"] }, customFoods: [] },
    API_SEARCH_RESULT_LIMIT: 100,
    SEARCH_PAGE_SIZE: 10,
    SEARCH_REGIONS: [["world", "World / global", "world.openfoodfacts.org"], ["germany", "Germany", "de.openfoodfacts.org"], ["uk", "United Kingdom", "uk.openfoodfacts.org"]],
    NUTRIENT_KEYS: ["kcal", "protein", "carbs", "fat", "sugar", "fiber", "salt", "sodium", "calcium"],
    ...overrides
  });
  const names = ["number", "round", "normalizeSearchText", "normalizeCompactSearchText", "searchTokens", "damerauLevenshteinDistance", "fuzzyTokenScore", "searchMatchScore", "foodSearchParts", "searchMatchTier", "foodSearchMatch", "foodIdentity", "findPersonalFoodMatch", "searchRankForFood", "isPersonalCustomFood", "foodSearchSort", "compareFoodSearchMatches", "searchPersonalLibrary", "resultKindForFood", "markResultFood", "selectedSearchRegionValues", "selectedOpenFoodFactsHosts", "openFoodFactsHost", "fetchOpenFoodFactsFromHost", "closestSearchQueries", "fetchOpenFoodFactsJson", "fetchFuzzyOpenFoodFacts", "fetchOpenFoodFacts", "displayFoodName", "gramsFromServingString", "emptyNutrients", "normalizeNutrients", "nutrientsFromSnapshot", "foodNutrientsPer100g", "foodHasUsableNutrients", "normalizeOpenFoodFactsProduct"];
  vm.runInContext(names.map(functionSource).join("\n"), context);
  return context;
}

const product = (code, name, extra = {}) => ({ code, product_name: name, nutriments: { "energy-kcal_100g": 100, proteins_100g: 10, calcium_100g: 0.12 }, ...extra });
const response = data => ({ ok: true, json: async () => data });

test("local search accepts case, accents, punctuation, and common typo types", () => {
  const app = createContext();
  for (const [query, name] of [["MiLK", "milk"], ["cafe", "Café"], ["chikcen", "Chicken"], ["chiclen", "Chicken"], ["xhicken", "Chicken"], ["banan", "Banana"], ["bannana", "Banana"], ["mikl", "Milk"], ["mik", "Milk"], ["chikcen-breast", "Chicken breast"]]) {
    assert.ok(app.searchMatchScore([name], query) > 0, `${query} should match ${name}`);
  }
  assert.equal(app.searchMatchScore(["Banana"], "chicken"), 0);
  assert.equal(app.searchMatchScore(["Milk"], "zzzz"), 0);
  assert.deepEqual(Array.from(app.searchTokens("Crème--BRÛLÉE")), ["creme", "brulee"]);
  assert.ok(app.searchMatchScore(["우유"], "우유") > 0);
});

test("exact matches rank ahead of fuzzy matches in the personal library", () => {
  const app = createContext();
  app.state.customFoods = [{ name: "Milky", source: "custom", usedCount: 100 }, { name: "Milk", source: "custom" }];
  assert.equal(app.searchPersonalLibrary("MILK")[0].name, "Milk");
});

test("browser-compatible typo correction retains words and sanitizes input", () => {
  const app = createContext();
  assert.equal(app.closestSearchQueries('Chikcen--BREAST ("*)')[0], "chicken breast");
  assert.equal(app.closestSearchQueries("milk").length, 0);
  assert.equal(app.closestSearchQueries("---").length, 0);
});

test("API fallback corrects a typo through browser-supported endpoints with full nutrition", async () => {
  const requests = [];
  const app = createContext({ fetch: async value => {
    const url = new URL(value);
    requests.push(url);
    assert.equal(url.pathname, "/cgi/search.pl");
    const corrected = url.searchParams.get("search_terms") === "chicken";
    return response({ products: corrected ? [product("12345678", "Chicken breast", { serving_quantity: 150, serving_size: "150 g" })] : [] });
  } });
  const foods = await app.fetchOpenFoodFacts("CHIKCEN");
  assert.equal(foods[0].name, "Chicken breast");
  assert.equal(foods[0].nutrientsPer100g.calcium, 120);
  assert.equal(foods[0].defaultServing.grams, 150);
  assert.equal(requests[0].searchParams.get("search_terms"), "chikcen");
  assert.ok(requests.length <= 3);
});

test("API search deduplicates products and keeps closer matches first", async () => {
  const app = createContext({ fetch: async () => response({ products: [product("87654321", "Milky"), product("12345678", "Milk"), product("12345678", "Milk")] }) });
  assert.deepEqual(Array.from(await app.fetchOpenFoodFacts("milk"), food => food.name), ["Milk", "Milky"]);
});

test("an unavailable correction request retains successful normal results", async () => {
  const app = createContext({ fetch: async value => {
    if (new URL(value).searchParams.get("search_terms") === "milkk") return response({ products: [product("12345678", "Milk")] });
    throw new Error("Service unavailable");
  } });
  assert.equal((await app.fetchOpenFoodFacts("milkk"))[0].name, "Milk");
});

test("request timeout aborts an upstream call that never responds", async () => {
  const app = createContext({ fetch: async (url, options) => new Promise((resolve, reject) => options.signal.addEventListener("abort", () => reject(new Error("aborted")))) });
  await assert.rejects(app.fetchOpenFoodFactsJson("https://world.openfoodfacts.org/", 5), /too long/);
});

test("a fully failed API search reports failure instead of a false empty success", async () => {
  const app = createContext({ fetch: async () => { throw new Error("Network unavailable"); } });
  await assert.rejects(app.fetchOpenFoodFacts("milk"), /Network unavailable/);
});

test("normal searches with enough matches skip the extra fuzzy API requests", async () => {
  let calls = 0;
  const app = createContext({ fetch: async () => {
    calls += 1;
    return response({ products: Array.from({ length: 10 }, (_, i) => product(String(12345678 + i), `Milk ${i}`)) });
  } });
  assert.equal((await app.fetchOpenFoodFacts("milk")).length, 10);
  assert.equal(calls, 1);
});

test("partial matches do not suppress a multiword typo correction", async () => {
  let corrections = 0;
  const app = createContext({ fetch: async value => {
    const query = new URL(value).searchParams.get("search_terms");
    if (query !== "chikcen breast") { corrections++; return response({ products: [] }); }
    return response({ products: Array.from({ length: 10 }, (_, i) => product(String(12345678 + i), `Turkey breast ${i}`)) });
  } });
  await app.fetchOpenFoodFacts("chikcen breast");
  assert.ok(corrections > 0);
});

test("dialogs block background clicks and background keyboard shortcuts", async () => {
  let closed = 0;
  let routes = 0;
  let selections = 0;
  let ingredientOpen = false;
  const app = createContext({
    document: { addEventListener() {}, getElementById: id => id === "ingredientResults" ? ingredientOpen : null },
    window: { matchMedia: () => ({ matches: false }) },
    els: { modalRoot: { classList: { contains: () => false }, contains: button => !!button.inModal } },
    closeModal: () => { closed += 1; },
    setRoute: () => { routes += 1; },
    activateKeyboardSelection: () => { selections += 1; },
    updateKeyboardSelection: () => { selections += 1; }
  });
  vm.runInContext(["handleClick", "handleKeyboardNavigation"].map(functionSource).join("\n"), app);
  app.state.route = "search";
  app.state.keyboardSelection = { search: 0, ingredient: 0 };
  await app.handleClick({ target: { closest: () => null } });
  await app.handleClick({ target: { closest: () => ({ dataset: { route: "today" }, closest: () => null }) } });
  app.handleKeyboardNavigation({ key: "Enter", target: { id: "amount" }, preventDefault() {} });
  ingredientOpen = true;
  app.handleKeyboardNavigation({ key: "Enter", target: { id: "unrelatedField" }, preventDefault() {} });
  assert.equal(closed, 0);
  assert.equal(routes, 0);
  assert.equal(selections, 0);
  app.handleKeyboardNavigation({ key: "Enter", target: { id: "ingredientSearchInput" }, defaultPrevented: true });
  assert.equal(selections, 0);
  app.handleKeyboardNavigation({ key: "Enter", target: { id: "ingredientSearchInput" }, preventDefault() {} });
  assert.equal(selections, 1);
  await app.handleClick({ target: { closest: () => ({ dataset: { action: "close-modal" }, inModal: true }) } });
  assert.equal(closed, 1);
});

test("information popups provide an explicit working Close button", async () => {
  let removed = 0;
  const popover = { style: {}, offsetWidth: 200, appendChild(button) { this.button = button; }, remove() { removed += 1; } };
  const app = createContext({
    document: {
      addEventListener() {}, querySelectorAll: () => [],
      createElement: tag => tag === "div" ? popover : { dataset: {} },
      body: { appendChild() {} }
    },
    window: { innerWidth: 1000 },
    els: { modalRoot: { classList: { contains: () => true } } }
  });
  vm.runInContext(["showInfoPopover", "handleClick"].map(functionSource).join("\n"), app);
  app.showInfoPopover({ dataset: { info: "Help text" }, getBoundingClientRect: () => ({ left: 20, bottom: 30 }) });
  assert.equal(popover.textContent, "Help text");
  assert.equal(popover.button.textContent, "Close");
  popover.button.closest = () => popover;
  await app.handleClick({ target: { closest: () => null } });
  assert.equal(removed, 0);
  await app.handleClick({ target: { closest: () => popover.button } });
  assert.equal(removed, 1);
});

test("signed-in food search uses the authenticated same-origin proxy", async () => {
  let calls = 0;
  const app = createContext({ fetch: async (url, options) => {
    calls++;
    assert.equal(url, "/api/food-search");
    assert.equal(options.headers.Authorization, "Bearer firebase-id-token");
    assert.equal(JSON.parse(options.body).query, "milk");
    return response({ products: [product("12345678", "Milk")] });
  } });
  app.state.user = { getIdToken: async () => "firebase-id-token" };
  assert.equal((await app.fetchOpenFoodFacts("milk"))[0].name, "Milk");
  assert.equal(calls, 1);
});

test("an expired proxy login is surfaced without retrying unrelated endpoints", async () => {
  let calls = 0;
  const app = createContext({ fetch: async () => {
    calls++;
    return { ok: false, status: 401, json: async () => ({ error: "Sign in again to search foods." }) };
  } });
  app.state.user = { getIdToken: async () => "expired" };
  await assert.rejects(app.fetchOpenFoodFacts("milk"), /Sign in again/);
  assert.equal(calls, 1);
});
