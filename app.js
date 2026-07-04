import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
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
  onSnapshot,
  enableIndexedDbPersistence
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
enableIndexedDbPersistence(db).catch(error => {
  console.warn("Firestore offline persistence unavailable:", error.code || error.message);
});

const APP_STORAGE_PREFIX = "nutripilot";
const SEARCH_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const MAX_RECENT_SEARCHES = 10;
const MAX_CACHED_SEARCHES = 40;
const SEARCH_PAGE_SIZE = 10;
const MICRO_DEFAULTS = {
  calcium: { target: 1000, mode: "min" },
  iron: { target: 14, mode: "min" },
  potassium: { target: 3500, mode: "min" },
  magnesium: { target: 350, mode: "min" },
  vitaminA: { target: 800, mode: "min" },
  vitaminC: { target: 95, mode: "min" },
  vitaminD: { target: 20, mode: "min" },
  vitaminB12: { target: 4, mode: "min" },
  sodium: { target: 2300, mode: "max" },
  salt: { target: 6, mode: "max" }
};

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
  databasePreference: "custom-first",
  dashboardDensity: "comfortable",
  macroGoalMode: "manual",
  macroPercentProtein: 25,
  macroPercentCarbs: 45,
  macroPercentFat: 30,
  nutrientVisibility: {
    sugar: true,
    fiber: true,
    sodium: true,
    saturatedFat: true,
    micronutrients: true
  },
  micronutrientGoals: MICRO_DEFAULTS,
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
  installBtn: document.getElementById("installBtn"),
  syncStatus: document.getElementById("syncStatus"),
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
  searchQuery: "",
  searchLoading: false,
  searchFeedback: "",
  recentSearches: [],
  searchFilters: {
    brand: "",
    source: "all",
    kcalMin: "",
    kcalMax: "",
    lowSugar: false
  },
  searchPage: 1,
  defaultLogMeal: "breakfast",
  defaultLogDate: todayISO(),
  reportEntries: [],
  reportRange: currentWeekRange(),
  reportMode: "week",
  reportBaseDate: todayISO(),
  tempFoods: new Map(),
  charts: {},
  unsubs: [],
  sync: {
    online: navigator.onLine,
    status: navigator.onLine ? "online" : "offline",
    fromCache: false,
    pendingWrites: false,
    lastSyncedAt: null,
    persistence: "requested"
  },
  installPrompt: null,
  settingsSaveTimer: null
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

function currentMonthRange(baseISO = todayISO()) {
  const d = new Date(`${baseISO}T12:00:00`);
  const start = new Date(d.getFullYear(), d.getMonth(), 1, 12);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 12);
  return [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)];
}

function currentYearRange(baseISO = todayISO()) {
  const d = new Date(`${baseISO}T12:00:00`);
  return [`${d.getFullYear()}-01-01`, `${d.getFullYear()}-12-31`];
}

function periodRange(mode = state.reportMode, baseISO = state.reportBaseDate || state.currentDate) {
  if (mode === "month") return currentMonthRange(baseISO);
  if (mode === "year") return currentYearRange(baseISO);
  return currentWeekRange(baseISO);
}

