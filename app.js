import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  getDocs,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCJHwDxf-IZYu08gUkMk5HIns1jHKrLA3w",
  authDomain: "weight-track-app-e0e2c.firebaseapp.com",
  projectId: "weight-track-app-e0e2c",
  storageBucket: "weight-track-app-e0e2c.firebasestorage.app",
  messagingSenderId: "511648794081",
  appId: "1:511648794081:web:a930f0d7271c9ff73cbea0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const DEFAULT_SETTINGS = {
  calorieGoal: 2400,
  proteinGoal: 140,
  carbsGoal: 260,
  fatGoal: 70,
  fiberGoal: 35,
  sugarGoal: 80,
  sodiumMax: 2300,
  saltMax: 6,
  theme: "system",
  accent: "teal",
  searchRegion: "world",
  databasePreference: "openfoodfacts",
  modules: {
    barcode: true,
    recipes: true,
    mealsets: true,
    micronutrients: true,
    graphs: true
  }
};

const MEALS = [
  ["breakfast", "Breakfast"],
  ["lunch", "Lunch"],
  ["dinner", "Dinner"],
  ["snack", "Snack / Other"]
];

const NUTRIENT_LABELS = {
  kcal: "Calories",
  protein: "Protein",
  carbs: "Carbs",
  sugar: "Sugar",
  fat: "Fat",
  saturatedFat: "Saturated fat",
  fiber: "Fiber",
  salt: "Salt",
  sodium: "Sodium",
  calcium: "Calcium",
  iron: "Iron",
  potassium: "Potassium",
  magnesium: "Magnesium",
  vitaminA: "Vitamin A",
  vitaminC: "Vitamin C",
  vitaminD: "Vitamin D",
  vitaminB12: "Vitamin B12"
};

const NUTRIENT_UNITS = {
  kcal: "kcal",
  protein: "g",
  carbs: "g",
  sugar: "g",
  fat: "g",
  saturatedFat: "g",
  fiber: "g",
  salt: "g",
  sodium: "mg",
  calcium: "mg",
  iron: "mg",
  potassium: "mg",
  magnesium: "mg",
  vitaminA: "µg",
  vitaminC: "mg",
  vitaminD: "µg",
  vitaminB12: "µg"
};

const NUTRIENT_KEYS = Object.keys(NUTRIENT_LABELS);

const els = {
  authView: document.getElementById("authView"),
  appView: document.getElementById("appView"),
  authForm: document.getElementById("authForm"),
  emailInput: document.getElementById("emailInput"),
  passwordInput: document.getElementById("passwordInput"),
  signupBtn: document.getElementById("signupBtn"),
  signOutBtn: document.getElementById("signOutBtn"),
  authMessage: document.getElementById("authMessage"),
  pageTitle: document.getElementById("pageTitle"),
  themeToggle: document.getElementById("themeToggle"),
  modalRoot: document.getElementById("modalRoot"),
  toast: document.getElementById("toast"),
  pages: {
    today: document.getElementById("todayPage"),
    search: document.getElementById("searchPage"),
    recipes: document.getElementById("recipesPage"),
    reports: document.getElementById("reportsPage"),
    settings: document.getElementById("settingsPage")
  }
};

const state = {
  user: null,
  route: "today",
  currentDate: todayISO(),
  settings: structuredClone(DEFAULT_SETTINGS),
  logs: [],
  customFoods: [],
  recipes: [],
  mealsets: [],
  searchResults: [],
  reportEntries: [],
  tempFoods: new Map(),
  charts: {},
  unsubs: []
};

function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function addDaysISO(iso, days) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function currentWeekRange(baseISO = todayISO()) {
  const d = new Date(`${baseISO}T12:00:00`);
  const day = d.getDay() || 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - day + 1);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return [monday.toISOString().slice(0, 10), sunday.toISOString().slice(0, 10)];
}

function dateRange(startISO, endISO) {
  const dates = [];
  let d = startISO;
  while (d <= endISO) {
    dates.push(d);
    d = addDaysISO(d, 1);
    if (dates.length > 370) break;
  }
  return dates;
}

function userDoc(...segments) {
  return doc(db, "users", state.user.uid, ...segments);
}

function userCollection(...segments) {
  return collection(db, "users", state.user.uid, ...segments);
}

function entryCollection(dateISO = state.currentDate) {
  return collection(db, "users", state.user.uid, "dailyLogs", dateISO, "entries");
}

function entryDoc(entryId, dateISO = state.currentDate) {
  return doc(db, "users", state.user.uid, "dailyLogs", dateISO, "entries", entryId);
}

function safeText(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function number(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function round(value, decimals = 1) {
  const n = number(value);
  return Math.round(n * 10 ** decimals) / 10 ** decimals;
}

function cleanForFirestore(obj) {
  return JSON.parse(JSON.stringify(obj, (_, value) => {
    if (typeof value === "number" && !Number.isFinite(value)) return 0;
    return value === undefined ? null : value;
  }));
}

function emptyNutrients() {
  return Object.fromEntries(NUTRIENT_KEYS.map(k => [k, 0]));
}

function normalizeNutrients(nutrients = {}) {
  const out = emptyNutrients();
  for (const key of NUTRIENT_KEYS) out[key] = number(nutrients[key]);
  return out;
}

function addNutrients(items) {
  const total = emptyNutrients();
  for (const item of items) {
    const n = item.nutrientsSnapshot || item.totalNutrients || item.nutrients || item;
    for (const key of NUTRIENT_KEYS) total[key] += number(n?.[key]);
  }
  return total;
}

function scaleNutrients(nutrients, factor) {
  const out = emptyNutrients();
  for (const key of NUTRIENT_KEYS) out[key] = number(nutrients?.[key]) * number(factor);
  return out;
}

function macroCalories(n) {
  const protein = number(n.protein) * 4;
  const carbs = number(n.carbs) * 4;
  const fat = number(n.fat) * 9;
  const total = protein + carbs + fat;
  return {
    protein,
    carbs,
    fat,
    total,
    proteinPct: total ? protein / total * 100 : 0,
    carbsPct: total ? carbs / total * 100 : 0,
    fatPct: total ? fat / total * 100 : 0
  };
}

function gramsFromServingString(servingSize = "") {
  const match = String(servingSize).replace(",", ".").match(/([0-9]+(?:\.[0-9]+)?)\s*(g|ml)/i);
  return match ? number(match[1]) : null;
}

function displayFoodName(food) {
  const brand = food.brand ? ` (${food.brand})` : "";
  return `${food.name || "Unnamed food"}${brand}`;
}

function caloriesText(food) {
  const kcal100 = round(food.nutrientsPer100g?.kcal || 0, 0);
  const serving = food.defaultServing?.grams ? ` · ${round(kcal100 * food.defaultServing.grams / 100, 0)} kcal / ${food.defaultServing.label}` : "";
  return `${kcal100} kcal / 100 g${serving}`;
}

function registerTempFood(food) {
  const key = `${food.source}:${food.id || food.sourceId || crypto.randomUUID()}`;
  state.tempFoods.set(key, food);
  return key;
}

function getFoodByKey(key) {
  if (state.tempFoods.has(key)) return state.tempFoods.get(key);
  const [source, id] = String(key).split(":");
  if (source === "custom") return state.customFoods.find(f => f.id === id);
  return null;
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.remove("hidden");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.add("hidden"), 3200);
}

function showError(error, fallback = "Something went wrong.") {
  console.error(error);
  showToast(error?.message || fallback);
}

function setTheme() {
  const chosen = state.settings.theme || "system";
  const resolved = chosen === "system"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : chosen;
  document.documentElement.dataset.theme = resolved;
}

function setRoute(route) {
  state.route = route;
  Object.entries(els.pages).forEach(([key, page]) => page.classList.toggle("active", key === route));
  document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.route === route));
  const title = { today: "Today", search: "Search", recipes: "Recipes & Mealsets", reports: "Reports", settings: "Settings" }[route] || "NutriPilot";
  els.pageTitle.textContent = title;
  renderCurrentRoute();
}