function shiftReportPeriod(direction) {
  const base = new Date(`${state.reportBaseDate || state.currentDate}T12:00:00`);
  if (state.reportMode === "month") base.setMonth(base.getMonth() + direction);
  else if (state.reportMode === "year") base.setFullYear(base.getFullYear() + direction);
  else base.setDate(base.getDate() + direction * 7);
  state.reportBaseDate = base.toISOString().slice(0, 10);
  state.reportRange = periodRange();
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

function userBasePath() {
  return ["apps", "food-tracker", "users", state.user.uid];
}

function userDoc(...segments) {
  return doc(db, ...userBasePath(), ...segments);
}

function userCollection(...segments) {
  return collection(db, ...userBasePath(), ...segments);
}

function entryCollection(dateISO = state.currentDate) {
  return collection(db, ...userBasePath(), "dailyLogs", dateISO, "entries");
}

function entryDoc(entryId, dateISO = state.currentDate) {
  return doc(db, ...userBasePath(), "dailyLogs", dateISO, "entries", entryId);
}

function dailyCaloriesDoc(dateISO = state.currentDate) {
  return doc(db, ...userBasePath(), "dailyCalories", dateISO);
}

function storageKey(name, uid = state.user?.uid || "guest") {
  return `${APP_STORAGE_PREFIX}:${uid}:${name}`;
}

function readLocal(name, fallback, uid = state.user?.uid) {
  try {
    const raw = localStorage.getItem(storageKey(name, uid));
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn("Could not read local cache", name, error);
    return fallback;
  }
}

function writeLocal(name, value, uid = state.user?.uid) {
  try {
    localStorage.setItem(storageKey(name, uid), JSON.stringify(value));
  } catch (error) {
    console.warn("Could not write local cache", name, error);
  }
}

function removeLocal(name, uid = state.user?.uid) {
  try {
    localStorage.removeItem(storageKey(name, uid));
  } catch (error) {
    console.warn("Could not clear local cache", name, error);
  }
}

function collectionFreshness(items = []) {
  return items.reduce((latest, item) => Math.max(latest, number(item.updatedAt), number(item.createdAt), number(item.lastUsedAt)), 0);
}

function hydrateUserCache(uid) {
  state.settings = mergeSettings(readLocal("settings", structuredClone(DEFAULT_SETTINGS), uid));
  state.customFoods = readLocal("customFoods", [], uid);
  state.recipes = readLocal("recipes", [], uid);
  state.mealsets = readLocal("mealsets", [], uid);
  state.logs = readLocal(`logs:${state.currentDate}`, [], uid);
  state.recentSearches = readLocal("recentSearches", [], uid);
  renderSyncStatus();
}

function mergeSettings(raw = {}) {
  const source = raw || {};
  const merged = { ...structuredClone(DEFAULT_SETTINGS), ...source };
  merged.modules = { ...DEFAULT_SETTINGS.modules, ...(source.modules || {}) };
  merged.nutrientVisibility = { ...DEFAULT_SETTINGS.nutrientVisibility, ...(source.nutrientVisibility || {}) };
  merged.micronutrientGoals = { ...structuredClone(MICRO_DEFAULTS), ...(source.micronutrientGoals || {}) };
  for (const key of Object.keys(MICRO_DEFAULTS)) {
    merged.micronutrientGoals[key] = { ...MICRO_DEFAULTS[key], ...(merged.micronutrientGoals[key] || {}) };
  }
  return merged;
}

function updateSyncStatus(partial = {}) {
  state.sync = { ...state.sync, ...partial, online: navigator.onLine };
  if (!state.sync.online) state.sync.status = "offline";
  else if (state.sync.pendingWrites) state.sync.status = "pending";
  else state.sync.status = "online";
  renderSyncStatus();
}

function noteSnapshotMetadata(metadata) {
  updateSyncStatus({
    fromCache: !!metadata?.fromCache,
    pendingWrites: !!metadata?.hasPendingWrites,
    lastSyncedAt: navigator.onLine && !metadata?.hasPendingWrites ? Date.now() : state.sync.lastSyncedAt
  });
}

function renderSyncStatus() {
  if (!els.syncStatus) return;
  const status = state.sync.status || (navigator.onLine ? "online" : "offline");
  const label = {
    online: "Synced",
    pending: "Syncing",
    offline: "Offline"
  }[status] || "Offline";
  els.syncStatus.className = `status-chip ${status}`;
  els.syncStatus.textContent = label;
  els.syncStatus.title = status === "online" && state.sync.lastSyncedAt
    ? `Last Firebase sync: ${new Date(state.sync.lastSyncedAt).toLocaleString()}`
    : status === "pending"
      ? "Firebase has local changes waiting to upload."
      : "Offline mode is only shown when the browser itself is offline.";
}

function markSearchStateSaved() {
  writeLocal("recentSearches", state.recentSearches);
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

async function updateDailyCalorieSummary(dateISO, entries = null) {
  if (!state.user || !dateISO) return;
  let summaryEntries = entries;
  if (!summaryEntries) {
    const snap = await getDocs(entryCollection(dateISO));
    summaryEntries = snap.docs.map(d => ({ id: d.id, ...d.data(), date: dateISO }));
  }
  const total = addNutrients(summaryEntries || []);
  const byMeal = Object.fromEntries(MEALS.map(([id]) => [id, 0]));
  for (const entry of summaryEntries || []) byMeal[entry.meal] = round(number(byMeal[entry.meal]) + number(entry.nutrientsSnapshot?.kcal), 0);
  await setDoc(dailyCaloriesDoc(dateISO), cleanForFirestore({
    date: dateISO,
    uid: state.user.uid,
    app: "NutriPilot",
    totalKcal: round(total.kcal, 0),
    protein: round(total.protein, 1),
    carbs: round(total.carbs, 1),
    fat: round(total.fat, 1),
    fiber: round(total.fiber, 1),
    meals: byMeal,
    itemCount: summaryEntries?.length || 0,
    updatedAt: Date.now()
  }), { merge: true });
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

function effectiveMacroGoals(settings = state.settings) {
  const calories = Math.max(1, number(settings.calorieGoal, DEFAULT_SETTINGS.calorieGoal));
  if (settings.macroGoalMode === "percent") {
    return {
      proteinGoal: calories * number(settings.macroPercentProtein, 25) / 100 / 4,
      carbsGoal: calories * number(settings.macroPercentCarbs, 45) / 100 / 4,
      fatGoal: calories * number(settings.macroPercentFat, 30) / 100 / 9
    };
  }
  if (settings.macroGoalMode === "protein-fixed") {
    const proteinGoal = number(settings.proteinGoal, DEFAULT_SETTINGS.proteinGoal);
    const remaining = Math.max(0, calories - proteinGoal * 4);
    return {
      proteinGoal,
      carbsGoal: remaining * .55 / 4,
      fatGoal: remaining * .45 / 9
    };
  }
  return {
    proteinGoal: number(settings.proteinGoal, DEFAULT_SETTINGS.proteinGoal),
    carbsGoal: number(settings.carbsGoal, DEFAULT_SETTINGS.carbsGoal),
    fatGoal: number(settings.fatGoal, DEFAULT_SETTINGS.fatGoal)
  };
}

function nutrientVisible(key) {
  if (key === "salt") return false;
  if (["calcium", "iron", "potassium", "magnesium", "vitaminA", "vitaminC", "vitaminD", "vitaminB12"].includes(key)) {
    return state.settings.modules.micronutrients && state.settings.nutrientVisibility.micronutrients !== false;
  }
  return state.settings.nutrientVisibility?.[key] !== false;
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

function servingUnits() {
  return ["g", "ml", "cup", "scoop", "piece", "package", "tablespoon", "teaspoon", "custom"];
}

function servingUnitSelectHTML(selected = "g") {
  return `
    <label>Serving unit
      <select name="servingUnit">
        ${servingUnits().map(unit => `<option value="${unit}" ${normalizeSearchText(selected) === unit ? "selected" : ""}>${unit}</option>`).join("")}
      </select>
    </label>
    <label class="custom-serving-field hidden">Custom serving unit
      <input name="customServingUnit" placeholder="Name of the serving unit" />
    </label>
  `;
}

function selectedServingUnit(data) {
  const chosen = String(data.get("servingUnit") || "g").trim();
  if (chosen === "custom") {
    return String(data.get("customServingUnit") || "custom serving").trim() || "custom serving";
  }
  return chosen;
}

function servingLabelFor(unit, grams) {
  return unit === "g" || unit === "ml" ? `${round(grams, 2)} ${unit}` : `1 ${unit}`;
}

function bindCustomServingUnit(form) {
  if (!form) return;
  const select = form.elements.servingUnit;
  const customField = form.querySelector(".custom-serving-field");
  const customInput = form.elements.customServingUnit;
  const update = () => {
    const isCustom = select?.value === "custom";
    customField?.classList.toggle("hidden", !isCustom);
    if (customInput) customInput.required = !!isCustom;
  };
  select?.addEventListener("change", update);
  update();
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
  document.body.dataset.density = state.settings.dashboardDensity || "comfortable";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolved === "dark" ? "#07111f" : "#f5f7fb");
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
  if (state.route === "search") renderSearchV2();
  if (state.route === "recipes") renderRecipes();
  if (state.route === "reports") renderReportsShell();
  if (state.route === "settings") renderSettingsV2();
}

function renderModuleDisabled(label) {
  els.pages[state.route].innerHTML = `
    <div class="card stack">
      <h3>${safeText(label)} disabled</h3>
      <p>Turn this module back on in Settings to use it again.</p>
      <div class="inline-actions"><button class="primary-btn" data-action="go-settings">Open settings</button></div>
    </div>
  `;
}

function subscribeUserData() {
  state.unsubs.forEach(unsub => unsub());
  state.unsubs = [];

  const settingsRef = userDoc("private", "settings");
  getDoc(settingsRef).then(snap => {
    if (!snap.exists()) setDoc(settingsRef, cleanForFirestore(DEFAULT_SETTINGS), { merge: true });
  }).catch(error => {
    console.warn("Settings preflight failed; using local settings.", error);
    updateSyncStatus({ fromCache: true });
  });

  state.unsubs.push(onSnapshot(settingsRef, { includeMetadataChanges: true }, snap => {
    noteSnapshotMetadata(snap.metadata);
    state.settings = mergeSettings(snap.data() || state.settings);
    writeLocal("settings", state.settings);
    setTheme();
    renderCurrentRoute();
  }, error => {
    console.warn("Settings snapshot failed; local cache remains active.", error);
    updateSyncStatus({ fromCache: true });
  }));

  state.unsubs.push(onSnapshot(userCollection("customFoods"), { includeMetadataChanges: true }, snap => {
    noteSnapshotMetadata(snap.metadata);
    state.customFoods = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => displayFoodName(a).localeCompare(displayFoodName(b)));
    writeLocal("customFoods", state.customFoods);
    renderCurrentRoute();
  }, error => {
    console.warn("Custom foods snapshot failed; local cache remains active.", error);
    updateSyncStatus({ fromCache: true });
  }));

  state.unsubs.push(onSnapshot(userCollection("recipes"), { includeMetadataChanges: true }, snap => {
    noteSnapshotMetadata(snap.metadata);
    state.recipes = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    writeLocal("recipes", state.recipes);
    renderCurrentRoute();
  }, error => {
    console.warn("Recipes snapshot failed; local cache remains active.", error);
    updateSyncStatus({ fromCache: true });
  }));

  state.unsubs.push(onSnapshot(userCollection("mealsets"), { includeMetadataChanges: true }, snap => {
    noteSnapshotMetadata(snap.metadata);
    state.mealsets = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    writeLocal("mealsets", state.mealsets);
    renderCurrentRoute();
  }, error => {
    console.warn("Mealsets snapshot failed; local cache remains active.", error);
    updateSyncStatus({ fromCache: true });
  }));

  subscribeLogsForCurrentDate();
}

function subscribeLogsForCurrentDate() {
  if (state.unsubLogs) state.unsubLogs();
  state.logs = readLocal(`logs:${state.currentDate}`, []);
  if (state.route === "today") renderToday();
  state.unsubLogs = onSnapshot(entryCollection(state.currentDate), { includeMetadataChanges: true }, snap => {
    noteSnapshotMetadata(snap.metadata);
    state.logs = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => number(a.createdAt) - number(b.createdAt));
    writeLocal(`logs:${state.currentDate}`, state.logs);
    if (!snap.metadata.hasPendingWrites) updateDailyCalorieSummary(state.currentDate, state.logs).catch(console.warn);
    if (state.route === "today") renderToday();
  }, error => {
    console.warn("Log snapshot failed; local cache remains active.", error);
    updateSyncStatus({ fromCache: true });
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
    </div>
  `;
}

function renderToday() {
  const total = addNutrients(state.logs);
  const goals = state.settings;
  const macroGoals = effectiveMacroGoals(goals);
  const kcalPct = Math.min(100, goals.calorieGoal ? total.kcal / goals.calorieGoal * 100 : 0);
  const remaining = goals.calorieGoal - total.kcal;
  const circumference = 2 * Math.PI * 82;
  const offset = circumference - (kcalPct / 100) * circumference;
  const macroRings = [
    macroCircleCard("Protein", total.protein, macroGoals.proteinGoal, "var(--protein)"),
    macroCircleCard("Carbs", total.carbs, macroGoals.carbsGoal, "var(--carbs)"),
    macroCircleCard("Fat", total.fat, macroGoals.fatGoal, "var(--fat)")
  ].join("");

  els.pages.today.innerHTML = `
    <div class="stack">
      <div class="today-meta">
        <div class="date-control">
          <button class="tiny-btn" data-action="change-date" data-days="-1" aria-label="Previous day">&lt;</button>
          <input id="currentDateInput" type="date" value="${state.currentDate}" />
          <button class="tiny-btn" data-action="change-date" data-days="1" aria-label="Next day">&gt;</button>
        </div>
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
            ${macroRow("Protein", total.protein, macroGoals.proteinGoal, "fill-protein")}
            ${macroRow("Carbs", total.carbs, macroGoals.carbsGoal, "fill-carbs")}
            ${macroRow("Fat", total.fat, macroGoals.fatGoal, "fill-fat")}
          </div>
        </div>
      </div>

      <div class="macro-circle-grid">
        ${macroRings}
      </div>

      <div class="meals-grid">
        ${MEALS.map(([id, label]) => renderMealCard(id, label)).join("")}
      </div>
    </div>
  `;

  document.getElementById("currentDateInput")?.addEventListener("change", e => {
    state.currentDate = e.target.value || todayISO();
    state.defaultLogDate = state.currentDate;
    subscribeLogsForCurrentDate();
  });
}

function macroCircleCard(label, value, goal, color) {
  const pct = Math.max(0, Math.min(100, goal ? value / goal * 100 : 0));
  const remaining = goal - value;
  return `
    <article class="macro-circle-card" style="--pct:${pct}%; --ring-color:${color};">
      <div class="macro-circle">
        <div>
          <strong>${round(value)}</strong>
          <span>g</span>
        </div>
      </div>
      <div>
        <h3>${safeText(label)}</h3>
        <p>${round(value)} / ${round(goal)} g</p>
        <small>${remaining >= 0 ? `${round(remaining)} g left` : `${round(Math.abs(remaining))} g over`}</small>
      </div>
    </article>
  `;
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
          <span>${round(total.kcal, 0)} kcal</span>
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

function normalizeSearchText(value) {
  return String(value || "").trim().toLowerCase();
}

function foodIdentity(food) {
  return normalizeSearchText(food.barcode || food.sourceId || `${food.name}|${food.brand || ""}`);
}

function findPersonalFoodMatch(food) {
  const id = foodIdentity(food);
  return state.customFoods.find(candidate => foodIdentity(candidate) === id)
    || state.customFoods.find(candidate => normalizeSearchText(candidate.name) === normalizeSearchText(food.name)
      && normalizeSearchText(candidate.brand) === normalizeSearchText(food.brand));
}

function searchPersonalLibrary(queryText) {
  const query = normalizeSearchText(queryText);
  const tokens = query.split(/\s+/).filter(Boolean);
  const foods = [...state.customFoods].sort((a, b) => {
    const favoriteDiff = Number(!!b.favorite) - Number(!!a.favorite);
    if (favoriteDiff) return favoriteDiff;
    return number(b.lastUsedAt) - number(a.lastUsedAt) || number(b.usedCount) - number(a.usedCount);
  });
  if (!tokens.length) return foods.slice(0, 20).map(food => markResultFood(food, resultKindForFood(food)));
  return foods
    .filter(food => {
      const haystack = normalizeSearchText(`${food.name} ${food.brand || ""} ${food.barcode || ""}`);
      return tokens.every(token => haystack.includes(token));
    })
    .slice(0, 30)
    .map(food => markResultFood(food, resultKindForFood(food)));
}

function resultKindForFood(food) {
  if (food.source === "custom" && !food.originalSource && !food.isDatabaseFood) return "personal";
  if (food.source === "custom" || food.usedCount || food.lastUsedAt) return "used";
  return "database";
}

function markResultFood(food, kind = "database") {
  return { ...food, resultKind: kind };
}

function readSearchCache() {
  return readLocal("searchCache", { searches: {}, barcodes: {} });
}

function writeSearchCache(cache) {
  const searches = Object.entries(cache.searches || {})
    .sort((a, b) => number(b[1].createdAt) - number(a[1].createdAt))
    .slice(0, MAX_CACHED_SEARCHES);
  writeLocal("searchCache", { searches: Object.fromEntries(searches), barcodes: cache.barcodes || {} });
}

function getCachedSearch(queryText) {
  const query = normalizeSearchText(queryText);
  const cached = readSearchCache().searches?.[query];
  if (!cached || Date.now() - number(cached.createdAt) > SEARCH_CACHE_TTL_MS) return null;
  return cached.results || [];
}

function setCachedSearch(queryText, results) {
  const cache = readSearchCache();
  cache.searches[normalizeSearchText(queryText)] = { createdAt: Date.now(), results };
  writeSearchCache(cache);
}

function getCachedBarcode(barcode) {
  const cached = readSearchCache().barcodes?.[String(barcode || "")];
  if (!cached || Date.now() - number(cached.createdAt) > SEARCH_CACHE_TTL_MS) return null;
  return cached.food;
}

function setCachedBarcode(barcode, food) {
  const cache = readSearchCache();
  cache.barcodes[String(barcode || "")] = { createdAt: Date.now(), food };
  writeSearchCache(cache);
}

function addRecentSearch(queryText) {
  const query = String(queryText || "").trim();
  if (!query) return;
  state.recentSearches = [query, ...state.recentSearches.filter(item => normalizeSearchText(item) !== normalizeSearchText(query))].slice(0, MAX_RECENT_SEARCHES);
  markSearchStateSaved();
}

function openFoodFactsHost() {
  return {
    world: "world.openfoodfacts.org",
    germany: "de.openfoodfacts.org",
    us: "us.openfoodfacts.org",
    france: "fr.openfoodfacts.org",
    uk: "uk.openfoodfacts.org"
  }[state.settings.searchRegion] || "world.openfoodfacts.org";
}

function mergeFoodResults(localResults, apiResults) {
  const map = new Map();
  const apiMarked = (apiResults || []).map(food => {
    const existing = findPersonalFoodMatch(food);
    return existing ? markResultFood(existing, resultKindForFood(existing)) : markResultFood(food, "database");
  });
  const ordered = state.settings.databasePreference === "api-first"
    ? [...apiMarked, ...localResults]
    : [...localResults, ...apiMarked];
  for (const food of ordered) {
    const key = foodIdentity(food);
    if (!map.has(key)) map.set(key, food);
  }
  return applySearchFilters([...map.values()]);
}

function applySearchFilters(results) {
  const filters = state.searchFilters || {};
  return (results || []).filter(food => {
    const brand = normalizeSearchText(filters.brand);
    if (brand && !normalizeSearchText(food.brand).includes(brand)) return false;
    if (filters.source !== "all" && food.resultKind !== filters.source && food.source !== filters.source) return false;
    const kcal = number(food.nutrientsPer100g?.kcal);
    if (filters.kcalMin !== "" && kcal < number(filters.kcalMin)) return false;
    if (filters.kcalMax !== "" && kcal > number(filters.kcalMax)) return false;
    if (filters.lowSugar && number(food.nutrientsPer100g?.sugar) > 5) return false;
    return true;
  });
}

function foodDataWarnings(food) {
  const n = normalizeNutrients(food.nutrientsPer100g);
  const warnings = [];
  if (!n.kcal) warnings.push("Missing calories");
  if (!n.protein && !n.carbs && !n.fat) warnings.push("Missing macros");
  if (n.kcal > 950) warnings.push("Calories look too high for 100 g");
  if (n.protein > 100 || n.carbs > 100 || n.fat > 100) warnings.push("Macro value above 100 g");
  const macroKcal = n.protein * 4 + n.carbs * 4 + n.fat * 9;
  if (n.kcal && macroKcal && Math.abs(macroKcal - n.kcal) / n.kcal > .35) warnings.push("Calories and macros do not match well");
  if (n.salt && n.sodium && Math.abs(n.salt * 400 - n.sodium) > Math.max(400, n.sodium * .4)) warnings.push("Sodium data looks inconsistent");
  return warnings;
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
            <input id="foodSearchInput" type="search" placeholder="Name of the food" />
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
              <label>Name<input name="name" required placeholder="Name of the food" /></label>
              <label>Brand<input name="brand" placeholder="Brand name" /></label>
              <label>Serving label<input name="servingLabel" value="100 g" /></label>
              <label>Serving grams<input name="servingGrams" type="number" step="0.1" min="0" value="100" /></label>
            </div>
            <div class="form-grid">
              ${["kcal", "protein", "carbs", "fat", "fiber", "sugar", "saturatedFat", "salt", "sodium"].map(key => `
                <label>${NUTRIENT_LABELS[key]} / 100 g
                  <input name="${key}" type="number" step="0.01" min="0" />
                </label>
              `).join("")}
            </div>
            <details>
              <summary class="kicker">Optional micronutrients</summary>
              <div class="form-grid" style="margin-top:12px;">
                ${["calcium", "iron", "potassium", "magnesium", "vitaminA", "vitaminC", "vitaminD", "vitaminB12"].map(key => `
                  <label>${NUTRIENT_LABELS[key]} / 100 g
                    <input name="${key}" type="number" step="0.01" min="0" />
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

  const form = document.getElementById("customFoodForm");
  bindCustomServingUnit(form);
  form?.addEventListener("submit", saveCustomFood);
}

function renderSearchV2() {
  const combined = state.searchResults.length
    ? state.searchResults
    : mergeFoodResults(searchPersonalLibrary(state.searchQuery), getCachedSearch(state.searchQuery) || []);
  const totalPages = Math.max(1, Math.ceil(combined.length / SEARCH_PAGE_SIZE));
  state.searchPage = Math.min(Math.max(1, state.searchPage || 1), totalPages);
  const pageStart = (state.searchPage - 1) * SEARCH_PAGE_SIZE;
  const pageResults = combined.slice(pageStart, pageStart + SEARCH_PAGE_SIZE);

  els.pages.search.innerHTML = `
    <div class="stack">
      <div class="card stack">
        <div class="meal-head">
          <div>
            <h3>Find food</h3>
            <p>Personal foods and recently used database foods are searched first. Open Food Facts results are saved for offline use.</p>
          </div>
          <button class="secondary-btn" data-action="open-custom-food-modal">Add food</button>
        </div>
        <div class="search-bar">
          <label>Food search
            <input id="foodSearchInput" type="search" value="${safeText(state.searchQuery)}" placeholder="Name of the food" autocomplete="off" />
          </label>
          <button class="primary-btn" data-action="search-foods" ${state.searchLoading ? "disabled" : ""}>${state.searchLoading ? "Searching..." : "Search"}</button>
          ${state.settings.modules.barcode ? `<button class="secondary-btn" data-action="open-barcode-modal">Barcode</button>` : ""}
        </div>
        <div class="loading-line">${safeText(state.searchFeedback || (navigator.onLine ? "Ready." : "Offline: showing personal and saved foods."))}</div>
        ${state.recentSearches.length ? `
          <div class="pill-row" aria-label="Recent searches">
            ${state.recentSearches.map(term => `<button class="tiny-btn" data-action="recent-search" data-query="${safeText(term)}">${safeText(term)}</button>`).join("")}
          </div>
        ` : ""}
      </div>

      <div class="card stack">
        <div class="meal-head">
          <h3>Foods</h3>
          <span class="kicker">${combined.length} result${combined.length === 1 ? "" : "s"}${combined.length ? ` - page ${state.searchPage} of ${totalPages}` : ""}</span>
        </div>
        <div id="searchResults" class="result-grid">
          ${pageResults.length ? pageResults.map(food => renderFoodResultCard(food, registerTempFood(food))).join("") : `<div class="empty-state">Search, scan a barcode, or add a custom food.</div>`}
        </div>
        ${combined.length > SEARCH_PAGE_SIZE ? `
          <div class="pagination">
            <button class="ghost-btn" data-action="search-prev-page" ${state.searchPage <= 1 ? "disabled" : ""}>Previous</button>
            <span class="kicker">${pageStart + 1}-${Math.min(pageStart + SEARCH_PAGE_SIZE, combined.length)} of ${combined.length}</span>
            <button class="ghost-btn" data-action="search-next-page" ${state.searchPage >= totalPages ? "disabled" : ""}>Next</button>
          </div>
        ` : ""}
      </div>
    </div>
  `;

  document.getElementById("foodSearchInput")?.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      runFoodSearch(event.currentTarget.value).catch(showError);
    }
  });
}