function renderCurrentRoute() {
  if (!state.user) return;
  if (state.route === "today") renderToday();
  if (state.route === "search") renderSearch();
  if (state.route === "recipes") renderRecipes();
  if (state.route === "reports") renderReportsShell();
  if (state.route === "settings") renderSettings();
}

function subscribeUserData() {
  state.unsubs.forEach(unsub => unsub());
  state.unsubs = [];

  const settingsRef = userDoc("private", "settings");
  getDoc(settingsRef).then(snap => {
    if (!snap.exists()) setDoc(settingsRef, cleanForFirestore(DEFAULT_SETTINGS), { merge: true });
  });

  state.unsubs.push(onSnapshot(settingsRef, snap => {
    state.settings = { ...structuredClone(DEFAULT_SETTINGS), ...(snap.data() || {}) };
    state.settings.modules = { ...DEFAULT_SETTINGS.modules, ...(state.settings.modules || {}) };
    setTheme();
    renderCurrentRoute();
  }));

  state.unsubs.push(onSnapshot(userCollection("customFoods"), snap => {
    state.customFoods = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => displayFoodName(a).localeCompare(displayFoodName(b)));
    renderCurrentRoute();
  }));

  state.unsubs.push(onSnapshot(userCollection("recipes"), snap => {
    state.recipes = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    renderCurrentRoute();
  }));

  state.unsubs.push(onSnapshot(userCollection("mealsets"), snap => {
    state.mealsets = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    renderCurrentRoute();
  }));

  subscribeLogsForCurrentDate();
}

function subscribeLogsForCurrentDate() {
  if (state.unsubLogs) state.unsubLogs();
  state.unsubLogs = onSnapshot(entryCollection(state.currentDate), snap => {
    state.logs = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => number(a.createdAt) - number(b.createdAt));
    if (state.route === "today") renderToday();
  });
}

function nutrientSummaryHTML(n) {
  return `
    <div class="badges">
      <span class="badge orange">${round(n.kcal, 0)} kcal</span>
      <span class="badge">P ${round(n.protein)}g</span>
      <span class="badge">C ${round(n.carbs)}g</span>
      <span class="badge">F ${round(n.fat)}g</span>
      ${n.fiber ? `<span class="badge gray">Fiber ${round(n.fiber)}g</span>` : ""}
    </div>
  `;
}

function renderToday() {
  const total = addNutrients(state.logs);
  const goals = state.settings;
  const kcalPct = Math.min(100, goals.calorieGoal ? total.kcal / goals.calorieGoal * 100 : 0);
  const remaining = goals.calorieGoal - total.kcal;
  const macros = macroCalories(total);
  const circumference = 2 * Math.PI * 82;
  const offset = circumference - (kcalPct / 100) * circumference;

  els.pages.today.innerHTML = `
    <div class="stack">
      <div class="today-meta">
        <div class="date-control">
          <button class="tiny-btn" data-action="change-date" data-days="-1">‹</button>
          <input id="currentDateInput" type="date" value="${state.currentDate}" />
          <button class="tiny-btn" data-action="change-date" data-days="1">›</button>
        </div>
        <button class="secondary-btn" data-action="go-search">+ Add food</button>
        <button class="ghost-btn" data-action="repeat-yesterday">Repeat yesterday</button>
      </div>

      <div class="card dashboard-hero">
        <div class="ring-wrap" aria-label="Daily calories progress">
          <svg viewBox="0 0 200 200">
            <defs>
              <linearGradient id="ringGradient" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stop-color="#14b8a6" />
                <stop offset="55%" stop-color="#3b82f6" />
                <stop offset="100%" stop-color="#f97316" />
              </linearGradient>
            </defs>
            <circle class="ring-bg" cx="100" cy="100" r="82" fill="none" stroke-width="18" />
            <circle class="ring-progress" cx="100" cy="100" r="82" fill="none" stroke-width="18" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" />
          </svg>
          <div class="ring-center">
            <strong>${round(total.kcal, 0)}</strong>
            <span>/ ${round(goals.calorieGoal, 0)} kcal</span>
          </div>
        </div>
        <div>
          <span class="pill">${remaining >= 0 ? `${round(remaining, 0)} kcal remaining` : `${round(Math.abs(remaining), 0)} kcal over`}</span>
          <h3>Macro flight plan</h3>
          <div class="macro-grid">
            ${macroRow("Protein", total.protein, goals.proteinGoal, "fill-protein")}
            ${macroRow("Carbs", total.carbs, goals.carbsGoal, "fill-carbs")}
            ${macroRow("Fat", total.fat, goals.fatGoal, "fill-fat")}
            ${macroRow("Fiber", total.fiber, goals.fiberGoal, "fill-fiber")}
          </div>
        </div>
      </div>

      <div class="grid-4">
        ${metricCard("Macro calories", `${round(macros.proteinPct, 0)} / ${round(macros.carbsPct, 0)} / ${round(macros.fatPct, 0)}%`, "Protein / carbs / fat")}
        ${metricCard("Protein", `${round(total.protein)} g`, `${round(goals.proteinGoal - total.protein)} g left`)}
        ${metricCard("Sugar", `${round(total.sugar)} g`, `Goal ${round(goals.sugarGoal)} g`)}
        ${metricCard("Sodium", `${round(total.sodium, 0)} mg`, `Max ${round(goals.sodiumMax, 0)} mg`)}
      </div>

      <div class="meals-grid">
        ${MEALS.map(([id, label]) => renderMealCard(id, label)).join("")}
      </div>
    </div>
  `;

  document.getElementById("currentDateInput")?.addEventListener("change", e => {
    state.currentDate = e.target.value || todayISO();
    subscribeLogsForCurrentDate();
  });
}

function macroRow(label, value, goal, fillClass) {
  const pct = Math.min(100, goal ? value / goal * 100 : 0);
  return `
    <div class="macro-row">
      <span class="kicker">${label}</span>
      <div class="progress-track"><div class="progress-fill ${fillClass}" style="width:${pct}%"></div></div>
      <strong>${round(value)} / ${round(goal)} g</strong>
    </div>
  `;
}

function metricCard(label, value, caption) {
  return `<div class="metric-card"><span>${safeText(label)}</span><strong>${safeText(value)}</strong><small>${safeText(caption)}</small></div>`;
}

function renderMealCard(mealId, label) {
  const entries = state.logs.filter(entry => entry.meal === mealId);
  const total = addNutrients(entries);
  return `
    <article class="meal-card">
      <div class="meal-head">
        <div>
          <h3>${safeText(label)}</h3>
          <span>${round(total.kcal, 0)} kcal · ${entries.length} item${entries.length === 1 ? "" : "s"}</span>
        </div>
        <button class="tiny-btn" data-action="go-search" data-meal="${mealId}">+ Add</button>
      </div>
      <div class="food-list">
        ${entries.length ? entries.map(renderLogEntry).join("") : `<div class="empty-state">No food logged here yet.</div>`}
      </div>
    </article>
  `;
}