function updateSearchFiltersFromInputs() {
  state.searchFilters = {
    brand: document.getElementById("filterBrand")?.value || "",
    source: document.getElementById("filterSource")?.value || "all",
    kcalMin: document.getElementById("filterKcalMin")?.value || "",
    kcalMax: document.getElementById("filterKcalMax")?.value || "",
    highProtein: !!document.getElementById("filterHighProtein")?.checked,
    lowSugar: !!document.getElementById("filterLowSugar")?.checked
  };
  state.searchResults = mergeFoodResults(searchPersonalLibrary(state.searchQuery), getCachedSearch(state.searchQuery) || state.searchResults);
  renderSearchV2();
}

function nutrientInputHTML(key, nutrients = {}) {
  const rawValue = nutrients?.[key];
  const hasValue = rawValue !== undefined && rawValue !== null && rawValue !== "" && number(rawValue) !== 0;
  const valueAttr = hasValue ? ` value="${round(rawValue, 3)}"` : "";
  return `
    <label>${safeText(NUTRIENT_LABELS[key])} / 100 g
      <input name="${key}" type="number" step="0.01" min="0"${valueAttr} />
    </label>
  `;
}

function nutrientSectionHTML(title, caption, keys, nutrients = {}) {
  return `
    <section class="nutrient-section">
      <div>
        <h4>${safeText(title)}</h4>
        <p>${safeText(caption)}</p>
      </div>
      <div class="form-grid">
        ${keys.map(key => nutrientInputHTML(key, nutrients)).join("")}
      </div>
    </section>
  `;
}

function customFoodNutrientFieldsHTML(nutrients = {}) {
  return [
    nutrientSectionHTML("Energy", "Calories per 100 g.", ["kcal"], nutrients),
    nutrientSectionHTML("Protein", "Protein is tracked as its own macro.", ["protein"], nutrients),
    nutrientSectionHTML("Carbohydrates", "Total carbs with sugar and fiber as carb sub-values.", ["carbs", "sugar", "fiber"], nutrients),
    nutrientSectionHTML("Fats", "Total fat with saturated fat as a fat sub-value.", ["fat", "saturatedFat"], nutrients),
    nutrientSectionHTML("Salt and sodium", "Sodium is stored in mg. Salt can stay empty if unknown.", ["sodium", "salt"], nutrients),
    nutrientSectionHTML("Micronutrients", "Optional vitamins and minerals.", ["calcium", "iron", "potassium", "magnesium", "vitaminA", "vitaminC", "vitaminD", "vitaminB12"], nutrients)
  ].join("");
}

function openCustomFoodCreateModal() {
  openModal(`
    <div class="modal">
      <div class="modal-head"><h3>Add food</h3><button class="close-btn" type="button" data-action="close-modal">x</button></div>
      <form id="customFoodForm" class="modal-body">
        <section class="nutrient-section featured-section">
          <div>
            <h4>Food identity</h4>
            <p>Name, brand, and default serving.</p>
          </div>
          <div class="form-grid two">
            <label>Name<input name="name" required placeholder="Name of the food" /></label>
            <label>Brand<input name="brand" placeholder="Brand name" /></label>
            ${servingUnitSelectHTML("g")}
            <label>Serving grams<input name="servingGrams" type="number" step="0.1" min="0" value="100" /></label>
          </div>
        </section>
        ${customFoodNutrientFieldsHTML()}
        <div class="form-actions"><button class="primary-btn" type="submit">Add food</button></div>
      </form>
    </div>
  `);
  document.getElementById("customFoodForm")?.addEventListener("submit", saveCustomFood);
}

function renderRecipeQuickCard(recipe) {
  const n = normalizeNutrients(recipe.nutrientsPerPortion || scaleNutrients(recipe.totalNutrients, 1 / Math.max(1, recipe.portions || 1)));
  return `
    <div class="result-card used">
      <div>
        <h4>${safeText(recipe.name)}</h4>
        <p>${round(n.kcal, 0)} kcal / portion</p>
      </div>
      <button class="primary-btn" data-action="log-recipe" data-id="${recipe.id}">Log</button>
    </div>
  `;
}

function renderMealsetQuickCard(mealset) {
  const n = normalizeNutrients(mealset.totalNutrients);
  return `
    <div class="result-card used">
      <div>
        <h4>${safeText(mealset.name)}</h4>
        <p>${round(n.kcal, 0)} kcal / mealset</p>
      </div>
      <button class="primary-btn" data-action="log-mealset" data-id="${mealset.id}">Log</button>
    </div>
  `;
}

function renderFoodResultCard(food, key) {
  const warnings = foodDataWarnings(food);
  return `
    <div class="result-card ${safeText(food.resultKind || resultKindForFood(food))} ${warnings.length ? "warning" : ""}">
      <div>
        <h4>${safeText(displayFoodName(food))}</h4>
        <p>${safeText(caloriesText(food))}</p>
        ${nutrientSummaryHTML(scaleNutrients(food.nutrientsPer100g, 1))}
        <div class="badges">
          ${food.favorite ? `<span class="badge green">Favorite</span>` : ""}
          ${warnings.length ? `<span class="badge red">${warnings.length} warning${warnings.length === 1 ? "" : "s"}</span>` : ""}
        </div>
      </div>
      <div class="inline-actions">
        <button class="primary-btn" data-action="log-food" data-key="${safeText(key)}">Log</button>
        <button class="tiny-btn" data-action="food-detail" data-key="${safeText(key)}">Detail</button>
        ${food.source === "custom" ? `
          <button class="tiny-btn" data-action="toggle-favorite-food" data-id="${food.id}">${food.favorite ? "Unfavorite" : "Favorite"}</button>
          <button class="tiny-btn" data-action="edit-custom-food" data-id="${food.id}">Edit</button>
          <button class="tiny-btn" data-action="duplicate-custom-food" data-id="${food.id}">Duplicate</button>
          <button class="tiny-btn" data-action="delete-custom-food" data-id="${food.id}">Delete</button>
        ` : ""}
      </div>
    </div>
  `;
}

function openFoodDetailModal(food) {
  if (!food) return;
  const warnings = foodDataWarnings(food);
  openModal(`
    <div class="modal">
      <div class="modal-head"><h3>${safeText(displayFoodName(food))}</h3><button class="close-btn" data-action="close-modal">x</button></div>
      <div class="modal-body">
        <div class="badges">
          <span class="badge ${food.resultKind === "database" ? "blue" : food.resultKind === "personal" ? "green" : "orange"}">${safeText(food.resultKind || resultKindForFood(food))}</span>
          ${food.brand ? `<span class="badge gray">${safeText(food.brand)}</span>` : ""}
          ${food.barcode ? `<span class="badge gray">Barcode ${safeText(food.barcode)}</span>` : ""}
          <span class="badge gray">${safeText(food.source || "custom")}</span>
        </div>
        ${warnings.length ? `<div class="empty-state">${warnings.map(safeText).join("<br>")}</div>` : ""}
        <div class="detail-table">
          ${NUTRIENT_KEYS.filter(key => nutrientVisible(key) || ["kcal", "protein", "carbs", "fat"].includes(key)).map(key => `
            <div class="detail-row"><span>${safeText(NUTRIENT_LABELS[key])}</span><strong>${round(food.nutrientsPer100g?.[key], key === "kcal" || key === "sodium" ? 0 : 2)} ${safeText(NUTRIENT_UNITS[key])} / 100 g</strong></div>
          `).join("")}
        </div>
        <div>
          <p class="kicker">Servings</p>
          <div class="badges">
            ${buildServingOptions(food).map(serving => `<span class="badge gray">${safeText(serving.label)} = ${round(serving.grams)} g</span>`).join("")}
          </div>
        </div>
      </div>
    </div>
  `);
}

function openCustomFoodEditor(food, duplicate = false) {
  if (!food) return;
  const serving = food.defaultServing || food.servingOptions?.[0] || { label: "100 g", grams: 100, unit: "g" };
  const unit = serving.unit || String(serving.label || "g").replace(/[0-9.,\s]/g, "") || "g";
  openModal(`
    <div class="modal">
      <div class="modal-head"><h3>${duplicate ? "Duplicate" : "Edit"} custom food</h3><button class="close-btn" data-action="close-modal">x</button></div>
      <form id="customFoodEditForm" class="modal-body">
        <div class="form-grid two">
          <label>Name<input name="name" required value="${safeText(duplicate ? `${food.name} copy` : food.name)}" /></label>
          <label>Brand<input name="brand" value="${safeText(food.brand || "")}" /></label>
          ${servingUnitSelectHTML(servingUnits().includes(normalizeSearchText(unit)) ? normalizeSearchText(unit) : "custom")}
          <label>Serving grams<input name="servingGrams" type="number" step="0.1" min="0" value="${round(serving.grams || 100, 2)}" /></label>
        </div>
        ${customFoodNutrientFieldsHTML(food.nutrientsPer100g)}
        <div class="form-actions"><button class="primary-btn" type="submit">${duplicate ? "Create copy" : "Save changes"}</button></div>
      </form>
    </div>
  `);
  const editForm = document.getElementById("customFoodEditForm");
  if (editForm?.elements.customServingUnit && !servingUnits().includes(normalizeSearchText(unit))) {
    editForm.elements.customServingUnit.value = unit;
  }
  bindCustomServingUnit(editForm);
  editForm.addEventListener("submit", async event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const servingGrams = number(data.get("servingGrams"), 100) || 100;
    const servingUnit = selectedServingUnit(data);
    const servingLabel = servingLabelFor(servingUnit, servingGrams);
    const next = {
      ...food,
      source: "custom",
      name: String(data.get("name") || "").trim(),
      nameLower: String(data.get("name") || "").trim().toLowerCase(),
      brand: String(data.get("brand") || "").trim() || null,
      defaultServing: { label: servingLabel, grams: servingGrams, unit: servingUnit },
      servingOptions: [{ label: servingLabel, grams: servingGrams, unit: servingUnit }, { label: "100 g", grams: 100, unit: "g" }],
      nutrientsPer100g: normalizeNutrients(Object.fromEntries(NUTRIENT_KEYS.map(k => [k, data.get(k)]))),
      updatedAt: Date.now()
    };
    delete next.id;
    const warnings = foodDataWarnings(next);
    if (warnings.length && !confirm(`This food has data warnings:\n\n${warnings.join("\n")}\n\nSave anyway?`)) return;
    if (duplicate) await addDoc(userCollection("customFoods"), cleanForFirestore({ ...next, createdAt: Date.now(), usedCount: 0, lastUsedAt: null }));
    else await updateDoc(userDoc("customFoods", food.id), cleanForFirestore(next));
    closeModal();
    showToast(duplicate ? "Custom food duplicated." : "Custom food updated.");
  });
}

async function toggleFavoriteFood(id) {
  const food = state.customFoods.find(item => item.id === id);
  if (!food) return;
  await updateDoc(userDoc("customFoods", id), { favorite: !food.favorite, updatedAt: Date.now() });
}