function renderLogEntry(entry) {
  const n = normalizeNutrients(entry.nutrientsSnapshot);
  return `
    <div class="food-entry">
      <div class="food-entry-head">
        <div>
          <strong>${safeText(entry.nameSnapshot)}</strong><br />
          <small>${round(entry.amount)} ${safeText(entry.unit)}${entry.gramsEquivalent ? ` · ${round(entry.gramsEquivalent)} g` : ""}</small>
        </div>
        <strong>${round(n.kcal, 0)} kcal</strong>
      </div>
      ${nutrientSummaryHTML(n)}
      <div class="entry-actions">
        <button class="tiny-btn" data-action="edit-entry" data-id="${entry.id}">Edit</button>
        <button class="tiny-btn" data-action="move-entry" data-id="${entry.id}">Move</button>
        <button class="tiny-btn" data-action="duplicate-entry" data-id="${entry.id}">Duplicate</button>
        <button class="tiny-btn" data-action="delete-entry" data-id="${entry.id}">Delete</button>
      </div>
    </div>
  `;
}

function renderSearch() {
  const customCards = state.customFoods.slice(0, 25).map(food => renderFoodResult(food, registerTempFood(food))).join("");
  els.pages.search.innerHTML = `
    <div class="stack">
      <div class="card">
        <h3>Find food</h3>
        <p>Search Open Food Facts for packaged/branded foods. Direct API use is free, but the results are crowd-sourced, so nutrition labels are still worth checking.</p>
        <div class="search-bar">
          <label>Food search
            <input id="foodSearchInput" type="search" placeholder="e.g. Skyr Milbona, oats, tofu" />
          </label>
          <button class="primary-btn" data-action="search-foods">Search</button>
          <button class="secondary-btn" data-action="open-barcode-modal">Barcode</button>
        </div>
      </div>

      <div class="grid-2">
        <div class="card stack">
          <div class="meal-head">
            <h3>Search results</h3>
            <span class="kicker">FOODNAME (BRAND) — kcal per 100 g</span>
          </div>
          <div id="searchResults" class="result-grid">
            ${state.searchResults.length ? state.searchResults.map(food => renderFoodResult(food, registerTempFood(food))).join("") : `<div class="empty-state">Search for a food or scan a barcode.</div>`}
          </div>
        </div>

        <div class="card stack">
          <h3>Create custom food</h3>
          <form id="customFoodForm" class="stack">
            <div class="form-grid two">
              <label>Name<input name="name" required placeholder="Greek yogurt" /></label>
              <label>Brand<input name="brand" placeholder="Optional" /></label>
              <label>Serving label<input name="servingLabel" value="100 g" /></label>
              <label>Serving grams<input name="servingGrams" type="number" step="0.1" min="0" value="100" /></label>
            </div>
            <div class="form-grid">
              ${["kcal", "protein", "carbs", "fat", "fiber", "sugar", "saturatedFat", "salt", "sodium"].map(key => `
                <label>${NUTRIENT_LABELS[key]} / 100 g
                  <input name="${key}" type="number" step="0.01" min="0" placeholder="0" />
                </label>
              `).join("")}
            </div>
            <details>
              <summary class="kicker">Optional micronutrients</summary>
              <div class="form-grid" style="margin-top:12px;">
                ${["calcium", "iron", "potassium", "magnesium", "vitaminA", "vitaminC", "vitaminD", "vitaminB12"].map(key => `
                  <label>${NUTRIENT_LABELS[key]} / 100 g
                    <input name="${key}" type="number" step="0.01" min="0" placeholder="0" />
                  </label>
                `).join("")}
              </div>
            </details>
            <div class="form-actions"><button class="primary-btn" type="submit">Save custom food</button></div>
          </form>
        </div>
      </div>

      <div class="card stack">
        <h3>Your custom foods</h3>
        <div class="result-grid">${customCards || `<div class="empty-state">No custom foods saved yet.</div>`}</div>
      </div>
    </div>
  `;

  document.getElementById("customFoodForm")?.addEventListener("submit", saveCustomFood);
}

function renderFoodResult(food, key) {
  const sourceLabel = food.source === "custom" ? "Custom" : food.source === "openfoodfacts" ? "Open Food Facts" : food.source;
  return `
    <div class="result-card">
      <div>
        <h4>${safeText(displayFoodName(food))}</h4>
        <p>${safeText(caloriesText(food))}</p>
        ${nutrientSummaryHTML(scaleNutrients(food.nutrientsPer100g, 1))}
        <div class="badges">
          <span class="badge gray">${safeText(sourceLabel)}</span>
          ${food.barcode ? `<span class="badge gray">${safeText(food.barcode)}</span>` : ""}
        </div>
      </div>
      <div class="inline-actions">
        <button class="primary-btn" data-action="log-food" data-key="${safeText(key)}">Log</button>
        ${food.source === "custom" ? `<button class="tiny-btn" data-action="delete-custom-food" data-id="${food.id}">Delete</button>` : `<button class="tiny-btn" data-action="save-api-food" data-key="${safeText(key)}">Save</button>`}
      </div>
    </div>
  `;
}

async function searchOpenFoodFacts(queryText) {
  const queryTextTrimmed = queryText.trim();
  if (!queryTextTrimmed) return;
  const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
  url.searchParams.set("search_terms", queryTextTrimmed);
  url.searchParams.set("search_simple", "1");
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "1");
  url.searchParams.set("page_size", "20");
  url.searchParams.set("fields", "code,product_name,brands,nutriments,serving_size,serving_quantity,quantity");

  showToast("Searching Open Food Facts…");
  const res = await fetch(url.toString(), { headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error("Open Food Facts search failed.");
  const data = await res.json();
  state.searchResults = (data.products || [])
    .map(normalizeOpenFoodFactsProduct)
    .filter(Boolean)
    .filter(food => food.nutrientsPer100g.kcal > 0)
    .slice(0, 20);
  renderSearch();
}

async function getOpenFoodFactsByBarcode(barcode) {
  const cleanBarcode = String(barcode || "").replace(/\D/g, "");
  if (!cleanBarcode) throw new Error("Enter a barcode first.");
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(cleanBarcode)}.json`;
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error("Barcode lookup failed.");
  const data = await res.json();
  if (!data.product) throw new Error("No product found for this barcode.");
  const food = normalizeOpenFoodFactsProduct(data.product);
  if (!food) throw new Error("Product found, but nutrition data is incomplete.");
  state.searchResults = [food, ...state.searchResults.filter(f => f.barcode !== food.barcode)].slice(0, 20);
  renderSearch();
  showToast(`Found ${displayFoodName(food)}.`);
}

function normalizeOpenFoodFactsProduct(product) {
  const nutriments = product.nutriments || {};
  const name = product.product_name || product.generic_name || product.abbreviated_product_name;
  if (!name) return null;
  const servingGrams = number(product.serving_quantity) || gramsFromServingString(product.serving_size);
  const defaultServing = servingGrams ? { label: product.serving_size || `${servingGrams} g`, grams: servingGrams } : null;
  return {
    id: product.code || crypto.randomUUID(),
    source: "openfoodfacts",
    sourceId: product.code || null,
    barcode: product.code || null,
    name: String(name).trim(),
    brand: String(product.brands || "").split(",")[0].trim() || null,
    defaultServing,
    servingOptions: defaultServing ? [defaultServing] : [],
    nutrientsPer100g: normalizeNutrients({
      kcal: nutriments["energy-kcal_100g"] ?? nutriments["energy-kcal"] ?? nutriments["energy_100g"] / 4.184,
      protein: nutriments.proteins_100g,
      carbs: nutriments.carbohydrates_100g,
      sugar: nutriments.sugars_100g,
      fat: nutriments.fat_100g,
      saturatedFat: nutriments["saturated-fat_100g"],
      fiber: nutriments.fiber_100g,
      salt: nutriments.salt_100g,
      sodium: nutriments.sodium_100g ? number(nutriments.sodium_100g) * 1000 : 0,
      calcium: nutriments.calcium_100g ? number(nutriments.calcium_100g) * 1000 : 0,
      iron: nutriments.iron_100g ? number(nutriments.iron_100g) * 1000 : 0,
      potassium: nutriments.potassium_100g ? number(nutriments.potassium_100g) * 1000 : 0,
      magnesium: nutriments.magnesium_100g ? number(nutriments.magnesium_100g) * 1000 : 0,
      vitaminA: nutriments["vitamin-a_100g"] ? number(nutriments["vitamin-a_100g"]) * 1_000_000 : 0,
      vitaminC: nutriments["vitamin-c_100g"] ? number(nutriments["vitamin-c_100g"]) * 1000 : 0,
      vitaminD: nutriments["vitamin-d_100g"] ? number(nutriments["vitamin-d_100g"]) * 1_000_000 : 0,
      vitaminB12: nutriments["vitamin-b12_100g"] ? number(nutriments["vitamin-b12_100g"]) * 1_000_000 : 0
    })
  };
}

async function saveCustomFood(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const name = String(data.get("name") || "").trim();
  if (!name) return;
  const servingGrams = number(data.get("servingGrams"), 100) || 100;
  const nutrientsPer100g = normalizeNutrients(Object.fromEntries(NUTRIENT_KEYS.map(k => [k, data.get(k)])));
  const food = {
    source: "custom",
    name,
    nameLower: name.toLowerCase(),
    brand: String(data.get("brand") || "").trim() || null,
    defaultServing: {
      label: String(data.get("servingLabel") || `${servingGrams} g`).trim(),
      grams: servingGrams
    },
    servingOptions: [{ label: String(data.get("servingLabel") || `${servingGrams} g`).trim(), grams: servingGrams }],
    nutrientsPer100g,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  await addDoc(userCollection("customFoods"), cleanForFirestore(food));
  form.reset();
  showToast("Custom food saved.");
}

async function saveApiFoodAsCustom(key) {
  const food = getFoodByKey(key);
  if (!food) return;
  const copy = {
    ...food,
    source: "custom",
    originalSource: food.source,
    nameLower: food.name.toLowerCase(),
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  delete copy.id;
  await addDoc(userCollection("customFoods"), cleanForFirestore(copy));
  showToast("Saved to your custom foods.");
}

function openLogFoodModal(food) {
  if (!food) return;
  const servingOptions = [{ label: "grams", grams: 1, mode: "grams" }, ...(food.servingOptions || []).map(s => ({ ...s, mode: "serving" }))];
  openModal(`
    <div class="modal">
      <div class="modal-head"><h3>Log ${safeText(displayFoodName(food))}</h3><button class="close-btn" data-action="close-modal">×</button></div>
      <form id="logFoodForm" class="modal-body">
        <div class="form-grid two">
          <label>Amount<input name="amount" type="number" step="0.01" min="0" value="${food.defaultServing?.grams ? 1 : 100}" required /></label>
          <label>Unit
            <select name="unitIndex">
              ${servingOptions.map((s, idx) => `<option value="${idx}">${safeText(s.mode === "grams" ? "grams" : s.label)}</option>`).join("")}
            </select>
          </label>
          <label>Meal
            <select name="meal">${MEALS.map(([id, label]) => `<option value="${id}">${label}</option>`).join("")}</select>
          </label>
          <label>Date<input name="date" type="date" value="${state.currentDate}" /></label>
        </div>
        <p class="kicker">${safeText(caloriesText(food))}</p>
        <div class="form-actions"><button class="primary-btn" type="submit">Add to day</button></div>
      </form>
    </div>
  `);
  document.getElementById("logFoodForm").addEventListener("submit", async event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const amount = number(data.get("amount"));
    const selected = servingOptions[number(data.get("unitIndex"))] || servingOptions[0];
    const grams = selected.mode === "grams" ? amount : amount * number(selected.grams);
    await logFood(food, amount, selected.mode === "grams" ? "g" : selected.label, grams, data.get("meal"), data.get("date"));
    closeModal();
  });
}

async function logFood(food, amount, unit, grams, meal, dateISO) {
  const nutrientsSnapshot = scaleNutrients(food.nutrientsPer100g, grams / 100);
  const entry = {
    itemType: "food",
    itemId: food.id || food.sourceId || null,
    source: food.source,
    nameSnapshot: displayFoodName(food),
    brandSnapshot: food.brand || null,
    amount,
    unit,
    gramsEquivalent: grams,
    meal,
    date: dateISO,
    nutrientsSnapshot,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  await addDoc(entryCollection(dateISO), cleanForFirestore(entry));
  showToast("Food logged.");
}

function renderRecipes() {
  els.pages.recipes.innerHTML = `
    <div class="grid-2">
      <div class="card stack">
        <div class="meal-head">
          <h3>Recipes</h3>
          <button class="primary-btn" data-action="create-recipe">+ Recipe</button>
        </div>
        <p>Recipes split a batch into portions. Logging stores a nutrition snapshot so old days stay stable even if you edit later.</p>
        <div class="result-grid">${state.recipes.length ? state.recipes.map(renderRecipeCard).join("") : `<div class="empty-state">No recipes yet.</div>`}</div>
      </div>

      <div class="card stack">
        <div class="meal-head">
          <h3>Mealsets</h3>
          <button class="primary-btn" data-action="create-mealset">+ Mealset</button>
        </div>
        <p>Mealsets are reusable full meals. One mealset equals one complete meal.</p>
        <div class="result-grid">${state.mealsets.length ? state.mealsets.map(renderMealsetCard).join("") : `<div class="empty-state">No mealsets yet.</div>`}</div>
      </div>
    </div>
  `;
}

function renderRecipeCard(recipe) {
  const perPortion = normalizeNutrients(recipe.nutrientsPerPortion || scaleNutrients(recipe.totalNutrients, 1 / Math.max(1, recipe.portions || 1)));
  const macro = macroCalories(perPortion);
  return `
    <div class="result-card">
      <div>
        <h4>${safeText(recipe.name)}</h4>
        <p>${recipe.portions || 1} portions · ${round(perPortion.kcal, 0)} kcal / portion · Macro split ${round(macro.proteinPct, 0)} / ${round(macro.carbsPct, 0)} / ${round(macro.fatPct, 0)}%</p>
        ${nutrientSummaryHTML(perPortion)}
        <details>
          <summary class="kicker">Ingredients (${recipe.ingredients?.length || 0})</summary>
          <ul>${(recipe.ingredients || []).map(i => `<li>${safeText(i.nameSnapshot)} — ${round(i.grams)} g, ${round(i.nutrientsSnapshot?.kcal, 0)} kcal</li>`).join("") || "<li>No ingredients yet.</li>"}</ul>
        </details>
      </div>
      <div class="inline-actions">
        <button class="primary-btn" data-action="log-recipe" data-id="${recipe.id}">Log</button>
        <button class="tiny-btn" data-action="add-ingredient" data-kind="recipe" data-id="${recipe.id}">Ingredient</button>
        <button class="tiny-btn" data-action="delete-recipe" data-id="${recipe.id}">Delete</button>
      </div>
    </div>
  `;
}

function renderMealsetCard(mealset) {
  const total = normalizeNutrients(mealset.totalNutrients);
  const macro = macroCalories(total);
  return `
    <div class="result-card">
      <div>
        <h4>${safeText(mealset.name)}</h4>
        <p>Full meal · ${round(total.kcal, 0)} kcal · Macro split ${round(macro.proteinPct, 0)} / ${round(macro.carbsPct, 0)} / ${round(macro.fatPct, 0)}%</p>
        ${nutrientSummaryHTML(total)}
        <details>
          <summary class="kicker">Items (${mealset.items?.length || 0})</summary>
          <ul>${(mealset.items || []).map(i => `<li>${safeText(i.nameSnapshot)} — ${round(i.grams || 0)} g, ${round(i.nutrientsSnapshot?.kcal, 0)} kcal</li>`).join("") || "<li>No items yet.</li>"}</ul>
        </details>
      </div>
      <div class="inline-actions">
        <button class="primary-btn" data-action="log-mealset" data-id="${mealset.id}">Log</button>
        <button class="tiny-btn" data-action="add-ingredient" data-kind="mealset" data-id="${mealset.id}">Item</button>
        <button class="tiny-btn" data-action="delete-mealset" data-id="${mealset.id}">Delete</button>
      </div>
    </div>
  `;
}

async function createRecipe() {
  openModal(`
    <div class="modal">
      <div class="modal-head"><h3>Create recipe</h3><button class="close-btn" data-action="close-modal">×</button></div>
      <form id="createRecipeForm" class="modal-body">
        <label>Name<input name="name" required placeholder="Protein oats" /></label>
        <label>Portions<input name="portions" type="number" step="0.1" min="0.1" value="1" required /></label>
        <div class="form-actions"><button class="primary-btn" type="submit">Create</button></div>
      </form>
    </div>
  `);
  document.getElementById("createRecipeForm").addEventListener("submit", async event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const recipe = {
      name: String(data.get("name") || "").trim(),
      portions: number(data.get("portions"), 1),
      ingredients: [],
      totalNutrients: emptyNutrients(),
      nutrientsPerPortion: emptyNutrients(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await addDoc(userCollection("recipes"), cleanForFirestore(recipe));
    closeModal();
    showToast("Recipe created. Add ingredients next.");
  });
}

async function createMealset() {
  openModal(`
    <div class="modal">
      <div class="modal-head"><h3>Create mealset</h3><button class="close-btn" data-action="close-modal">×</button></div>
      <form id="createMealsetForm" class="modal-body">
        <label>Name<input name="name" required placeholder="Post-workout meal" /></label>
        <div class="form-actions"><button class="primary-btn" type="submit">Create</button></div>
      </form>
    </div>
  `);
  document.getElementById("createMealsetForm").addEventListener("submit", async event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const mealset = {
      name: String(data.get("name") || "").trim(),
      items: [],
      totalNutrients: emptyNutrients(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await addDoc(userCollection("mealsets"), cleanForFirestore(mealset));
    closeModal();
    showToast("Mealset created. Add items next.");
  });
}

function openIngredientModal(kind, id) {
  const target = kind === "recipe" ? state.recipes.find(r => r.id === id) : state.mealsets.find(m => m.id === id);
  if (!target) return;
  openModal(`
    <div class="modal">
      <div class="modal-head"><h3>Add ${kind === "recipe" ? "ingredient" : "item"} to ${safeText(target.name)}</h3><button class="close-btn" data-action="close-modal">×</button></div>
      <div class="modal-body">
        <div class="search-bar">
          <label>Search<input id="ingredientSearchInput" type="search" placeholder="Search API or your custom foods" /></label>
          <button class="primary-btn" data-action="ingredient-search" data-kind="${kind}" data-id="${id}">Search</button>
          <button class="secondary-btn" data-action="show-custom-ingredients" data-kind="${kind}" data-id="${id}">Your foods</button>
        </div>
        <div id="ingredientResults" class="result-grid">
          ${state.customFoods.slice(0, 12).map(food => renderIngredientResult(food, registerTempFood(food), kind, id)).join("") || `<div class="empty-state">Create a custom food first or search Open Food Facts.</div>`}
        </div>
      </div>
    </div>
  `);
}

function renderIngredientResult(food, key, kind, id) {
  return `
    <div class="result-card">
      <div>
        <h4>${safeText(displayFoodName(food))}</h4>
        <p>${safeText(caloriesText(food))}</p>
      </div>
      <button class="primary-btn" data-action="select-ingredient" data-key="${safeText(key)}" data-kind="${kind}" data-id="${id}">Add</button>
    </div>
  `;
}

function openIngredientAmountModal(food, kind, id) {
  openModal(`
    <div class="modal">
      <div class="modal-head"><h3>Add ${safeText(displayFoodName(food))}</h3><button class="close-btn" data-action="close-modal">×</button></div>
      <form id="ingredientAmountForm" class="modal-body">
        <label>Amount in grams<input name="grams" type="number" step="0.1" min="0" value="100" required /></label>
        <div class="form-actions"><button class="primary-btn" type="submit">Add</button></div>
      </form>
    </div>
  `);
  document.getElementById("ingredientAmountForm").addEventListener("submit", async event => {
    event.preventDefault();
    const grams = number(new FormData(event.currentTarget).get("grams"));
    await addIngredientToTarget(food, grams, kind, id);
    closeModal();
  });
}

async function addIngredientToTarget(food, grams, kind, id) {
  const nutrientsSnapshot = scaleNutrients(food.nutrientsPer100g, grams / 100);
  const ingredient = {
    itemType: "food",
    source: food.source,
    itemId: food.id || food.sourceId || null,
    nameSnapshot: displayFoodName(food),
    brandSnapshot: food.brand || null,
    grams,
    amount: grams,
    unit: "g",
    nutrientsSnapshot,
    createdAt: Date.now()
  };

  if (kind === "recipe") {
    const recipe = state.recipes.find(r => r.id === id);
    const ingredients = [...(recipe.ingredients || []), ingredient];
    const totalNutrients = addNutrients(ingredients);
    const nutrientsPerPortion = scaleNutrients(totalNutrients, 1 / Math.max(1, number(recipe.portions, 1)));
    await updateDoc(userDoc("recipes", id), cleanForFirestore({ ingredients, totalNutrients, nutrientsPerPortion, updatedAt: Date.now() }));
  } else {
    const mealset = state.mealsets.find(m => m.id === id);
    const items = [...(mealset.items || []), ingredient];
    const totalNutrients = addNutrients(items);
    await updateDoc(userDoc("mealsets", id), cleanForFirestore({ items, totalNutrients, updatedAt: Date.now() }));
  }
  showToast("Ingredient added.");
}

function openLogRecipeModal(recipe) {
  const perPortion = normalizeNutrients(recipe.nutrientsPerPortion);
  openModal(`
    <div class="modal">
      <div class="modal-head"><h3>Log ${safeText(recipe.name)}</h3><button class="close-btn" data-action="close-modal">×</button></div>
      <form id="logRecipeForm" class="modal-body">
        <div class="form-grid two">
          <label>Portions<input name="amount" type="number" step="0.1" min="0" value="1" required /></label>
          <label>Meal<select name="meal">${MEALS.map(([id, label]) => `<option value="${id}">${label}</option>`).join("")}</select></label>
          <label>Date<input name="date" type="date" value="${state.currentDate}" /></label>
        </div>
        ${nutrientSummaryHTML(perPortion)}
        <div class="form-actions"><button class="primary-btn" type="submit">Log recipe</button></div>
      </form>
    </div>
  `);
  document.getElementById("logRecipeForm").addEventListener("submit", async event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const amount = number(data.get("amount"), 1);
    const entry = {
      itemType: "recipe",
      itemId: recipe.id,
      nameSnapshot: recipe.name,
      amount,
      unit: "portion",
      meal: data.get("meal"),
      date: data.get("date"),
      nutrientsSnapshot: scaleNutrients(perPortion, amount),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await addDoc(entryCollection(data.get("date")), cleanForFirestore(entry));
    closeModal();
    showToast("Recipe logged.");
  });
}

function openLogMealsetModal(mealset) {
  const total = normalizeNutrients(mealset.totalNutrients);
  openModal(`
    <div class="modal">
      <div class="modal-head"><h3>Log ${safeText(mealset.name)}</h3><button class="close-btn" data-action="close-modal">×</button></div>
      <form id="logMealsetForm" class="modal-body">
        <div class="form-grid two">
          <label>Quantity<input name="amount" type="number" step="0.1" min="0" value="1" required /></label>
          <label>Meal<select name="meal">${MEALS.map(([id, label]) => `<option value="${id}">${label}</option>`).join("")}</select></label>
          <label>Date<input name="date" type="date" value="${state.currentDate}" /></label>
        </div>
        ${nutrientSummaryHTML(total)}
        <div class="form-actions"><button class="primary-btn" type="submit">Log mealset</button></div>
      </form>
    </div>
  `);
  document.getElementById("logMealsetForm").addEventListener("submit", async event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const amount = number(data.get("amount"), 1);
    const entry = {
      itemType: "mealset",
      itemId: mealset.id,
      nameSnapshot: mealset.name,
      amount,
      unit: "mealset",
      meal: data.get("meal"),
      date: data.get("date"),
      nutrientsSnapshot: scaleNutrients(total, amount),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await addDoc(entryCollection(data.get("date")), cleanForFirestore(entry));
    closeModal();
    showToast("Mealset logged.");
  });
}

function renderReportsShell() {
  const [start, end] = currentWeekRange(state.currentDate);
  els.pages.reports.innerHTML = `
    <div class="stack">
      <div class="card">
        <h3>Reports</h3>
        <div class="form-grid two">
          <label>Start<input id="reportStart" type="date" value="${start}" /></label>
          <label>End<input id="reportEnd" type="date" value="${end}" /></label>
        </div>
        <div class="form-actions" style="margin-top:12px;">
          <button class="primary-btn" data-action="load-report">Load report</button>
          <button class="secondary-btn" data-action="export-full-csv">Export full CSV</button>
          <button class="secondary-btn" data-action="export-calories-csv">Export calories CSV</button>
          <button class="ghost-btn" data-action="export-calories-json">Export calories JSON</button>
        </div>
      </div>
      <div id="reportOutput" class="stack">
        <div class="empty-state">Load a report to see weekly calories, macros, micronutrients and food frequency.</div>
      </div>
    </div>
  `;
}

async function loadReport() {
  const start = document.getElementById("reportStart")?.value;
  const end = document.getElementById("reportEnd")?.value;
  if (!start || !end || start > end) throw new Error("Choose a valid date range.");
  showToast("Loading report…");
  const entries = [];
  for (const dateISO of dateRange(start, end)) {
    const snap = await getDocs(entryCollection(dateISO));
    snap.docs.forEach(d => entries.push({ id: d.id, ...d.data(), date: dateISO }));
  }
  state.reportEntries = entries;
  renderReportOutput(start, end, entries);
}

function renderReportOutput(start, end, entries) {
  const days = Math.max(1, dateRange(start, end).length);
  const total = addNutrients(entries);
  const avg = scaleNutrients(total, 1 / days);
  const macro = macroCalories(total);
  const byDate = Object.fromEntries(dateRange(start, end).map(d => [d, emptyNutrients()]));
  for (const entry of entries) byDate[entry.date] = addNutrients([{ nutrientsSnapshot: byDate[entry.date] }, entry]);
  const foodRows = foodFrequencyRows(entries);
  const output = document.getElementById("reportOutput");
  output.innerHTML = `
    <div class="grid-4">
      ${metricCard("Average kcal/day", `${round(avg.kcal, 0)}`, `${round(total.kcal, 0)} kcal total`)}
      ${metricCard("Average protein", `${round(avg.protein)} g`, `${round(total.protein)} g total`)}
      ${metricCard("Macro split", `${round(macro.proteinPct, 0)} / ${round(macro.carbsPct, 0)} / ${round(macro.fatPct, 0)}%`, "Protein / carbs / fat")}
      ${metricCard("Weekly difference", `${round(total.kcal - state.settings.calorieGoal * days, 0)} kcal`, `vs ${round(state.settings.calorieGoal * days, 0)} kcal goal`)}
    </div>

    <div class="grid-2">
      <div class="card chart-card">
        <h3>Daily calories</h3>
        <canvas id="calorieChart"></canvas>
      </div>
      <div class="card chart-card">
        <h3>Macros per day</h3>
        <canvas id="macroChart"></canvas>
      </div>
    </div>

    <div class="card">
      <h3>Food frequency</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Food</th><th>Times</th><th>Total amount</th><th>Total kcal</th><th>Avg kcal/day</th></tr></thead>
          <tbody>${foodRows.length ? foodRows.map(row => `<tr><td>${safeText(row.name)}</td><td>${row.count}</td><td>${round(row.grams)} g</td><td>${round(row.kcal, 0)}</td><td>${round(row.kcal / days, 0)}</td></tr>`).join("") : `<tr><td colspan="5">No entries in this range.</td></tr>`}</tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <h3>Micronutrients and limits</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Nutrient</th><th>Consumed</th><th>Weekly target / max</th><th>Difference</th></tr></thead>
          <tbody>${renderMicroRows(total, days)}</tbody>
        </table>
      </div>
    </div>
  `;
  renderCharts(byDate);
}

function foodFrequencyRows(entries) {
  const map = new Map();
  for (const entry of entries) {
    const key = entry.nameSnapshot || "Unnamed";
    const current = map.get(key) || { name: key, count: 0, grams: 0, kcal: 0 };
    current.count += 1;
    current.grams += number(entry.gramsEquivalent || (entry.unit === "g" ? entry.amount : 0));
    current.kcal += number(entry.nutrientsSnapshot?.kcal);
    map.set(key, current);
  }
  return [...map.values()].sort((a, b) => b.kcal - a.kcal);
}

function renderMicroRows(total, days) {
  const rows = [
    ["fiber", state.settings.fiberGoal * days, "goal"],
    ["sugar", state.settings.sugarGoal * days, "goal"],
    ["sodium", state.settings.sodiumMax * days, "max"],
    ["salt", state.settings.saltMax * days, "max"],
    ["calcium", 1000 * days, "goal"],
    ["iron", 14 * days, "goal"],
    ["potassium", 3500 * days, "goal"],
    ["magnesium", 350 * days, "goal"],
    ["vitaminC", 95 * days, "goal"],
    ["vitaminD", 20 * days, "goal"],
    ["vitaminB12", 4 * days, "goal"]
  ];
  return rows.map(([key, target, mode]) => {
    const consumed = number(total[key]);
    const diff = consumed - target;
    const unit = NUTRIENT_UNITS[key];
    const badgeClass = mode === "max" ? (diff > 0 ? "orange" : "") : (diff >= 0 ? "" : "orange");
    return `<tr><td>${NUTRIENT_LABELS[key]}</td><td>${round(consumed, key === "sodium" ? 0 : 1)} ${unit}</td><td>${round(target, key === "sodium" ? 0 : 1)} ${unit} ${mode}</td><td><span class="badge ${badgeClass}">${diff >= 0 ? "+" : ""}${round(diff, key === "sodium" ? 0 : 1)} ${unit}</span></td></tr>`;
  }).join("");
}

function renderCharts(byDate) {
  if (!window.Chart) return;
  Object.values(state.charts).forEach(chart => chart?.destroy?.());
  const labels = Object.keys(byDate);
  const kcal = labels.map(d => round(byDate[d].kcal, 0));
  const protein = labels.map(d => round(byDate[d].protein, 1));
  const carbs = labels.map(d => round(byDate[d].carbs, 1));
  const fat = labels.map(d => round(byDate[d].fat, 1));
  const calorieCtx = document.getElementById("calorieChart");
  const macroCtx = document.getElementById("macroChart");
  if (calorieCtx) {
    state.charts.calorie = new Chart(calorieCtx, {
      type: "line",
      data: { labels, datasets: [{ label: "kcal", data: kcal, tension: .35 }] },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
  if (macroCtx) {
    state.charts.macro = new Chart(macroCtx, {
      type: "bar",
      data: { labels, datasets: [{ label: "Protein", data: protein }, { label: "Carbs", data: carbs }, { label: "Fat", data: fat }] },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
}

async function exportEntries(format, caloriesOnly = false) {
  const start = document.getElementById("reportStart")?.value;
  const end = document.getElementById("reportEnd")?.value;
  if (!state.reportEntries.length) await loadReport();
  const entries = state.reportEntries;

  if (caloriesOnly) {
    const rows = dateRange(start, end).map(dateISO => {
      const total = addNutrients(entries.filter(e => e.date === dateISO));
      return { date: dateISO, totalKcal: round(total.kcal, 0) };
    });
    if (format === "json") {
      downloadFile(`nutripilot_calories_${start}_to_${end}.json`, JSON.stringify(rows, null, 2), "application/json");
    } else {
      const csv = ["date,total_kcal", ...rows.map(r => `${r.date},${r.totalKcal}`)].join("\n");
      downloadFile(`nutripilot_calories_${start}_to_${end}.csv`, csv, "text/csv");
    }
    return;
  }

  const header = ["date", "meal", "item_name", "brand", "amount", "unit", "grams", "kcal", "protein", "carbs", "sugar", "fat", "saturated_fat", "fiber", "salt", "sodium", "source"];
  const rows = entries.map(e => {
    const n = normalizeNutrients(e.nutrientsSnapshot);
    return [
      e.date, e.meal, e.nameSnapshot, e.brandSnapshot || "", e.amount, e.unit, e.gramsEquivalent || "",
      n.kcal, n.protein, n.carbs, n.sugar, n.fat, n.saturatedFat, n.fiber, n.salt, n.sodium, e.source || e.itemType
    ].map(csvCell).join(",");
  });
  downloadFile(`nutripilot_full_${start}_to_${end}.csv`, [header.join(","), ...rows].join("\n"), "text/csv");
}

function csvCell(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`Exported ${filename}.`);
}

function renderSettings() {
  const s = state.settings;
  els.pages.settings.innerHTML = `
    <form id="settingsForm" class="stack">
      <div class="card">
        <h3>Goals</h3>
        <div class="form-grid">
          <label>Calories / day<input name="calorieGoal" type="number" value="${s.calorieGoal}" /></label>
          <label>Protein g / day<input name="proteinGoal" type="number" value="${s.proteinGoal}" /></label>
          <label>Carbs g / day<input name="carbsGoal" type="number" value="${s.carbsGoal}" /></label>
          <label>Fat g / day<input name="fatGoal" type="number" value="${s.fatGoal}" /></label>
          <label>Fiber g / day<input name="fiberGoal" type="number" value="${s.fiberGoal}" /></label>
          <label>Sugar g / day<input name="sugarGoal" type="number" value="${s.sugarGoal}" /></label>
          <label>Sodium max mg / day<input name="sodiumMax" type="number" value="${s.sodiumMax}" /></label>
          <label>Salt max g / day<input name="saltMax" type="number" step="0.1" value="${s.saltMax}" /></label>
        </div>
      </div>

      <div class="card">
        <h3>Appearance and modules</h3>
        <div class="form-grid two">
          <label>Theme
            <select name="theme">
              ${["system", "light", "dark"].map(v => `<option value="${v}" ${s.theme === v ? "selected" : ""}>${v}</option>`).join("")}
            </select>
          </label>
          <label>Search region
            <select name="searchRegion">
              ${["world", "germany", "us", "france", "uk"].map(v => `<option value="${v}" ${s.searchRegion === v ? "selected" : ""}>${v}</option>`).join("")}
            </select>
          </label>
        </div>
        <div class="grid-3" style="margin-top:14px;">
          ${Object.entries(DEFAULT_SETTINGS.modules).map(([key]) => `
            <label><span>${key}</span><select name="module_${key}"><option value="true" ${s.modules[key] ? "selected" : ""}>Enabled</option><option value="false" ${!s.modules[key] ? "selected" : ""}>Disabled</option></select></label>
          `).join("")}
        </div>
      </div>

      <div class="card">
        <h3>Data</h3>
        <p>Your personal data is stored under <strong>users/{uid}</strong> in Firestore. Global API caching is skipped because this version avoids Cloud Functions/costs.</p>
        <div class="inline-actions">
          <button class="secondary-btn" type="button" data-action="go-reports">Open reports and exports</button>
        </div>
      </div>
      <div class="form-actions"><button class="primary-btn" type="submit">Save settings</button></div>
    </form>
  `;
  document.getElementById("settingsForm")?.addEventListener("submit", saveSettings);
}

async function saveSettings(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const next = {
    ...state.settings,
    calorieGoal: number(data.get("calorieGoal"), state.settings.calorieGoal),
    proteinGoal: number(data.get("proteinGoal"), state.settings.proteinGoal),
    carbsGoal: number(data.get("carbsGoal"), state.settings.carbsGoal),
    fatGoal: number(data.get("fatGoal"), state.settings.fatGoal),
    fiberGoal: number(data.get("fiberGoal"), state.settings.fiberGoal),
    sugarGoal: number(data.get("sugarGoal"), state.settings.sugarGoal),
    sodiumMax: number(data.get("sodiumMax"), state.settings.sodiumMax),
    saltMax: number(data.get("saltMax"), state.settings.saltMax),
    theme: String(data.get("theme") || "system"),
    searchRegion: String(data.get("searchRegion") || "world"),
    modules: { ...state.settings.modules }
  };
  Object.keys(next.modules).forEach(key => next.modules[key] = data.get(`module_${key}`) === "true");
  await setDoc(userDoc("private", "settings"), cleanForFirestore(next), { merge: true });
  showToast("Settings saved.");
}

function openBarcodeModal() {
  const canScan = "BarcodeDetector" in window && navigator.mediaDevices?.getUserMedia;
  openModal(`
    <div class="modal">
      <div class="modal-head"><h3>Barcode lookup</h3><button class="close-btn" data-action="close-modal">×</button></div>
      <div class="modal-body">
        <div class="form-grid two">
          <label>Barcode<input id="barcodeInput" inputmode="numeric" placeholder="e.g. 4008400401621" /></label>
          <label>&nbsp;<button class="primary-btn" data-action="lookup-barcode">Lookup barcode</button></label>
        </div>
        ${canScan ? `
          <div class="video-box"><video id="barcodeVideo" muted playsinline></video></div>
          <button class="secondary-btn" data-action="start-barcode-scan">Start camera scan</button>
        ` : `<div class="empty-state">Native barcode scanning is not available in this browser. Manual barcode lookup still works.</div>`}
      </div>
    </div>
  `);
}

async function startBarcodeScan() {
  if (!("BarcodeDetector" in window)) throw new Error("Barcode scanning is not supported in this browser.");
  const video = document.getElementById("barcodeVideo");
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
  video.srcObject = stream;
  await video.play();
  const detector = new BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"] });
  let stopped = false;
  const stop = () => {
    stopped = true;
    stream.getTracks().forEach(track => track.stop());
  };
  const scan = async () => {
    if (stopped || !video.isConnected) return stop();
    try {
      const codes = await detector.detect(video);
      if (codes.length) {
        const rawValue = codes[0].rawValue;
        stop();
        closeModal();
        await getOpenFoodFactsByBarcode(rawValue);
        setRoute("search");
        return;
      }
    } catch (error) {
      stop();
      throw error;
    }
    requestAnimationFrame(scan);
  };
  scan();
}

async function repeatYesterday() {
  const yesterday = addDaysISO(state.currentDate, -1);
  const snap = await getDocs(entryCollection(yesterday));
  const entries = snap.docs.map(d => d.data());
  if (!entries.length) throw new Error("Yesterday has no food entries.");
  for (const entry of entries) {
    const copy = { ...entry, date: state.currentDate, createdAt: Date.now(), updatedAt: Date.now() };
    await addDoc(entryCollection(state.currentDate), cleanForFirestore(copy));
  }
  showToast("Copied yesterday to this day.");
}

async function editEntry(id) {
  const entry = state.logs.find(e => e.id === id);
  if (!entry) return;
  openModal(`
    <div class="modal">
      <div class="modal-head"><h3>Edit entry</h3><button class="close-btn" data-action="close-modal">×</button></div>
      <form id="editEntryForm" class="modal-body">
        <label>Amount<input name="amount" type="number" step="0.01" min="0" value="${entry.amount}" required /></label>
        <label>Meal<select name="meal">${MEALS.map(([mid, label]) => `<option value="${mid}" ${entry.meal === mid ? "selected" : ""}>${label}</option>`).join("")}</select></label>
        <p class="kicker">For precise nutrition recalculation, delete and log again. This edit scales the existing snapshot proportionally.</p>
        <div class="form-actions"><button class="primary-btn" type="submit">Save</button></div>
      </form>
    </div>
  `);
  document.getElementById("editEntryForm").addEventListener("submit", async event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const newAmount = number(data.get("amount"), entry.amount);
    const factor = entry.amount ? newAmount / entry.amount : 1;
    await updateDoc(entryDoc(id), cleanForFirestore({
      amount: newAmount,
      gramsEquivalent: entry.gramsEquivalent ? entry.gramsEquivalent * factor : entry.gramsEquivalent,
      meal: data.get("meal"),
      nutrientsSnapshot: scaleNutrients(entry.nutrientsSnapshot, factor),
      updatedAt: Date.now()
    }));
    closeModal();
  });
}

async function moveEntry(id) {
  const entry = state.logs.find(e => e.id === id);
  if (!entry) return;
  const meal = prompt(`Move to meal: breakfast, lunch, dinner, snack`, entry.meal);
  if (!MEALS.some(([id]) => id === meal)) return;
  await updateDoc(entryDoc(id), { meal, updatedAt: Date.now() });
}

async function duplicateEntry(id) {
  const entry = state.logs.find(e => e.id === id);
  if (!entry) return;
  const copy = { ...entry, createdAt: Date.now(), updatedAt: Date.now() };
  delete copy.id;
  await addDoc(entryCollection(state.currentDate), cleanForFirestore(copy));
}

function openModal(html) {
  els.modalRoot.innerHTML = html;
  els.modalRoot.classList.remove("hidden");
}

function closeModal() {
  const video = document.getElementById("barcodeVideo");
  if (video?.srcObject) video.srcObject.getTracks().forEach(track => track.stop());
  els.modalRoot.classList.add("hidden");
  els.modalRoot.innerHTML = "";
}

async function handleClick(event) {
  const btn = event.target.closest("button");
  if (!btn) return;
  const route = btn.dataset.route;
  if (route) return setRoute(route);
  const action = btn.dataset.action;
  if (!action) return;

  try {
    if (action === "close-modal") closeModal();
    if (action === "go-search") setRoute("search");
    if (action === "go-reports") setRoute("reports");
    if (action === "change-date") {
      state.currentDate = addDaysISO(state.currentDate, number(btn.dataset.days));
      subscribeLogsForCurrentDate();
    }
    if (action === "repeat-yesterday") await repeatYesterday();
    if (action === "search-foods") await searchOpenFoodFacts(document.getElementById("foodSearchInput")?.value || "");
    if (action === "open-barcode-modal") openBarcodeModal();
    if (action === "lookup-barcode") {
      await getOpenFoodFactsByBarcode(document.getElementById("barcodeInput")?.value || "");
      closeModal();
      setRoute("search");
    }
    if (action === "start-barcode-scan") await startBarcodeScan();
    if (action === "log-food") openLogFoodModal(getFoodByKey(btn.dataset.key));
    if (action === "save-api-food") await saveApiFoodAsCustom(btn.dataset.key);
    if (action === "delete-custom-food") await deleteDoc(userDoc("customFoods", btn.dataset.id));
    if (action === "delete-entry") await deleteDoc(entryDoc(btn.dataset.id));
    if (action === "edit-entry") await editEntry(btn.dataset.id);
    if (action === "move-entry") await moveEntry(btn.dataset.id);
    if (action === "duplicate-entry") await duplicateEntry(btn.dataset.id);
    if (action === "create-recipe") await createRecipe();
    if (action === "create-mealset") await createMealset();
    if (action === "delete-recipe") await deleteDoc(userDoc("recipes", btn.dataset.id));
    if (action === "delete-mealset") await deleteDoc(userDoc("mealsets", btn.dataset.id));
    if (action === "add-ingredient") openIngredientModal(btn.dataset.kind, btn.dataset.id);
    if (action === "ingredient-search") {
      const query = document.getElementById("ingredientSearchInput")?.value || "";
      await searchOpenFoodFacts(query);
      const root = document.getElementById("ingredientResults");
      root.innerHTML = state.searchResults.map(food => renderIngredientResult(food, registerTempFood(food), btn.dataset.kind, btn.dataset.id)).join("") || `<div class="empty-state">No results.</div>`;
    }
    if (action === "show-custom-ingredients") {
      document.getElementById("ingredientResults").innerHTML = state.customFoods.map(food => renderIngredientResult(food, registerTempFood(food), btn.dataset.kind, btn.dataset.id)).join("") || `<div class="empty-state">No custom foods yet.</div>`;
    }
    if (action === "select-ingredient") openIngredientAmountModal(getFoodByKey(btn.dataset.key), btn.dataset.kind, btn.dataset.id);
    if (action === "log-recipe") openLogRecipeModal(state.recipes.find(r => r.id === btn.dataset.id));
    if (action === "log-mealset") openLogMealsetModal(state.mealsets.find(m => m.id === btn.dataset.id));
    if (action === "load-report") await loadReport();
    if (action === "export-full-csv") await exportEntries("csv", false);
    if (action === "export-calories-csv") await exportEntries("csv", true);
    if (action === "export-calories-json") await exportEntries("json", true);
  } catch (error) {
    showError(error);
  }
}

document.addEventListener("click", handleClick);

els.authForm.addEventListener("submit", async event => {
  event.preventDefault();
  try {
    els.authMessage.textContent = "";
    await signInWithEmailAndPassword(auth, els.emailInput.value, els.passwordInput.value);
  } catch (error) {
    els.authMessage.textContent = error.message;
  }
});

els.signupBtn.addEventListener("click", async () => {
  try {
    els.authMessage.textContent = "";
    const credential = await createUserWithEmailAndPassword(auth, els.emailInput.value, els.passwordInput.value);
    await setDoc(doc(db, "users", credential.user.uid, "private", "settings"), cleanForFirestore(DEFAULT_SETTINGS), { merge: true });
  } catch (error) {
    els.authMessage.textContent = error.message;
  }
});

els.signOutBtn.addEventListener("click", () => signOut(auth));
els.themeToggle.addEventListener("click", async () => {
  if (!state.user) return;
  const current = state.settings.theme || "system";
  const next = current === "dark" ? "light" : current === "light" ? "system" : "dark";
  await setDoc(userDoc("private", "settings"), { theme: next }, { merge: true });
});

onAuthStateChanged(auth, user => {
  state.user = user;
  els.authView.classList.toggle("hidden", !!user);
  els.appView.classList.toggle("hidden", !user);
  els.signOutBtn.classList.toggle("hidden", !user);
  if (user) {
    subscribeUserData();
    setRoute(state.route);
  } else {
    state.unsubs.forEach(unsub => unsub());
    if (state.unsubLogs) state.unsubLogs();
    state.logs = [];
    state.customFoods = [];
    state.recipes = [];
    state.mealsets = [];
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(console.warn));
}