function renderFoodResult(food, key) {
  const sourceLabel = food.source === "custom" ? "Custom" : food.source === "openfoodfacts" ? "Open Food Facts" : food.source;
  return `
    <div class="result-card">
      <div>
        <h4>${safeText(displayFoodName(food))}</h4>
        <p>${safeText(caloriesText(food))}</p>
        ${nutrientSummaryHTML(scaleNutrients(food.nutrientsPer100g, 1))}
        <div class="badges"></div>
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

async function fetchOpenFoodFacts(queryText) {
  const queryTextTrimmed = queryText.trim();
  if (!queryTextTrimmed) return [];
  const url = new URL(`https://${openFoodFactsHost()}/cgi/search.pl`);
  url.searchParams.set("search_terms", queryTextTrimmed);
  url.searchParams.set("search_simple", "1");
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "1");
  url.searchParams.set("page_size", "25");
  url.searchParams.set("fields", "code,product_name,generic_name,abbreviated_product_name,brands,nutriments,serving_size,serving_quantity,quantity,product_quantity");
  const res = await fetch(url.toString(), { headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error("Open Food Facts search failed.");
  const data = await res.json();
  return (data.products || [])
    .map(normalizeOpenFoodFactsProduct)
    .filter(Boolean)
    .filter(food => food.nutrientsPer100g.kcal > 0)
    .slice(0, 25);
}

async function runFoodSearch(queryText, options = {}) {
  const query = String(queryText || "").trim();
  if (!query) {
    state.searchQuery = "";
    state.searchPage = 1;
    state.searchResults = mergeFoodResults(searchPersonalLibrary(""), []);
    state.searchFeedback = "Showing favorites and recent personal foods.";
    if (options.updateState !== false) renderSearchV2();
    return state.searchResults;
  }
  state.searchQuery = query;
  state.searchPage = 1;
  addRecentSearch(query);
  const localResults = searchPersonalLibrary(query);
  const cached = getCachedSearch(query) || [];
  state.searchResults = mergeFoodResults(localResults, cached);
  state.searchFeedback = cached.length ? `Showing ${cached.length} offline database result${cached.length === 1 ? "" : "s"} while searching.` : "Searching personal library first.";
  state.searchLoading = true;
  if (options.updateState !== false) renderSearchV2();

  if (!navigator.onLine || state.settings.databasePreference === "offline-only") {
    state.searchLoading = false;
    state.searchFeedback = `Offline: ${state.searchResults.length} personal/offline result${state.searchResults.length === 1 ? "" : "s"}.`;
    if (options.updateState !== false) renderSearchV2();
    return state.searchResults;
  }

  try {
    const apiResults = await fetchOpenFoodFacts(query);
    setCachedSearch(query, apiResults);
    state.searchResults = mergeFoodResults(localResults, apiResults);
    state.searchFeedback = `${state.searchResults.length} result${state.searchResults.length === 1 ? "" : "s"} from personal library and Open Food Facts.`;
    return state.searchResults;
  } catch (error) {
    state.searchFeedback = cached.length ? "Network search failed, using offline results." : "Network search failed and no offline result was found.";
    if (!cached.length && !localResults.length) throw error;
    return state.searchResults;
  } finally {
    state.searchLoading = false;
    if (options.updateState !== false) renderSearchV2();
  }
}

async function lookupBarcodeCached(barcode) {
  const cleanBarcode = String(barcode || "").replace(/\D/g, "");
  if (!cleanBarcode) throw new Error("Enter a barcode first.");
  const cached = getCachedBarcode(cleanBarcode);
  if (cached) {
    state.searchQuery = cleanBarcode;
    state.searchResults = mergeFoodResults(searchPersonalLibrary(cleanBarcode), [cached]);
    state.searchFeedback = "Barcode loaded from cache.";
    renderSearchV2();
    return cached;
  }
  if (!navigator.onLine) throw new Error("No offline barcode result is available.");
  const url = `https://${openFoodFactsHost()}/api/v2/product/${encodeURIComponent(cleanBarcode)}.json`;
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error("Barcode lookup failed.");
  const data = await res.json();
  if (!data.product) throw new Error("No product found for this barcode.");
  const food = normalizeOpenFoodFactsProduct(data.product);
  if (!food) throw new Error("Product found, but nutrition data is incomplete.");
  setCachedBarcode(cleanBarcode, food);
  state.searchQuery = cleanBarcode;
  state.searchResults = mergeFoodResults(searchPersonalLibrary(cleanBarcode), [food]);
  state.searchFeedback = `Found ${displayFoodName(food)}.`;
  renderSearchV2();
  return food;
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
  const servingUnit = selectedServingUnit(data);
  const servingLabel = servingLabelFor(servingUnit, servingGrams);
  const nutrientsPer100g = normalizeNutrients(Object.fromEntries(NUTRIENT_KEYS.map(k => [k, data.get(k)])));
  const food = {
    source: "custom",
    name,
    nameLower: name.toLowerCase(),
    brand: String(data.get("brand") || "").trim() || null,
    defaultServing: {
      label: servingLabel,
      grams: servingGrams
    },
    servingOptions: [
      { label: servingLabel, grams: servingGrams, unit: servingUnit },
      { label: "100 g", grams: 100, unit: "g" }
    ],
    nutrientsPer100g,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  const warnings = foodDataWarnings(food);
  if (warnings.length && !confirm(`This food has data warnings:\n\n${warnings.join("\n")}\n\nSave anyway?`)) return;
  await addDoc(userCollection("customFoods"), cleanForFirestore(food));
  form.reset();
  if (els.modalRoot.contains(form)) closeModal();
  showToast("Custom food saved.");
}

async function saveApiFoodAsCustom(key) {
  const food = getFoodByKey(key);
  if (!food) return;
  await ensureFoodInPersonalLibrary(food, { incrementUsage: false });
  showToast("Saved to your personal library.");
}

async function ensureFoodInPersonalLibrary(food, options = { incrementUsage: true }) {
  if (!food || food.source === "recipe" || food.source === "mealset") return null;
  const now = Date.now();
  const existing = food.source === "custom" && food.id ? food : findPersonalFoodMatch(food);
  if (existing?.id) {
    const patch = {
      usedCount: number(existing.usedCount) + (options.incrementUsage === false ? 0 : 1),
      lastUsedAt: options.incrementUsage === false ? existing.lastUsedAt || null : now,
      updatedAt: now
    };
    await updateDoc(userDoc("customFoods", existing.id), cleanForFirestore(patch));
    return existing.id;
  }
  const copy = {
    ...food,
    source: "custom",
    originalSource: food.source,
    isDatabaseFood: true,
    nameLower: food.name.toLowerCase(),
    usedCount: options.incrementUsage === false ? 0 : 1,
    lastUsedAt: options.incrementUsage === false ? null : now,
    createdAt: Date.now(),
    updatedAt: now
  };
  delete copy.id;
  const ref = await addDoc(userCollection("customFoods"), cleanForFirestore(copy));
  return ref.id;
}

function buildServingOptions(food) {
  const options = [
    { label: "grams", grams: 1, mode: "grams" },
    { label: "100 g", grams: 100, mode: "serving" }
  ];
  for (const serving of food.servingOptions || []) {
    if (number(serving.grams) > 0 && !options.some(option => normalizeSearchText(option.label) === normalizeSearchText(serving.label))) {
      options.push({ ...serving, mode: "serving" });
    }
  }
  if (food.defaultServing?.grams && !options.some(option => normalizeSearchText(option.label) === normalizeSearchText(food.defaultServing.label))) {
    options.push({ ...food.defaultServing, mode: "serving" });
  }
  return options;
}

function openLogFoodModal(food) {
  if (!food) return;
  const servingOptions = buildServingOptions(food);
  const defaultMeal = state.defaultLogMeal || "breakfast";
  const defaultDate = state.defaultLogDate || state.currentDate;
  openModal(`
    <div class="modal">
      <div class="modal-head"><h3>Log ${safeText(displayFoodName(food))}</h3><button class="close-btn" data-action="close-modal">x</button></div>
      <form id="logFoodForm" class="modal-body">
        <div class="form-grid two">
          <label>Amount<input name="amount" type="number" step="0.01" min="0" value="100" required /></label>
          <label>Unit
            <select name="unitIndex">
              ${servingOptions.map((s, idx) => `<option value="${idx}">${safeText(s.mode === "grams" ? "grams" : s.label)}</option>`).join("")}
            </select>
          </label>
          <label>Meal
            <select name="meal">${MEALS.map(([id, label]) => `<option value="${id}" ${id === defaultMeal ? "selected" : ""}>${label}</option>`).join("")}</select>
          </label>
          <label>Date<input name="date" type="date" value="${defaultDate}" /></label>
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
  const libraryId = await ensureFoodInPersonalLibrary(food, { incrementUsage: true });
  const entry = {
    itemType: "food",
    itemId: libraryId || food.id || food.sourceId || null,
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
  await updateDailyCalorieSummary(dateISO).catch(console.warn);
  showToast("Food logged.");
}

function renderRecipes() {
  els.pages.recipes.innerHTML = `
    <div class="grid-2">
      ${state.settings.modules.recipes ? `<div class="card stack">
        <div class="meal-head">
          <h3>Recipes</h3>
          <button class="primary-btn" type="button" data-action="create-recipe">+ Recipe</button>
        </div>
        <p>Recipes split a batch into portions. Logging stores a nutrition snapshot so old days stay stable even if you edit later.</p>
        <div class="result-grid">${state.recipes.length ? state.recipes.map(renderRecipeCard).join("") : `<div class="empty-state">No recipes yet.</div>`}</div>
      </div>` : `<div class="card"><div class="empty-state">Recipes are disabled in Settings.</div></div>`}

      ${state.settings.modules.mealsets ? `<div class="card stack">
        <div class="meal-head">
          <h3>Mealsets</h3>
          <button class="primary-btn" type="button" data-action="create-mealset">+ Mealset</button>
        </div>
        <p>Mealsets are reusable full meals. One mealset equals one complete meal.</p>
        <div class="result-grid">${state.mealsets.length ? state.mealsets.map(renderMealsetCard).join("") : `<div class="empty-state">No mealsets yet.</div>`}</div>
      </div>` : `<div class="card"><div class="empty-state">Mealsets are disabled in Settings.</div></div>`}
    </div>
  `;

  els.pages.recipes.querySelector('[data-action="create-recipe"]')?.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    createRecipe().catch(showError);
  });
  els.pages.recipes.querySelector('[data-action="create-mealset"]')?.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    createMealset().catch(showError);
  });
}

function itemAmountText(item) {
  return `${round(item.amount ?? item.grams)} ${safeText(item.unit || "g")}`;
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
          <ul>${(recipe.ingredients || []).map(i => `<li>${safeText(i.nameSnapshot)} - ${itemAmountText(i)}, ${round(i.nutrientsSnapshot?.kcal, 0)} kcal</li>`).join("") || "<li>No ingredients yet.</li>"}</ul>
        </details>
      </div>
      <div class="inline-actions">
        <button class="primary-btn" data-action="log-recipe" data-id="${recipe.id}">Log</button>
        <button class="tiny-btn" data-action="detail-recipe" data-id="${recipe.id}">Detail</button>
        <button class="tiny-btn" data-action="edit-recipe" data-id="${recipe.id}">Edit</button>
        <button class="tiny-btn" data-action="duplicate-recipe" data-id="${recipe.id}">Duplicate</button>
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
          <ul>${(mealset.items || []).map(i => `<li>${safeText(i.nameSnapshot)} - ${itemAmountText(i)}, ${round(i.nutrientsSnapshot?.kcal, 0)} kcal</li>`).join("") || "<li>No items yet.</li>"}</ul>
        </details>
      </div>
      <div class="inline-actions">
        <button class="primary-btn" data-action="log-mealset" data-id="${mealset.id}">Log</button>
        <button class="tiny-btn" data-action="detail-mealset" data-id="${mealset.id}">Detail</button>
        <button class="tiny-btn" data-action="edit-mealset" data-id="${mealset.id}">Edit</button>
        <button class="tiny-btn" data-action="duplicate-mealset" data-id="${mealset.id}">Duplicate</button>
        <button class="tiny-btn" data-action="add-ingredient" data-kind="mealset" data-id="${mealset.id}">Item</button>
        <button class="tiny-btn" data-action="delete-mealset" data-id="${mealset.id}">Delete</button>
      </div>
    </div>
  `;
}

async function createRecipe() {
  openModal(`
    <div class="modal">
      <div class="modal-head"><h3>Create recipe</h3><button class="close-btn" type="button" data-action="close-modal">x</button></div>
      <form id="createRecipeForm" class="modal-body">
        <label>Name<input name="name" required placeholder="Name of the recipe" /></label>
        <label>Portions<input name="portions" type="number" step="0.1" min="0.1" value="1" required /></label>
        <label>Notes<textarea name="notes" placeholder="Notes"></textarea></label>
        <div class="form-actions"><button class="primary-btn" type="submit">Create</button></div>
      </form>
    </div>
  `);
}

async function saveRecipeFromForm(form) {
  const data = new FormData(form);
  const name = String(data.get("name") || "").trim();
  if (!name) return;
  const recipe = {
    name,
    portions: Math.max(0.1, number(data.get("portions"), 1)),
    notes: String(data.get("notes") || "").trim(),
    ingredients: [],
    totalNutrients: emptyNutrients(),
    nutrientsPerPortion: emptyNutrients(),
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  await addDoc(userCollection("recipes"), cleanForFirestore(recipe));
  closeModal();
  setRoute("recipes");
  showToast("Recipe created. Add ingredients next.");
}

async function createMealset() {
  openModal(`
    <div class="modal">
      <div class="modal-head"><h3>Create mealset</h3><button class="close-btn" type="button" data-action="close-modal">x</button></div>
      <form id="createMealsetForm" class="modal-body">
        <label>Name<input name="name" required placeholder="Name of the mealset" /></label>
        <label>Notes<textarea name="notes" placeholder="Notes"></textarea></label>
        <div class="form-actions"><button class="primary-btn" type="submit">Create</button></div>
      </form>
    </div>
  `);
}

async function saveMealsetFromForm(form) {
  const data = new FormData(form);
  const name = String(data.get("name") || "").trim();
  if (!name) return;
  const mealset = {
    name,
    notes: String(data.get("notes") || "").trim(),
    items: [],
    totalNutrients: emptyNutrients(),
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  await addDoc(userCollection("mealsets"), cleanForFirestore(mealset));
  closeModal();
  setRoute("recipes");
  showToast("Mealset created. Add items next.");
}

function recipePortionAsFood(recipe) {
  const perPortion = normalizeNutrients(recipe.nutrientsPerPortion || scaleNutrients(recipe.totalNutrients, 1 / Math.max(1, recipe.portions || 1)));
  return {
    id: recipe.id,
    source: "recipe",
    name: `${recipe.name} portion`,
    brand: "Recipe",
    nutrientsPerPortion: perPortion,
    nutrientsPer100g: perPortion,
    defaultServing: { label: "portion", grams: 100 },
    servingOptions: [{ label: "portion", grams: 100 }]
  };
}

function openIngredientModal(kind, id) {
  const target = kind === "recipe" ? state.recipes.find(r => r.id === id) : state.mealsets.find(m => m.id === id);
  if (!target) return;
  const recipePortions = state.settings.modules.recipes
    ? state.recipes.filter(recipe => !(kind === "recipe" && recipe.id === id)).map(recipePortionAsFood)
    : [];
  openModal(`
    <div class="modal">
      <div class="modal-head"><h3>Add ${kind === "recipe" ? "ingredient" : "item"} to ${safeText(target.name)}</h3><button class="close-btn" data-action="close-modal">x</button></div>
      <div class="modal-body">
        <div class="search-bar">
          <label>Search<input id="ingredientSearchInput" type="search" placeholder="Name of the food" /></label>
          <button class="primary-btn" data-action="ingredient-search" data-kind="${kind}" data-id="${id}">Search</button>
          <button class="secondary-btn" data-action="show-custom-ingredients" data-kind="${kind}" data-id="${id}">Your foods</button>
        </div>
        <div id="ingredientResults" class="result-grid">
          ${recipePortions.map(food => renderIngredientResult(food, registerTempFood(food), kind, id)).join("")}
          ${state.customFoods.slice(0, 12).map(food => renderIngredientResult(food, registerTempFood(food), kind, id)).join("") || (recipePortions.length ? "" : `<div class="empty-state">Create a custom food first or search Open Food Facts.</div>`)}
        </div>
      </div>
    </div>
  `);
}

function renderIngredientResult(food, key, kind, id) {
  const detail = food.source === "recipe"
    ? `${round(food.nutrientsPerPortion?.kcal, 0)} kcal / portion`
    : caloriesText(food);
  return `
    <div class="result-card">
      <div>
        <h4>${safeText(displayFoodName(food))}</h4>
        <p>${safeText(detail)}</p>
      </div>
      <button class="primary-btn" data-action="select-ingredient" data-key="${safeText(key)}" data-kind="${kind}" data-id="${id}">Add</button>
    </div>
  `;
}

function openIngredientAmountModal(food, kind, id) {
  const isRecipePortion = food?.source === "recipe";
  openModal(`
    <div class="modal">
      <div class="modal-head"><h3>Add ${safeText(displayFoodName(food))}</h3><button class="close-btn" type="button" data-action="close-modal">x</button></div>
      <form id="ingredientAmountForm" class="modal-body">
        <label>${isRecipePortion ? "Portions" : "Amount in grams"}<input name="amount" type="number" step="0.1" min="0" value="${isRecipePortion ? 1 : 100}" required /></label>
        <div class="form-actions"><button class="primary-btn" type="submit">Add</button></div>
      </form>
    </div>
  `);
  document.getElementById("ingredientAmountForm").addEventListener("submit", async event => {
    event.preventDefault();
    const amount = number(new FormData(event.currentTarget).get("amount"));
    await addIngredientToTarget(food, amount, kind, id);
    closeModal();
  });
}

async function addIngredientToTarget(food, amount, kind, id) {
  const isRecipePortion = food?.source === "recipe";
  if (!isRecipePortion) await ensureFoodInPersonalLibrary(food, { incrementUsage: true });
  const grams = isRecipePortion ? null : amount;
  const nutrientsSnapshot = isRecipePortion
    ? scaleNutrients(food.nutrientsPerPortion, amount)
    : scaleNutrients(food.nutrientsPer100g, amount / 100);
  const ingredient = {
    itemType: isRecipePortion ? "recipe" : "food",
    source: food.source,
    itemId: food.id || food.sourceId || null,
    nameSnapshot: displayFoodName(food),
    brandSnapshot: food.brand || null,
    grams,
    amount,
    unit: isRecipePortion ? "portion" : "g",
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

function recalculateTarget(kind, target, items) {
  const totalNutrients = addNutrients(items);
  if (kind === "recipe") {
    return {
      ingredients: items,
      totalNutrients,
      nutrientsPerPortion: scaleNutrients(totalNutrients, 1 / Math.max(1, number(target.portions, 1))),
      updatedAt: Date.now()
    };
  }
  return { items, totalNutrients, updatedAt: Date.now() };
}

function openTargetDetail(kind, id) {
  const isRecipe = kind === "recipe";
  const target = isRecipe ? state.recipes.find(item => item.id === id) : state.mealsets.find(item => item.id === id);
  if (!target) return;
  const items = isRecipe ? target.ingredients || [] : target.items || [];
  const total = isRecipe ? normalizeNutrients(target.nutrientsPerPortion || scaleNutrients(target.totalNutrients, 1 / Math.max(1, target.portions || 1))) : normalizeNutrients(target.totalNutrients);
  openModal(`
    <div class="modal">
      <div class="modal-head"><h3>${safeText(target.name)}</h3><button class="close-btn" data-action="close-modal">x</button></div>
      <div class="modal-body">
        <p class="kicker">${isRecipe ? `${target.portions || 1} portions` : "Mealset"}${target.notes ? ` - ${safeText(target.notes)}` : ""}</p>
        ${nutrientSummaryHTML(total)}
        <div class="result-grid">
          ${items.length ? items.map((item, index) => `
            <div class="food-entry">
              <div class="food-entry-head">
                <div><strong>${safeText(item.nameSnapshot)}</strong><br><small>${itemAmountText(item)}</small></div>
                <strong>${round(item.nutrientsSnapshot?.kcal, 0)} kcal</strong>
              </div>
              <div class="inline-actions">
                <button class="tiny-btn" data-action="edit-target-item" data-kind="${kind}" data-id="${id}" data-index="${index}">Edit amount</button>
                <button class="tiny-btn" data-action="remove-target-item" data-kind="${kind}" data-id="${id}" data-index="${index}">Remove</button>
              </div>
            </div>
          `).join("") : `<div class="empty-state">No ${isRecipe ? "ingredients" : "items"} yet.</div>`}
        </div>
      </div>
    </div>
  `);
}

function openTargetEditor(kind, id) {
  const isRecipe = kind === "recipe";
  const target = isRecipe ? state.recipes.find(item => item.id === id) : state.mealsets.find(item => item.id === id);
  if (!target) return;
  openModal(`
    <div class="modal">
      <div class="modal-head"><h3>Edit ${isRecipe ? "recipe" : "mealset"}</h3><button class="close-btn" data-action="close-modal">x</button></div>
      <form id="targetEditForm" class="modal-body">
        <label>Name<input name="name" required value="${safeText(target.name)}" /></label>
        ${isRecipe ? `<label>Portions<input name="portions" type="number" step="0.1" min="0.1" value="${target.portions || 1}" /></label>` : ""}
        <label>Notes<textarea name="notes">${safeText(target.notes || "")}</textarea></label>
        <div class="form-actions"><button class="primary-btn" type="submit">Save changes</button></div>
      </form>
    </div>
  `);
  document.getElementById("targetEditForm").addEventListener("submit", async event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const patch = {
      name: String(data.get("name") || "").trim(),
      notes: String(data.get("notes") || "").trim(),
      updatedAt: Date.now()
    };
    if (isRecipe) {
      patch.portions = number(data.get("portions"), target.portions || 1);
      patch.nutrientsPerPortion = scaleNutrients(target.totalNutrients, 1 / Math.max(1, patch.portions));
    }
    await updateDoc(userDoc(isRecipe ? "recipes" : "mealsets", id), cleanForFirestore(patch));
    closeModal();
  });
}

async function duplicateTarget(kind, id) {
  const isRecipe = kind === "recipe";
  const target = isRecipe ? state.recipes.find(item => item.id === id) : state.mealsets.find(item => item.id === id);
  if (!target) return;
  const copy = { ...target, name: `${target.name} copy`, createdAt: Date.now(), updatedAt: Date.now() };
  delete copy.id;
  await addDoc(userCollection(isRecipe ? "recipes" : "mealsets"), cleanForFirestore(copy));
  showToast(`${isRecipe ? "Recipe" : "Mealset"} duplicated.`);
}

function openTargetItemAmountEditor(kind, id, index) {
  const isRecipe = kind === "recipe";
  const target = isRecipe ? state.recipes.find(item => item.id === id) : state.mealsets.find(item => item.id === id);
  const items = [...(isRecipe ? target?.ingredients || [] : target?.items || [])];
  const item = items[number(index)];
  if (!target || !item) return;
  openModal(`
    <div class="modal">
      <div class="modal-head"><h3>Edit ${safeText(item.nameSnapshot)}</h3><button class="close-btn" data-action="close-modal">x</button></div>
      <form id="targetItemEditForm" class="modal-body">
        <label>Amount (${safeText(item.unit || "g")})<input name="amount" type="number" step="0.1" min="0" value="${round(item.amount ?? item.grams, 2)}" /></label>
        <div class="form-actions"><button class="primary-btn" type="submit">Save amount</button></div>
      </form>
    </div>
  `);
  document.getElementById("targetItemEditForm").addEventListener("submit", async event => {
    event.preventDefault();
    const newAmount = number(new FormData(event.currentTarget).get("amount"), item.amount ?? item.grams);
    const oldAmount = number(item.amount ?? item.grams, 1) || 1;
    const factor = newAmount / oldAmount;
    items[number(index)] = {
      ...item,
      amount: newAmount,
      grams: item.unit === "g" ? newAmount : item.grams,
      nutrientsSnapshot: scaleNutrients(item.nutrientsSnapshot, factor),
      updatedAt: Date.now()
    };
    await updateDoc(userDoc(isRecipe ? "recipes" : "mealsets", id), cleanForFirestore(recalculateTarget(kind, target, items)));
    closeModal();
    showToast("Amount updated.");
  });
}

async function removeTargetItem(kind, id, index) {
  const isRecipe = kind === "recipe";
  const target = isRecipe ? state.recipes.find(item => item.id === id) : state.mealsets.find(item => item.id === id);
  if (!target) return;
  const items = [...(isRecipe ? target.ingredients || [] : target.items || [])];
  items.splice(number(index), 1);
  await updateDoc(userDoc(isRecipe ? "recipes" : "mealsets", id), cleanForFirestore(recalculateTarget(kind, target, items)));
  closeModal();
  showToast("Item removed.");
}

function openLogRecipeModal(recipe) {
  const perPortion = normalizeNutrients(recipe.nutrientsPerPortion);
  openModal(`
    <div class="modal">
      <div class="modal-head"><h3>Log ${safeText(recipe.name)}</h3><button class="close-btn" type="button" data-action="close-modal">x</button></div>
      <form id="logRecipeForm" class="modal-body">
        <div class="form-grid two">
          <label>Portions<input name="amount" type="number" step="0.1" min="0" value="1" required /></label>
          <label>Meal<select name="meal">${MEALS.map(([id, label]) => `<option value="${id}" ${id === (state.defaultLogMeal || "breakfast") ? "selected" : ""}>${label}</option>`).join("")}</select></label>
          <label>Date<input name="date" type="date" value="${state.defaultLogDate || state.currentDate}" /></label>
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
    await updateDailyCalorieSummary(data.get("date")).catch(console.warn);
    closeModal();
    showToast("Recipe logged.");
  });
}

function openLogMealsetModal(mealset) {
  const total = normalizeNutrients(mealset.totalNutrients);
  openModal(`
    <div class="modal">
      <div class="modal-head"><h3>Log ${safeText(mealset.name)}</h3><button class="close-btn" type="button" data-action="close-modal">x</button></div>
      <form id="logMealsetForm" class="modal-body">
        <div class="form-grid two">
          <label>Quantity<input name="amount" type="number" step="0.1" min="0" value="1" required /></label>
          <label>Meal<select name="meal">${MEALS.map(([id, label]) => `<option value="${id}" ${id === (state.defaultLogMeal || "breakfast") ? "selected" : ""}>${label}</option>`).join("")}</select></label>
          <label>Date<input name="date" type="date" value="${state.defaultLogDate || state.currentDate}" /></label>
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
    await updateDailyCalorieSummary(data.get("date")).catch(console.warn);
    closeModal();
    showToast("Mealset logged.");
  });
}

function renderReportsShell() {
  state.reportRange = state.reportRange || periodRange();
  const [start, end] = state.reportRange;
  const label = `${state.reportMode[0].toUpperCase()}${state.reportMode.slice(1)} report`;
  els.pages.reports.innerHTML = `
    <div class="stack">
      <div class="card">
        <div class="meal-head">
          <div>
            <h3>${safeText(label)}</h3>
            <span>${safeText(start)} to ${safeText(end)}</span>
          </div>
          <div class="segmented" aria-label="Report period">
            ${["week", "month", "year"].map(mode => `<button class="tiny-btn ${state.reportMode === mode ? "active" : ""}" data-action="set-report-mode" data-mode="${mode}">${mode}</button>`).join("")}
          </div>
        </div>
        <div class="form-actions" style="margin-top:12px;">
          <button class="ghost-btn" data-action="report-prev-period">Previous</button>
          <button class="ghost-btn" data-action="report-next-period">Next</button>
        </div>
      </div>
      <div id="reportOutput" class="stack">
        <div class="empty-state">Loading current week...</div>
      </div>
    </div>
  `;
  setTimeout(() => loadReport().catch(showError), 0);
}

async function loadReport() {
  const [start, end] = state.reportRange || periodRange();
  if (!start || !end || start > end) throw new Error("Choose a valid date range.");
  state.reportRange = [start, end];
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
  const filteredEntries = applyReportEntryFilters(entries);
  const foodRows = foodFrequencyRows(filteredEntries);
  const rolling = rollingCalorieAverage(byDate);
  const mealSplit = caloriesByMeal(entries);
  const weekday = weekdayWeekendStats(entries);
  const topCalories = topNutrientSources(entries, "kcal").slice(0, 5);
  const topProtein = topNutrientSources(entries, "protein").slice(0, 5);
  const output = document.getElementById("reportOutput");
  output.innerHTML = `
    <div class="grid-4">
      ${metricCard("Average kcal/day", `${round(avg.kcal, 0)}`, `${round(total.kcal, 0)} kcal total`)}
      ${metricCard("Average protein", `${round(avg.protein)} g`, `${round(total.protein)} g total`)}
      ${metricCard("Macro split", `${round(macro.proteinPct, 0)} / ${round(macro.carbsPct, 0)} / ${round(macro.fatPct, 0)}%`, "Protein / carbs / fat")}
      ${metricCard("Weekly difference", `${round(total.kcal - state.settings.calorieGoal * days, 0)} kcal`, `vs ${round(state.settings.calorieGoal * days, 0)} kcal goal`)}
      ${metricCard("Rolling kcal", `${round(rolling.at(-1)?.average || 0, 0)}`, "3-day average")}
      ${metricCard("Weekday avg", `${round(weekday.weekdayAvg, 0)} kcal`, "Monday-Friday")}
      ${metricCard("Weekend avg", `${round(weekday.weekendAvg, 0)} kcal`, "Saturday-Sunday")}
      ${metricCard("Top protein source", topProtein[0]?.name || "None", `${round(topProtein[0]?.value || 0)} g`)}
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

    <div class="grid-2">
      <div class="card chart-card">
        <h3>Rolling average</h3>
        <canvas id="rollingChart"></canvas>
      </div>
      <div class="card chart-card">
        <h3>Calories by meal</h3>
        <canvas id="mealChart"></canvas>
      </div>
    </div>

    <div class="card chart-card">
      <h3>Nutrient trends</h3>
      <canvas id="nutrientTrendChart"></canvas>
    </div>

    <div class="grid-2">
      <div class="card">
        <h3>Top calorie sources</h3>
        <div class="table-wrap"><table><thead><tr><th>Food</th><th>kcal</th></tr></thead><tbody>${topCalories.map(row => `<tr><td>${safeText(row.name)}</td><td>${round(row.value, 0)}</td></tr>`).join("") || `<tr><td colspan="2">No entries.</td></tr>`}</tbody></table></div>
      </div>
      <div class="card">
        <h3>Top protein sources</h3>
        <div class="table-wrap"><table><thead><tr><th>Food</th><th>Protein</th></tr></thead><tbody>${topProtein.map(row => `<tr><td>${safeText(row.name)}</td><td>${round(row.value)} g</td></tr>`).join("") || `<tr><td colspan="2">No entries.</td></tr>`}</tbody></table></div>
      </div>
    </div>

    <div class="card">
      <h3>Food frequency</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Food</th><th>Times</th><th>Units/servings</th><th>Brand</th><th>Source</th><th>Total kcal</th><th>Avg kcal/day</th></tr></thead>
          <tbody>${foodRows.length ? foodRows.map(row => `<tr><td>${safeText(row.name)}</td><td>${row.count}</td><td>${safeText(row.units)}</td><td>${safeText(row.brand || "")}</td><td>${safeText(row.source || "")}</td><td>${round(row.kcal, 0)}</td><td>${round(row.kcal / days, 0)}</td></tr>`).join("") : `<tr><td colspan="7">No entries in this range.</td></tr>`}</tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <h3>Micronutrients and limits</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Nutrient</th><th>Consumed</th><th>Period guidance</th><th>Difference</th></tr></thead>
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
    const current = map.get(key) || { name: key, count: 0, grams: 0, kcal: 0, unitsMap: new Map(), brand: entry.brandSnapshot || "", source: entry.source || entry.itemType || "" };
    current.count += 1;
    current.grams += number(entry.gramsEquivalent || (entry.unit === "g" ? entry.amount : 0));
    current.kcal += number(entry.nutrientsSnapshot?.kcal);
    const unitLabel = `${round(entry.amount)} ${entry.unit || ""}`.trim();
    current.unitsMap.set(unitLabel, (current.unitsMap.get(unitLabel) || 0) + 1);
    map.set(key, current);
  }
  return [...map.values()].map(row => ({
    ...row,
    units: [...row.unitsMap.entries()].map(([unit, count]) => `${count}x ${unit}`).join(", ")
  })).sort((a, b) => b.kcal - a.kcal);
}

function applyReportEntryFilters(entries) {
  const meal = document.getElementById("reportMealFilter")?.value || "all";
  const brand = normalizeSearchText(document.getElementById("reportBrandFilter")?.value || "");
  const source = normalizeSearchText(document.getElementById("reportSourceFilter")?.value || "");
  return entries.filter(entry => {
    if (meal !== "all" && entry.meal !== meal) return false;
    if (brand && !normalizeSearchText(entry.brandSnapshot).includes(brand)) return false;
    if (source && !normalizeSearchText(entry.source || entry.itemType).includes(source)) return false;
    return true;
  });
}

function rollingCalorieAverage(byDate) {
  const labels = Object.keys(byDate);
  return labels.map((date, index) => {
    const slice = labels.slice(Math.max(0, index - 2), index + 1);
    const total = slice.reduce((sum, day) => sum + number(byDate[day].kcal), 0);
    return { date, average: total / slice.length };
  });
}

function caloriesByMeal(entries) {
  const totals = Object.fromEntries(MEALS.map(([id, label]) => [label, 0]));
  for (const entry of entries) {
    const label = MEALS.find(([id]) => id === entry.meal)?.[1] || entry.meal || "Other";
    totals[label] = number(totals[label]) + number(entry.nutrientsSnapshot?.kcal);
  }
  return totals;
}

function weekdayWeekendStats(entries) {
  const days = new Map();
  for (const entry of entries) {
    const current = days.get(entry.date) || 0;
    days.set(entry.date, current + number(entry.nutrientsSnapshot?.kcal));
  }
  const weekdayVals = [];
  const weekendVals = [];
  for (const [date, kcal] of days.entries()) {
    const day = new Date(`${date}T12:00:00`).getDay();
    (day === 0 || day === 6 ? weekendVals : weekdayVals).push(kcal);
  }
  const avg = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  return { weekdayAvg: avg(weekdayVals), weekendAvg: avg(weekendVals) };
}

function topNutrientSources(entries, key) {
  const map = new Map();
  for (const entry of entries) {
    const name = entry.nameSnapshot || "Unnamed";
    map.set(name, (map.get(name) || 0) + number(entry.nutrientsSnapshot?.[key]));
  }
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function renderMicroRows(total, days) {
  const rows = [
    ["fiber", state.settings.fiberGoal * days, "min"],
    ["sugar", state.settings.sugarGoal * days, "max"],
    ["sodium", state.settings.sodiumMax * days, "max"],
    ...Object.entries(state.settings.micronutrientGoals || {})
      .filter(([key]) => !["sodium", "salt"].includes(key))
      .map(([key, value]) => [key, number(value.target) * days, value.mode || "min"])
  ].filter(([key]) => nutrientVisible(key));
  return rows.map(([key, target, mode]) => {
    const consumed = number(total[key]);
    const diff = consumed - target;
    const unit = NUTRIENT_UNITS[key];
    const badgeClass = mode === "max" ? (diff > 0 ? "orange" : "") : (diff >= 0 ? "" : "orange");
    return `<tr><td>${NUTRIENT_LABELS[key]}</td><td>${round(consumed, key === "sodium" ? 0 : 1)} ${unit}</td><td>${round(target, key === "sodium" ? 0 : 1)} ${unit}</td><td><span class="badge ${badgeClass}">${diff >= 0 ? "+" : ""}${round(diff, key === "sodium" ? 0 : 1)} ${unit}</span></td></tr>`;
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
  const rolling = rollingCalorieAverage(byDate).map(row => round(row.average, 0));
  const fiber = labels.map(d => round(byDate[d].fiber, 1));
  const sugar = labels.map(d => round(byDate[d].sugar, 1));
  const calorieCtx = document.getElementById("calorieChart");
  const macroCtx = document.getElementById("macroChart");
  const rollingCtx = document.getElementById("rollingChart");
  const mealCtx = document.getElementById("mealChart");
  const trendCtx = document.getElementById("nutrientTrendChart");
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
  if (rollingCtx) {
    state.charts.rolling = new Chart(rollingCtx, {
      type: "line",
      data: { labels, datasets: [{ label: "3-day kcal average", data: rolling, tension: .35 }] },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
  if (mealCtx) {
    const meals = caloriesByMeal(state.reportEntries);
    state.charts.meal = new Chart(mealCtx, {
      type: "doughnut",
      data: { labels: Object.keys(meals), datasets: [{ label: "kcal", data: Object.values(meals).map(value => round(value, 0)) }] },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
  if (trendCtx) {
    state.charts.trend = new Chart(trendCtx, {
      type: "line",
      data: { labels, datasets: [{ label: "Fiber", data: fiber, tension: .35 }, { label: "Sugar", data: sugar, tension: .35 }] },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
}

async function exportEntries(format, caloriesOnly = false) {
  const [start, end] = state.reportRange || periodRange();
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

  const header = ["date", "meal", "item_name", "brand", "amount", "unit", "grams", "kcal", "protein", "carbs", "sugar", "fat", "saturated_fat", "fiber", "sodium", "source"];
  const rows = entries.map(e => {
    const n = normalizeNutrients(e.nutrientsSnapshot);
    return [
      e.date, e.meal, e.nameSnapshot, e.brandSnapshot || "", e.amount, e.unit, e.gramsEquivalent || "",
      n.kcal, n.protein, n.carbs, n.sugar, n.fat, n.saturatedFat, n.fiber, n.sodium, e.source || e.itemType
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

function infoButton(text) {
  return `<button class="info-btn" type="button" data-action="show-info" data-info="${safeText(text)}" aria-label="More information">i</button>`;
}

function settingLabel(label, info, inputHTML) {
  return `
    <label>
      <span class="label-row">${safeText(label)} ${infoButton(info)}</span>
      ${inputHTML}
    </label>
  `;
}

function renderSettingsV2() {
  const s = state.settings;
  const macroMode = s.macroGoalMode === "percent" ? "percent" : "manual";
  const microKeys = ["fiber", "sugar", "sodium", "calcium", "iron", "potassium", "magnesium", "vitaminA", "vitaminC", "vitaminD", "vitaminB12"];
  const macroGoals = effectiveMacroGoals(s);
  const macroPercents = {
    protein: number(s.macroPercentProtein, round(macroGoals.proteinGoal * 4 / Math.max(1, s.calorieGoal) * 100, 1)),
    carbs: number(s.macroPercentCarbs, round(macroGoals.carbsGoal * 4 / Math.max(1, s.calorieGoal) * 100, 1)),
    fat: number(s.macroPercentFat, round(macroGoals.fatGoal * 9 / Math.max(1, s.calorieGoal) * 100, 1))
  };

  const macroGoalCard = (key, label, gramsValue, percentValue, colorClass) => `
    <article class="macro-goal-card ${colorClass}">
      <div class="macro-goal-head">
        <span>${safeText(label)}</span>
        <small data-macro-preview="${key}"></small>
      </div>
      ${macroMode === "percent"
        ? `<label>Percent<input name="macroPercent${label}" data-macro-percent="${key}" type="number" step="0.1" min="0" max="100" value="${round(percentValue, 1)}" /></label>
           <input name="${key}Goal" data-macro-gram="${key}" type="hidden" value="${round(gramsValue, 1)}" />`
        : `<label>Grams<input name="${key}Goal" data-macro-gram="${key}" type="number" step="1" min="0" value="${round(gramsValue, 1)}" /></label>
           <input name="macroPercent${label}" data-macro-percent="${key}" type="hidden" value="${round(percentValue, 1)}" />`}
    </article>
  `;

  const preferenceControl = (label, inputHTML) => `
    <label>
      <span class="label-row">${safeText(label)}</span>
      ${inputHTML}
    </label>
  `;

  els.pages.settings.innerHTML = `
    <form id="settingsForm" class="stack">
      <div class="card macro-settings-card">
        <div class="meal-head">
          <div>
            <h3>Macro goals</h3>
            <p>Choose whether you want to edit macro targets in grams or percentage.</p>
          </div>
          <div class="segmented" aria-label="Macro input mode">
            <button type="button" class="tiny-btn ${macroMode === "manual" ? "active" : ""}" data-action="set-macro-mode" data-mode="manual">grams</button>
            <button type="button" class="tiny-btn ${macroMode === "percent" ? "active" : ""}" data-action="set-macro-mode" data-mode="percent">percent</button>
          </div>
        </div>
        <input type="hidden" name="macroGoalMode" value="${macroMode}" />
        <div class="calorie-goal-row">
          <label>Calories / day<input name="calorieGoal" type="number" min="0" value="${s.calorieGoal}" /></label>
        </div>
        <div class="macro-goal-grid">
          ${macroGoalCard("protein", "Protein", macroGoals.proteinGoal, macroPercents.protein, "protein") }
          ${macroGoalCard("carbs", "Carbs", macroGoals.carbsGoal, macroPercents.carbs, "carbs") }
          ${macroGoalCard("fat", "Fat", macroGoals.fatGoal, macroPercents.fat, "fat") }
        </div>
      </div>

      <div class="card">
        <h3>App preferences</h3>
        <div class="form-grid">
          ${preferenceControl("Theme", `
            <select name="theme">
              ${["system", "light", "dark"].map(v => `<option value="${v}" ${s.theme === v ? "selected" : ""}>${v}</option>`).join("")}
            </select>
          `)}
          ${preferenceControl("Dashboard density", `
            <select name="dashboardDensity">
              ${["comfortable", "compact"].map(v => `<option value="${v}" ${s.dashboardDensity === v ? "selected" : ""}>${v}</option>`).join("")}
            </select>
          `)}
          ${preferenceControl("Search region", `
            <select name="searchRegion">
              ${["world", "germany", "us", "france", "uk"].map(v => `<option value="${v}" ${s.searchRegion === v ? "selected" : ""}>${v}</option>`).join("")}
            </select>
          `)}
          ${preferenceControl("Database preference", `
            <select name="databasePreference">
              ${[
                ["custom-first", "Personal first"],
                ["api-first", "API first"],
                ["offline-only", "Offline/cache only"]
              ].map(([value, label]) => `<option value="${value}" ${s.databasePreference === value ? "selected" : ""}>${label}</option>`).join("")}
            </select>
          `)}
        </div>
      </div>

      <div class="card">
        <h3>Micro goals</h3>
        <div class="form-grid">
          ${microKeys.map(key => {
            const value = key === "fiber" ? s.fiberGoal
              : key === "sugar" ? s.sugarGoal
              : key === "sodium" ? s.sodiumMax
              : s.micronutrientGoals[key]?.target ?? MICRO_DEFAULTS[key]?.target ?? 0;
            const unit = NUTRIENT_UNITS[key];
            return `
              <label>${safeText(NUTRIENT_LABELS[key])} (${safeText(unit)})
                <input name="micro_${key}_target" type="number" step="0.01" min="0" value="${value}" />
              </label>
            `;
          }).join("")}
        </div>
      </div>

      <div class="card stack sync-panel">
        <div class="meal-head">
          <div>
            <h3>Data and sync</h3>
            <p>${safeText(els.syncStatus?.textContent || "Offline")} with Firebase and local offline data.</p>
          </div>
          <span class="status-chip ${state.sync.status}">${safeText(els.syncStatus?.textContent || "Offline")}</span>
        </div>
        <div class="inline-actions">
          <button class="secondary-btn" type="button" data-action="resolve-sync-conflict">Check local/Firebase difference</button>
          <button class="secondary-btn" type="button" data-action="export-backup-json">Export backup JSON</button>
          <button class="secondary-btn" type="button" data-action="trigger-import">Import backup JSON</button>
          <button class="ghost-btn" type="button" data-action="settings-sign-out">Sign out</button>
          <button class="danger-btn" type="button" data-action="open-delete-all-data">Delete all data</button>
        </div>
        <input id="backupImportInput" class="hidden" type="file" accept="application/json" />
        <p class="form-message" id="settingsSaveMessage"></p>
      </div>

      <div class="card stack export-panel">
        <div>
          <h3>Exports</h3>
          <p>Regular exports are separated from backup import/export.</p>
        </div>
        <div class="export-grid">
          <div class="export-action"><button class="secondary-btn" type="button" data-action="export-full-csv">Full CSV</button>${infoButton("Exports every logged item in the selected report period with meal, amount, macros, sodium, and source.")}</div>
          <div class="export-action"><button class="secondary-btn" type="button" data-action="export-calories-csv">Calories CSV</button>${infoButton("Exports one row per day with total calories only. Useful for other apps that only need kcal totals.")}</div>
          <div class="export-action"><button class="ghost-btn" type="button" data-action="export-calories-json">Calories JSON</button>${infoButton("Exports the same daily calorie totals as JSON for app-to-app integrations.")}</div>
        </div>
      </div>
    </form>
  `;
  const form = document.getElementById("settingsForm");
  syncMacroGoalInputs(form);
  form?.addEventListener("input", event => {
    if (event.target.matches('[name="calorieGoal"], [data-macro-gram], [data-macro-percent]')) syncMacroGoalInputs(form, event.target);
  });
  form?.addEventListener("input", queueSettingsAutosave);
  form?.addEventListener("change", queueSettingsAutosave);
  document.getElementById("backupImportInput")?.addEventListener("change", importBackupFile);
}

function syncMacroGoalInputs(form, changed = null) {
  if (!form) return;
  const mode = form.elements.macroGoalMode?.value || "manual";
  const calories = Math.max(1, number(form.elements.calorieGoal?.value, state.settings.calorieGoal));
  const grams = {
    protein: form.elements.proteinGoal,
    carbs: form.elements.carbsGoal,
    fat: form.elements.fatGoal
  };
  const percents = {
    protein: form.elements.macroPercentProtein,
    carbs: form.elements.macroPercentCarbs,
    fat: form.elements.macroPercentFat
  };
  const kcalPerGram = { protein: 4, carbs: 4, fat: 9 };

  if (mode === "percent") {
    for (const key of Object.keys(grams)) {
      const pct = number(percents[key]?.value);
      const gramValue = round(calories * pct / 100 / kcalPerGram[key], 1);
      if (grams[key]) grams[key].value = gramValue;
      const preview = form.querySelector(`[data-macro-preview="${key}"]`);
      if (preview) preview.textContent = `${gramValue} g`;
    }
    return;
  }

  for (const key of Object.keys(percents)) {
    const gram = number(grams[key]?.value);
    const pctValue = round(gram * kcalPerGram[key] / calories * 100, 1);
    if (percents[key]) percents[key].value = pctValue;
    const preview = form.querySelector(`[data-macro-preview="${key}"]`);
    if (preview) preview.textContent = `${pctValue}%`;
  }
}

function collectSettingsFromForm(form) {
  syncMacroGoalInputs(form);
  const data = new FormData(form);
  const next = {
    ...state.settings,
    calorieGoal: number(data.get("calorieGoal"), state.settings.calorieGoal),
    proteinGoal: number(data.get("proteinGoal"), state.settings.proteinGoal),
    carbsGoal: number(data.get("carbsGoal"), state.settings.carbsGoal),
    fatGoal: number(data.get("fatGoal"), state.settings.fatGoal),
    fiberGoal: number(data.get("micro_fiber_target"), state.settings.fiberGoal),
    sugarGoal: number(data.get("micro_sugar_target"), state.settings.sugarGoal),
    sodiumMax: number(data.get("micro_sodium_target"), state.settings.sodiumMax),
    saltMax: round(number(data.get("micro_sodium_target"), state.settings.sodiumMax) / 400, 2),
    theme: String(data.get("theme") || "system"),
    searchRegion: String(data.get("searchRegion") || "world"),
    databasePreference: String(data.get("databasePreference") || "custom-first"),
    dashboardDensity: String(data.get("dashboardDensity") || "comfortable"),
    macroGoalMode: String(data.get("macroGoalMode") || "manual"),
    macroPercentProtein: number(data.get("macroPercentProtein"), 25),
    macroPercentCarbs: number(data.get("macroPercentCarbs"), 45),
    macroPercentFat: number(data.get("macroPercentFat"), 30),
    modules: { barcode: true, recipes: true, mealsets: true, micronutrients: true, graphs: true },
    nutrientVisibility: { sugar: true, fiber: true, sodium: true, saturatedFat: true, micronutrients: true },
    micronutrientGoals: structuredClone(state.settings.micronutrientGoals)
  };
  Object.keys(MICRO_DEFAULTS).forEach(key => {
    if (["fiber", "sugar", "sodium", "salt"].includes(key)) return;
    next.micronutrientGoals[key] = {
      target: number(data.get(`micro_${key}_target`), MICRO_DEFAULTS[key].target),
      mode: MICRO_DEFAULTS[key].mode
    };
  });
  next.micronutrientGoals.sodium = { target: next.sodiumMax, mode: "max" };
  next.micronutrientGoals.salt = { target: next.saltMax, mode: "max" };
  return mergeSettings(next);
}

function queueSettingsAutosave(event) {
  const form = event.currentTarget;
  clearTimeout(state.settingsSaveTimer);
  state.settingsSaveTimer = setTimeout(async () => {
    try {
      const next = collectSettingsFromForm(form);
      state.settings = next;
      setTheme();
      writeLocal("settings", next);
      await setDoc(userDoc("private", "settings"), cleanForFirestore(next), { merge: true });
      const message = document.getElementById("settingsSaveMessage");
      if (message) message.textContent = "Saved automatically.";
    } catch (error) {
      showError(error, "Could not save settings.");
    }
  }, 450);
}

function exportBackupJson() {
  const payload = {
    exportedAt: new Date().toISOString(),
    settings: state.settings,
    customFoods: state.customFoods,
    recipes: state.recipes,
    mealsets: state.mealsets,
    currentDate: state.currentDate,
    currentLogs: state.logs,
    reportEntries: state.reportEntries
  };
  downloadFile(`nutripilot_backup_${todayISO()}.json`, JSON.stringify(payload, null, 2), "application/json");
}

async function importBackupFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const payload = JSON.parse(text);
    if (!payload || typeof payload !== "object") throw new Error("Invalid backup file.");
    if (!confirm("Import this backup into Firebase? Existing ids in the backup will be overwritten.")) return;

    if (payload.settings) await setDoc(userDoc("private", "settings"), cleanForFirestore(mergeSettings(payload.settings)), { merge: true });

    for (const [collectionName, items] of [["customFoods", payload.customFoods], ["recipes", payload.recipes], ["mealsets", payload.mealsets]]) {
      for (const item of items || []) {
        const id = item.id || crypto.randomUUID();
        const copy = { ...item, updatedAt: Date.now() };
        delete copy.id;
        await setDoc(userDoc(collectionName, id), cleanForFirestore(copy), { merge: true });
      }
    }

    const entriesByKey = new Map();
    for (const entry of [...(payload.currentLogs || []), ...(payload.reportEntries || [])]) {
      const dateISO = entry.date || payload.currentDate || state.currentDate;
      const id = entry.id || crypto.randomUUID();
      entriesByKey.set(`${dateISO}:${id}`, { ...entry, id, date: dateISO });
    }

    const importedDates = new Set();
    for (const entry of entriesByKey.values()) {
      const id = entry.id;
      const copy = { ...entry, updatedAt: Date.now() };
      delete copy.id;
      await setDoc(entryDoc(id, entry.date), cleanForFirestore(copy), { merge: true });
      importedDates.add(entry.date);
    }

    for (const dateISO of importedDates) {
      await updateDailyCalorieSummary(dateISO).catch(console.warn);
    }

    showToast(`Backup imported. ${entriesByKey.size} log entries written.`);
  } catch (error) {
    showError(error, "Backup import failed.");
  } finally {
    event.target.value = "";
  }
}

async function clearCurrentLogs() {
  if (!confirm(`Delete all logs for ${state.currentDate}?`)) return;
  const snap = await getDocs(entryCollection(state.currentDate));
  for (const docSnap of snap.docs) await deleteDoc(entryDoc(docSnap.id, state.currentDate));
  writeLocal(`logs:${state.currentDate}`, []);
  await updateDailyCalorieSummary(state.currentDate, []);
  showToast("Current day logs cleared.");
}

async function clearCustomFoods() {
  if (!confirm("Delete all custom and used foods from your personal library?")) return;
  const snap = await getDocs(userCollection("customFoods"));
  for (const docSnap of snap.docs) await deleteDoc(userDoc("customFoods", docSnap.id));
  writeLocal("customFoods", []);
  showToast("Custom foods cleared.");
}

function openDeleteAllDataModal() {
  openModal(`
    <div class="modal">
      <div class="modal-head"><h3>Delete all data</h3><button class="close-btn" data-action="close-modal">x</button></div>
      <form id="deleteAllDataForm" class="modal-body">
        <p>This deletes settings, custom foods, recipes, mealsets, local offline data, and known logged days. Type <strong>DELETE</strong> to confirm.</p>
        <label>Confirmation<input name="confirmation" autocomplete="off" placeholder="DELETE" /></label>
        <div class="form-actions"><button class="danger-btn" type="submit">Delete all data</button></div>
      </form>
    </div>
  `);
  document.getElementById("deleteAllDataForm")?.addEventListener("submit", async event => {
    event.preventDefault();
    const confirmation = new FormData(event.currentTarget).get("confirmation");
    if (confirmation !== "DELETE") {
      showToast("Type DELETE to confirm.");
      return;
    }
    await deleteAllAccountData();
    closeModal();
  });
}

async function deleteAllAccountData() {
  const collectionNames = ["customFoods", "recipes", "mealsets"];
  for (const collectionName of collectionNames) {
    const snap = await getDocs(userCollection(collectionName));
    for (const docSnap of snap.docs) await deleteDoc(userDoc(collectionName, docSnap.id));
    writeLocal(collectionName, []);
  }
  const knownDates = new Set([state.currentDate, ...state.logs.map(entry => entry.date).filter(Boolean), ...state.reportEntries.map(entry => entry.date).filter(Boolean)]);
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(storageKey("logs:").replace("guest", state.user?.uid || "guest"))) {
      knownDates.add(key.split("logs:")[1]);
    }
  }
  for (const dateISO of knownDates) {
    if (!dateISO) continue;
    const snap = await getDocs(entryCollection(dateISO));
    for (const docSnap of snap.docs) await deleteDoc(entryDoc(docSnap.id, dateISO));
    writeLocal(`logs:${dateISO}`, []);
    await updateDailyCalorieSummary(dateISO, []).catch(console.warn);
  }
  await setDoc(userDoc("private", "settings"), cleanForFirestore(DEFAULT_SETTINGS), { merge: false });
  writeLocal("settings", DEFAULT_SETTINGS);
  state.logs = [];
  state.customFoods = [];
  state.recipes = [];
  state.mealsets = [];
  state.searchResults = [];
  state.reportEntries = [];
  showToast("All known account data was deleted.");
}

function showInfoPopover(button) {
  document.querySelectorAll(".info-popover").forEach(node => node.remove());
  const popover = document.createElement("div");
  popover.className = "info-popover";
  popover.textContent = button.dataset.info || "";
  document.body.appendChild(popover);
  const rect = button.getBoundingClientRect();
  popover.style.left = `${Math.min(window.innerWidth - popover.offsetWidth - 12, rect.left)}px`;
  popover.style.top = `${rect.bottom + 8}px`;
}

function openSyncConflictResolver() {
  const local = {
    settings: readLocal("settings", null),
    customFoods: readLocal("customFoods", []),
    recipes: readLocal("recipes", []),
    mealsets: readLocal("mealsets", []),
    logs: readLocal(`logs:${state.currentDate}`, [])
  };
  const remote = {
    settings: state.settings,
    customFoods: state.customFoods,
    recipes: state.recipes,
    mealsets: state.mealsets,
    logs: state.logs
  };
  const localFreshness = Math.max(collectionFreshness(local.customFoods), collectionFreshness(local.recipes), collectionFreshness(local.mealsets), collectionFreshness(local.logs));
  const remoteFreshness = Math.max(collectionFreshness(remote.customFoods), collectionFreshness(remote.recipes), collectionFreshness(remote.mealsets), collectionFreshness(remote.logs));
  const differs = JSON.stringify(local) !== JSON.stringify(remote);
  openModal(`
    <div class="modal">
      <div class="modal-head"><h3>Sync check</h3><button class="close-btn" data-action="close-modal">x</button></div>
      <div class="modal-body">
        <p>${differs ? "Local offline data and Firebase differ." : "Local offline data and Firebase currently match."}</p>
        <div class="grid-2">
          ${metricCard("Local offline data", localFreshness ? new Date(localFreshness).toLocaleString() : "No timestamp", `${local.logs.length} logs offline`)}
          ${metricCard("Firebase view", remoteFreshness ? new Date(remoteFreshness).toLocaleString() : "No timestamp", `${remote.logs.length} logs loaded`)}
        </div>
        <div class="form-actions">
          <button class="secondary-btn" data-action="use-local-cache">Use local cache</button>
          <button class="primary-btn" data-action="use-firebase-cache">Use Firebase copy</button>
        </div>
      </div>
    </div>
  `);
}

async function useLocalCacheForFirebase() {
  const settings = mergeSettings(readLocal("settings", state.settings));
  await setDoc(userDoc("private", "settings"), cleanForFirestore(settings), { merge: true });
  for (const [collectionName, items] of [["customFoods", readLocal("customFoods", [])], ["recipes", readLocal("recipes", [])], ["mealsets", readLocal("mealsets", [])]]) {
    for (const item of items || []) {
      const id = item.id || crypto.randomUUID();
      const copy = { ...item, updatedAt: Date.now() };
      delete copy.id;
      await setDoc(userDoc(collectionName, id), cleanForFirestore(copy), { merge: true });
    }
  }
  for (const entry of readLocal(`logs:${state.currentDate}`, [])) {
    const id = entry.id || crypto.randomUUID();
    const copy = { ...entry, updatedAt: Date.now() };
    delete copy.id;
    await setDoc(entryDoc(id, state.currentDate), cleanForFirestore(copy), { merge: true });
  }
  closeModal();
  showToast("Local offline data copied to Firebase.");
}

function useFirebaseForLocalCache() {
  writeLocal("settings", state.settings);
  writeLocal("customFoods", state.customFoods);
  writeLocal("recipes", state.recipes);
  writeLocal("mealsets", state.mealsets);
  writeLocal(`logs:${state.currentDate}`, state.logs);
  closeModal();
  showToast("Firebase copy saved offline.");
}

function openBarcodeModal() {
  if (!state.settings.modules.barcode) {
    showToast("Barcode module is disabled in Settings.");
    return;
  }
  const canScan = (("BarcodeDetector" in window) || window.ZXing?.BrowserMultiFormatReader) && navigator.mediaDevices?.getUserMedia;
  openModal(`
    <div class="modal">
      <div class="modal-head"><h3>Barcode lookup</h3><button class="close-btn" data-action="close-modal">x</button></div>
      <div class="modal-body">
        <div class="form-grid two">
          <label>Barcode<input id="barcodeInput" inputmode="numeric" placeholder="Barcode number" /></label>
          <label>&nbsp;<button class="primary-btn" data-action="lookup-barcode">Lookup barcode</button></label>
        </div>
        ${canScan ? `
          <div class="video-box"><video id="barcodeVideo" muted playsinline></video></div>
          <button class="secondary-btn" data-action="start-barcode-scan">Start camera scan</button>
        ` : `<div class="empty-state">Camera barcode scanning is not available in this browser. Manual barcode lookup still works.</div>`}
      </div>
    </div>
  `);
}

async function startBarcodeScan() {
  const video = document.getElementById("barcodeVideo");
  if (!video) return;
  if (!("BarcodeDetector" in window) && window.ZXing?.BrowserMultiFormatReader) {
    const reader = new ZXing.BrowserMultiFormatReader();
    const result = await reader.decodeOnceFromVideoDevice(undefined, video);
    reader.reset();
    closeModal();
    await lookupBarcodeCached(result.getText());
    setRoute("search");
    return;
  }
  if (!("BarcodeDetector" in window)) throw new Error("Barcode scanning is not supported in this browser.");
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
        await lookupBarcodeCached(rawValue);
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
      <div class="modal-head"><h3>Edit entry</h3><button class="close-btn" type="button" data-action="close-modal">x</button></div>
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
    await updateDailyCalorieSummary(state.currentDate).catch(console.warn);
    closeModal();
  });
}

async function moveEntry(id) {
  const entry = state.logs.find(e => e.id === id);
  if (!entry) return;
  const meal = prompt(`Move to meal: breakfast, lunch, dinner, snack`, entry.meal);
  if (!MEALS.some(([id]) => id === meal)) return;
  await updateDoc(entryDoc(id), { meal, updatedAt: Date.now() });
  await updateDailyCalorieSummary(state.currentDate).catch(console.warn);
}

async function duplicateEntry(id) {
  const entry = state.logs.find(e => e.id === id);
  if (!entry) return;
  const copy = { ...entry, createdAt: Date.now(), updatedAt: Date.now() };
  delete copy.id;
  await addDoc(entryCollection(state.currentDate), cleanForFirestore(copy));
  await updateDailyCalorieSummary(state.currentDate).catch(console.warn);
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
    if (action === "show-info") {
      showInfoPopover(btn);
      return;
    }
    if (action === "go-search") {
      state.defaultLogMeal = btn.dataset.meal || state.defaultLogMeal || "breakfast";
      state.defaultLogDate = state.currentDate;
      setRoute("search");
    }
    if (action === "go-reports") setRoute("reports");
    if (action === "go-settings") setRoute("settings");
    if (action === "settings-sign-out") await signOut(auth);
    if (action === "change-date") {
      state.currentDate = addDaysISO(state.currentDate, number(btn.dataset.days));
      state.defaultLogDate = state.currentDate;
      subscribeLogsForCurrentDate();
    }
    if (action === "recent-search") await runFoodSearch(btn.dataset.query || "");
    if (action === "search-foods") await runFoodSearch(document.getElementById("foodSearchInput")?.value || "");
    if (action === "search-prev-page") {
      state.searchPage = Math.max(1, state.searchPage - 1);
      renderSearchV2();
    }
    if (action === "search-next-page") {
      state.searchPage += 1;
      renderSearchV2();
    }
    if (action === "open-custom-food-modal") openCustomFoodCreateModal();
    if (action === "open-barcode-modal") openBarcodeModal();
    if (action === "lookup-barcode") {
      await lookupBarcodeCached(document.getElementById("barcodeInput")?.value || "");
      closeModal();
      setRoute("search");
    }
    if (action === "start-barcode-scan") await startBarcodeScan();
    if (action === "log-food") openLogFoodModal(getFoodByKey(btn.dataset.key));
    if (action === "food-detail") openFoodDetailModal(getFoodByKey(btn.dataset.key));
    if (action === "save-api-food") await saveApiFoodAsCustom(btn.dataset.key);
    if (action === "toggle-favorite-food") await toggleFavoriteFood(btn.dataset.id);
    if (action === "edit-custom-food") openCustomFoodEditor(state.customFoods.find(food => food.id === btn.dataset.id));
    if (action === "duplicate-custom-food") openCustomFoodEditor(state.customFoods.find(food => food.id === btn.dataset.id), true);
    if (action === "delete-custom-food" && confirm("Delete this custom food?")) await deleteDoc(userDoc("customFoods", btn.dataset.id));
    if (action === "delete-entry") {
      await deleteDoc(entryDoc(btn.dataset.id));
      await updateDailyCalorieSummary(state.currentDate).catch(console.warn);
    }
    if (action === "edit-entry") await editEntry(btn.dataset.id);
    if (action === "move-entry") await moveEntry(btn.dataset.id);
    if (action === "duplicate-entry") await duplicateEntry(btn.dataset.id);
    if (action === "create-recipe") await createRecipe();
    if (action === "create-mealset") await createMealset();
    if (action === "detail-recipe") openTargetDetail("recipe", btn.dataset.id);
    if (action === "detail-mealset") openTargetDetail("mealset", btn.dataset.id);
    if (action === "edit-recipe") openTargetEditor("recipe", btn.dataset.id);
    if (action === "edit-mealset") openTargetEditor("mealset", btn.dataset.id);
    if (action === "duplicate-recipe") await duplicateTarget("recipe", btn.dataset.id);
    if (action === "duplicate-mealset") await duplicateTarget("mealset", btn.dataset.id);
    if (action === "delete-recipe" && confirm("Delete this recipe?")) await deleteDoc(userDoc("recipes", btn.dataset.id));
    if (action === "delete-mealset" && confirm("Delete this mealset?")) await deleteDoc(userDoc("mealsets", btn.dataset.id));
    if (action === "add-ingredient") openIngredientModal(btn.dataset.kind, btn.dataset.id);
    if (action === "ingredient-search") {
      const query = document.getElementById("ingredientSearchInput")?.value || "";
      const results = await runFoodSearch(query, { updateState: false });
      const root = document.getElementById("ingredientResults");
      root.innerHTML = results.map(food => renderIngredientResult(food, registerTempFood(food), btn.dataset.kind, btn.dataset.id)).join("") || `<div class="empty-state">No results.</div>`;
    }
    if (action === "show-custom-ingredients") {
      const recipePortions = state.recipes.filter(recipe => !(btn.dataset.kind === "recipe" && recipe.id === btn.dataset.id)).map(recipePortionAsFood);
      document.getElementById("ingredientResults").innerHTML = [
        ...recipePortions,
        ...state.customFoods
      ].map(food => renderIngredientResult(food, registerTempFood(food), btn.dataset.kind, btn.dataset.id)).join("") || `<div class="empty-state">No custom foods yet.</div>`;
    }
    if (action === "select-ingredient") openIngredientAmountModal(getFoodByKey(btn.dataset.key), btn.dataset.kind, btn.dataset.id);
    if (action === "edit-target-item") openTargetItemAmountEditor(btn.dataset.kind, btn.dataset.id, btn.dataset.index);
    if (action === "remove-target-item") await removeTargetItem(btn.dataset.kind, btn.dataset.id, btn.dataset.index);
    if (action === "log-recipe") openLogRecipeModal(state.recipes.find(r => r.id === btn.dataset.id));
    if (action === "log-mealset") openLogMealsetModal(state.mealsets.find(m => m.id === btn.dataset.id));
    if (action === "set-report-mode") {
      state.reportMode = btn.dataset.mode || "week";
      state.reportRange = periodRange();
      renderReportsShell();
    }
    if (action === "report-prev-period" || action === "report-next-period") {
      shiftReportPeriod(action === "report-prev-period" ? -1 : 1);
      renderReportsShell();
    }
    if (action === "load-report") await loadReport();
    if (action === "export-full-csv") await exportEntries("csv", false);
    if (action === "export-calories-csv") await exportEntries("csv", true);
    if (action === "export-calories-json") await exportEntries("json", true);
    if (action === "set-macro-mode") {
      const form = document.getElementById("settingsForm");
      if (form?.elements.macroGoalMode) form.elements.macroGoalMode.value = btn.dataset.mode || "manual";
      syncMacroGoalInputs(form);
      if (form) state.settings = collectSettingsFromForm(form);
      state.settings.macroGoalMode = btn.dataset.mode || "manual";
      writeLocal("settings", state.settings);
      setDoc(userDoc("private", "settings"), cleanForFirestore(state.settings), { merge: true }).catch(console.warn);
      renderSettingsV2();
    }
    if (action === "export-backup-json") exportBackupJson();
    if (action === "trigger-import") document.getElementById("backupImportInput")?.click();
    if (action === "clear-current-logs") await clearCurrentLogs();
    if (action === "clear-custom-foods") await clearCustomFoods();
    if (action === "open-delete-all-data") openDeleteAllDataModal();
    if (action === "resolve-sync-conflict") openSyncConflictResolver();
    if (action === "use-local-cache") await useLocalCacheForFirebase();
    if (action === "use-firebase-cache") useFirebaseForLocalCache();
  } catch (error) {
    showError(error);
  }
}


document.addEventListener("submit", async event => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  try {
    if (form.id === "createRecipeForm") {
      event.preventDefault();
      await saveRecipeFromForm(form);
    }
    if (form.id === "createMealsetForm") {
      event.preventDefault();
      await saveMealsetFromForm(form);
    }
  } catch (error) {
    showError(error);
  }
});

document.addEventListener("click", handleClick);
document.addEventListener("click", event => {
  if (!event.target.closest(".info-btn") && !event.target.closest(".info-popover")) {
    document.querySelectorAll(".info-popover").forEach(node => node.remove());
  }
});

els.authForm.addEventListener("submit", async event => {
  event.preventDefault();
  try {
    els.authMessage.textContent = "";
    await signInWithEmailAndPassword(auth, els.emailInput.value, els.passwordInput.value);
  } catch (error) {
    els.authMessage.textContent = error.message;
  }
});

els.signOutBtn.addEventListener("click", () => signOut(auth));

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  state.installPrompt = event;
});

window.addEventListener("online", () => {
  updateSyncStatus({ online: true, fromCache: false });
  showToast("Back online. Firebase sync will resume.");
});

window.addEventListener("offline", () => {
  updateSyncStatus({ online: false });
  showToast("Offline mode active. Saved data remains available.");
});

onAuthStateChanged(auth, user => {
  state.user = user;
  document.body.classList.toggle("auth-active", !user);
  els.authView.classList.toggle("hidden", !!user);
  els.appView.classList.toggle("hidden", !user);
  els.signOutBtn.classList.add("hidden");
  if (user) {
    hydrateUserCache(user.uid);
    setTheme();
    subscribeUserData();
    setRoute(state.route);
  } else {
    state.unsubs.forEach(unsub => unsub());
    if (state.unsubLogs) state.unsubLogs();
    state.logs = [];
    state.customFoods = [];
    state.recipes = [];
    state.mealsets = [];
    state.searchResults = [];
    state.recentSearches = [];
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").then(reg => {
    reg.addEventListener("updatefound", () => {
      const worker = reg.installing;
      worker?.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          showToast("Update ready. Reload to use the newest NutriPilot.");
        }
      });
    });
  }).catch(console.warn));
}
