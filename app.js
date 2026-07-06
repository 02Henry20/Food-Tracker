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
const API_SEARCH_RESULT_LIMIT = 100;
const REPORT_CACHE_VERSION = 2;
const REPORT_RECALC_DEBOUNCE_MS = 650;
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

const SEARCH_REGIONS = [
  ["world", "World / global", "world.openfoodfacts.org"],
  ["germany", "Germany", "de.openfoodfacts.org"],
  ["austria", "Austria", "at.openfoodfacts.org"],
  ["switzerland", "Switzerland", "ch.openfoodfacts.org"],
  ["france", "France", "fr.openfoodfacts.org"],
  ["belgium", "Belgium", "be.openfoodfacts.org"],
  ["netherlands", "Netherlands", "nl.openfoodfacts.org"],
  ["luxembourg", "Luxembourg", "lu.openfoodfacts.org"],
  ["italy", "Italy", "it.openfoodfacts.org"],
  ["spain", "Spain", "es.openfoodfacts.org"],
  ["portugal", "Portugal", "pt.openfoodfacts.org"],
  ["uk", "United Kingdom", "uk.openfoodfacts.org"],
  ["ireland", "Ireland", "ie.openfoodfacts.org"],
  ["us", "United States", "us.openfoodfacts.org"],
  ["canada", "Canada", "ca.openfoodfacts.org"],
  ["mexico", "Mexico", "mx.openfoodfacts.org"],
  ["brazil", "Brazil", "br.openfoodfacts.org"],
  ["argentina", "Argentina", "ar.openfoodfacts.org"],
  ["australia", "Australia", "au.openfoodfacts.org"],
  ["new-zealand", "New Zealand", "nz.openfoodfacts.org"],
  ["japan", "Japan", "jp.openfoodfacts.org"],
  ["south-korea", "South Korea", "kr.openfoodfacts.org"],
  ["china", "China", "cn.openfoodfacts.org"],
  ["india", "India", "in.openfoodfacts.org"],
  ["turkey", "Turkey", "tr.openfoodfacts.org"],
  ["poland", "Poland", "pl.openfoodfacts.org"],
  ["czechia", "Czechia", "cz.openfoodfacts.org"],
  ["denmark", "Denmark", "dk.openfoodfacts.org"],
  ["sweden", "Sweden", "se.openfoodfacts.org"],
  ["norway", "Norway", "no.openfoodfacts.org"],
  ["finland", "Finland", "fi.openfoodfacts.org"],
  ["greece", "Greece", "gr.openfoodfacts.org"],
  ["romania", "Romania", "ro.openfoodfacts.org"],
  ["hungary", "Hungary", "hu.openfoodfacts.org"],
  ["slovakia", "Slovakia", "sk.openfoodfacts.org"],
  ["slovenia", "Slovenia", "si.openfoodfacts.org"],
  ["croatia", "Croatia", "hr.openfoodfacts.org"],
  ["israel", "Israel", "il.openfoodfacts.org"],
  ["south-africa", "South Africa", "za.openfoodfacts.org"],
  ["russia", "Russia", "ru.openfoodfacts.org"]
];

const NUTRIENT_LABELS = {
  kcal: "Calories",
  protein: "Protein",
  carbs: "Carbs",
  sugar: "Sugar",
  fat: "Fat",
  saturatedFat: "Saturated fat",
  transFat: "Trans fat",
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
  transFat: "g",
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
  dailyGoals: {},
  searchResults: [],
  searchResultsQuery: "",
  searchQuery: "",
  searchTab: "foods",
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
  ingredientSearch: {
    kind: null,
    id: null,
    query: "",
    mode: "food",
    page: 1,
    results: []
  },
  collapsedMeals: Object.fromEntries(MEALS.map(([id]) => [id, true])),
  recipeSectionsCollapsed: { recipes: true, mealsets: true },
  defaultLogMeal: "breakfast",
  defaultLogDate: todayISO(),
  reportEntries: [],
  reportData: null,
  reportRange: currentWeekRange(),
  reportMode: "week",
  reportBaseDate: todayISO(),
  reportMicroMode: "abs",
  reportFrequencyMode: "abs",
  reportSorts: {
    topSources: { key: "kcal", dir: "desc" },
    frequency: { key: "kcal", dir: "desc" },
    micros: { key: "name", dir: "asc" }
  },
  reportPages: {
    topSources: 1,
    frequency: 1
  },
  tempFoods: new Map(),
  charts: {},
  reportCacheJobs: new Map(),
  dailySummaryJobs: new Map(),
  targetDetailScroll: {},
  keyboardSelection: { search: -1, ingredient: -1 },
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
  settingsSaveTimer: null,
  dayGoalSaveTimer: null
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

function reportCacheDoc(key) {
  return userDoc("reportCaches", key);
}

function reportPeriodMeta(mode, baseISO = state.currentDate) {
  const safeMode = ["week", "month", "year"].includes(mode) ? mode : "week";
  const [start, end] = safeMode === "month"
    ? currentMonthRange(baseISO)
    : safeMode === "year"
      ? currentYearRange(baseISO)
      : currentWeekRange(baseISO);
  return { mode: safeMode, start, end, key: reportCacheKey(safeMode, start, end) };
}

function reportCacheKey(mode, start, end) {
  if (mode === "year") return `year_${start.slice(0, 4)}`;
  if (mode === "month") return `month_${start.slice(0, 7)}`;
  return `week_${start}_${end}`;
}

function affectedReportPeriods(dateISO) {
  return ["week", "month", "year"].map(mode => reportPeriodMeta(mode, dateISO));
}

function dailyGoalDoc(dateISO = state.currentDate) {
  return doc(db, ...userBasePath(), "dailyGoals", dateISO);
}

function goalSnapshotFromSettings(settings = state.settings) {
  return cleanForFirestore({
    calorieGoal: number(settings.calorieGoal, DEFAULT_SETTINGS.calorieGoal),
    proteinGoal: number(settings.proteinGoal, DEFAULT_SETTINGS.proteinGoal),
    carbsGoal: number(settings.carbsGoal, DEFAULT_SETTINGS.carbsGoal),
    fatGoal: number(settings.fatGoal, DEFAULT_SETTINGS.fatGoal),
    fiberGoal: number(settings.fiberGoal, DEFAULT_SETTINGS.fiberGoal),
    sugarGoal: number(settings.sugarGoal, DEFAULT_SETTINGS.sugarGoal),
    sodiumMax: number(settings.sodiumMax, DEFAULT_SETTINGS.sodiumMax),
    saltMax: number(settings.saltMax, DEFAULT_SETTINGS.saltMax),
    macroGoalMode: String(settings.macroGoalMode || "manual"),
    macroPercentProtein: number(settings.macroPercentProtein, DEFAULT_SETTINGS.macroPercentProtein),
    macroPercentCarbs: number(settings.macroPercentCarbs, DEFAULT_SETTINGS.macroPercentCarbs),
    macroPercentFat: number(settings.macroPercentFat, DEFAULT_SETTINGS.macroPercentFat),
    micronutrientGoals: settings.micronutrientGoals || structuredClone(MICRO_DEFAULTS),
    savedForDate: state.currentDate,
    updatedAt: Date.now()
  });
}

function effectiveGoalsForDate(dateISO = state.currentDate) {
  const day = state.dailyGoals?.[dateISO] || null;
  if (!day) return state.settings;
  return mergeSettings({
    ...state.settings,
    ...day,
    micronutrientGoals: {
      ...(state.settings.micronutrientGoals || {}),
      ...(day.micronutrientGoals || {})
    }
  });
}

async function loadDailyGoalForDate(dateISO = state.currentDate) {
  if (!state.user || !dateISO) return null;
  const cached = readLocal(`dailyGoal:${dateISO}`, null);
  if (cached) state.dailyGoals[dateISO] = cached;
  try {
    const snap = await getDoc(dailyGoalDoc(dateISO));
    if (snap.exists()) {
      state.dailyGoals[dateISO] = snap.data();
      writeLocal(`dailyGoal:${dateISO}`, state.dailyGoals[dateISO]);
      return state.dailyGoals[dateISO];
    }
  } catch (error) {
    console.warn("Daily goal load failed; using current settings.", error);
  }
  state.dailyGoals[dateISO] = cached || goalSnapshotFromSettings(state.settings);
  return state.dailyGoals[dateISO];
}

async function ensureDailyGoalSnapshot(dateISO = state.currentDate) {
  if (!state.user || !dateISO) return;
  try {
    const snap = await getDoc(dailyGoalDoc(dateISO));
    if (!snap.exists()) {
      const snapshot = goalSnapshotFromSettings(state.settings);
      snapshot.savedForDate = dateISO;
      state.dailyGoals[dateISO] = snapshot;
      writeLocal(`dailyGoal:${dateISO}`, snapshot);
      await setDoc(dailyGoalDoc(dateISO), cleanForFirestore(snapshot), { merge: true });
    }
  } catch (error) {
    console.warn("Daily goal snapshot could not be stored.", error);
  }
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
  state.recentSearches = [];
  state.dailyGoals[state.currentDate] = readLocal(`dailyGoal:${state.currentDate}`, null, uid) || state.dailyGoals[state.currentDate] || null;
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
  state.recentSearches = [];
  removeLocal("recentSearches");
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
  await ensureDailyGoalSnapshot(dateISO);
  const total = addNutrients(summaryEntries || []);
  const goalsSnapshot = goalSnapshotFromSettings(effectiveGoalsForDate(dateISO));
  goalsSnapshot.savedForDate = dateISO;
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
    goalsSnapshot,
    itemCount: summaryEntries?.length || 0,
    updatedAt: Date.now()
  }), { merge: true });
  scheduleReportRecalculationForDate(dateISO);
}

function queueDailySummaryUpdate(dateISO, entries = null, delay = 220) {
  if (!state.user || !dateISO) return;
  const existing = state.dailySummaryJobs.get(dateISO);
  if (existing?.timeout) clearTimeout(existing.timeout);
  const token = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
  const timeout = setTimeout(async () => {
    const job = state.dailySummaryJobs.get(dateISO);
    if (!job || job.token !== token) return;
    try {
      await updateDailyCalorieSummary(dateISO, entries);
    } catch (error) {
      console.warn("Daily summary background update failed.", error);
    } finally {
      const latest = state.dailySummaryJobs.get(dateISO);
      if (latest?.token === token) state.dailySummaryJobs.delete(dateISO);
    }
  }, delay);
  state.dailySummaryJobs.set(dateISO, { token, timeout });
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
  document.body.dataset.density = "comfortable";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolved === "dark" ? "#07111f" : "#f5f7fb");
  updateInAppIcons(resolved);
}

function updateInAppIcons() {
  const brandSrc = "icons/icon-96x96.png";
  const titleSrc = "icons/icon-48x48.png";
  document.querySelectorAll('.app-brand-icon').forEach(img => {
    img.src = brandSrc;
  });
  document.querySelectorAll('.page-title-icon').forEach(img => {
    img.src = titleSrc;
  });
}

function setRoute(route) {
  state.route = route;
  Object.entries(els.pages).forEach(([key, page]) => page.classList.toggle("active", key === route));
  document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.route === route));
  const title = { today: "Diary", search: "Search", recipes: "Recipes & Mealsets", reports: "Reports", settings: "Settings" }[route] || "NutriPilot";
  if (els.pageTitle) {
    els.pageTitle.innerHTML = `<img class="page-title-icon" src="icons/icon-48x48.png" alt="" aria-hidden="true" /><span class="page-title-text">${safeText(title)}</span>`;
    updateInAppIcons(document.documentElement.dataset.theme || "light");
  }
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
  if (state.unsubDailyGoal) state.unsubDailyGoal();
  const dateISO = state.currentDate;
  state.logs = readLocal(`logs:${dateISO}`, []);
  state.dailyGoals[dateISO] = readLocal(`dailyGoal:${dateISO}`, null) || state.dailyGoals[dateISO] || goalSnapshotFromSettings(state.settings);
  if (state.route === "today") renderToday();
  state.unsubDailyGoal = onSnapshot(dailyGoalDoc(dateISO), { includeMetadataChanges: true }, snap => {
    if (snap.exists()) {
      state.dailyGoals[dateISO] = snap.data();
      writeLocal(`dailyGoal:${dateISO}`, state.dailyGoals[dateISO]);
      if ((state.route === "today" || state.route === "settings") && state.currentDate === dateISO) renderCurrentRoute();
    }
  }, error => console.warn("Daily goal snapshot failed; using local settings.", error));
  state.unsubLogs = onSnapshot(entryCollection(dateISO), { includeMetadataChanges: true }, snap => {
    noteSnapshotMetadata(snap.metadata);
    if (state.currentDate !== dateISO) return;
    state.logs = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => number(a.createdAt) - number(b.createdAt));
    writeLocal(`logs:${dateISO}`, state.logs);
    if (!snap.metadata.hasPendingWrites) updateDailyCalorieSummary(dateISO, state.logs).catch(console.warn);
    if (state.route === "today") renderToday();
  }, error => {
    console.warn("Log snapshot failed; local cache remains active.", error);
    updateSyncStatus({ fromCache: true });
    if (state.route === "today") renderToday();
  });
}

function nutrientSummaryHTML(n) {
  return `
    <div class="badges macro-badges">
      <span class="badge kcal">${round(n.kcal, 0)} kcal</span>
      <span class="badge protein">P ${round(n.protein)}g</span>
      <span class="badge carbs">C ${round(n.carbs)}g</span>
      <span class="badge fat">F ${round(n.fat)}g</span>
    </div>
  `;
}

function macroSplitSummaryHTML(n) {
  const macro = macroCalories(n);
  const proteinPct = round(macro.proteinPct, 0);
  const carbsPct = round(macro.carbsPct, 0);
  const fatPct = round(macro.fatPct, 0);
  const proteinEnd = round(macro.proteinPct, 2);
  const carbsEnd = round(macro.proteinPct + macro.carbsPct, 2);
  return `
    <div class="macro-split-summary">
      <span class="macro-split-circle" style="--protein-end:${proteinEnd}%; --carbs-end:${carbsEnd}%;" aria-label="Macro split"></span>
      <div class="macro-split-values">
        <div class="macro-amounts">
          <span class="macro-chip protein">P ${round(n.protein)}g</span>
          <span class="macro-chip carbs">C ${round(n.carbs)}g</span>
          <span class="macro-chip fat">F ${round(n.fat)}g</span>
        </div>
        <div class="macro-percent-row">
          <span class="protein">P ${proteinPct}%</span>
          <span class="carbs">C ${carbsPct}%</span>
          <span class="fat">F ${fatPct}%</span>
        </div>
      </div>
    </div>
  `;
}

function itemFavoriteButton(kind, item) {
  const active = !!item.favorite;
  return `
    <button class="tiny-btn star-btn ${active ? "active" : ""}" type="button" data-action="toggle-favorite-${kind}" data-id="${item.id}" aria-label="${active ? "Unstar" : "Star"} ${safeText(item.name)}" title="${active ? "Unstar" : "Star"}"></button>
  `;
}

function sortFavoriteFirst(items) {
  return [...items].sort((a, b) => {
    const favoriteDiff = Number(!!b.favorite) - Number(!!a.favorite);
    if (favoriteDiff) return favoriteDiff;
    return String(a.name || "").localeCompare(String(b.name || ""));
  });
}

function libraryItemSearchParts(item) {
  return [
    item?.name,
    item?.notes,
    ...(item?.ingredients || []).map(i => i.nameSnapshot),
    ...(item?.items || []).map(i => i.nameSnapshot)
  ];
}

function searchLibraryItems(items, queryText) {
  const query = normalizeSearchText(queryText);
  const scored = sortFavoriteFirst(items)
    .map(item => ({ item, score: query ? searchMatchScore(libraryItemSearchParts(item), query) : 1 }))
    .filter(({ score }) => !query || score > 0)
    .sort((a, b) => {
      const scoreDiff = b.score - a.score;
      if (scoreDiff) return scoreDiff;
      const favoriteDiff = Number(!!b.item.favorite) - Number(!!a.item.favorite);
      if (favoriteDiff) return favoriteDiff;
      return String(a.item.name || "").localeCompare(String(b.item.name || ""));
    });
  return scored.map(({ item }) => item);
}

function ringPoint(radius, pct) {
  const clamped = Math.max(0, Math.min(100, number(pct)));
  const angle = clamped / 100 * Math.PI * 2;
  return {
    x: 100 + radius * Math.cos(angle),
    y: 100 + radius * Math.sin(angle)
  };
}

function ringDotHTML(radius, pct, className) {
  const point = ringPoint(radius, pct);
  return `<circle class="${safeText(className)}" cx="${round(point.x, 3)}" cy="${round(point.y, 3)}" r="6" />`;
}

function renderToday() {
  const total = addNutrients(state.logs);
  const goals = effectiveGoalsForDate(state.currentDate);
  const macroGoals = effectiveMacroGoals(goals);
  const kcalPctRaw = goals.calorieGoal ? total.kcal / goals.calorieGoal * 100 : 0;
  const kcalPct = Math.min(100, kcalPctRaw);
  const kcalOverPctRaw = goals.calorieGoal && total.kcal > goals.calorieGoal ? (total.kcal - goals.calorieGoal) / goals.calorieGoal * 100 : 0;
  const kcalOverPct = Math.min(100, kcalOverPctRaw);
  const kcalDotPct = Math.max(0.5, kcalPctRaw % 100 || (kcalPctRaw > 0 ? 100 : 0));
  const kcalOverDotPct = Math.max(0.5, kcalOverPctRaw % 100 || (kcalOverPctRaw > 0 ? 100 : 0));
  const remaining = goals.calorieGoal - total.kcal;
  const overCalories = remaining < 0;
  const circumference = 2 * Math.PI * 82;
  const offset = circumference - (kcalPct / 100) * circumference;
  const overCircumference = 2 * Math.PI * 68;
  const overOffset = overCircumference - (kcalOverPct / 100) * overCircumference;
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
          <button class="secondary-btn jump-today-btn icon-only" type="button" data-action="jump-today" aria-label="Jump to current date" title="Jump to current date"></button>
        </div>
      </div>

      <div class="card dashboard-hero ${overCalories ? "is-over-calories" : ""}">
        <div class="daily-kcal-stack">
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
              ${overCalories ? "" : ringDotHTML(82, kcalDotPct, "ring-dot ring-current-dot")}
              ${kcalOverPct ? `<circle class="ring-over" cx="100" cy="100" r="68" fill="none" stroke-width="8" stroke-dasharray="${overCircumference}" stroke-dashoffset="${overOffset}" />${ringDotHTML(68, kcalOverDotPct, "ring-dot ring-over-dot ring-current-dot")}` : ""}
            </svg>
            <div class="ring-center">
              <strong>${round(total.kcal, 0)}</strong>
              <span>/ ${round(goals.calorieGoal, 0)} kcal</span>
            </div>
          </div>
          <span class="pill hero-kcal-pill ${overCalories ? "is-over" : ""}">${remaining >= 0 ? `${round(remaining, 0)} kcal remaining` : `${round(Math.abs(remaining), 0)} kcal over`}</span>
        </div>
        <div class="daily-macro-panel">
          <div class="macro-circle-grid">
            ${macroRings}
          </div>
        </div>
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
  const overPct = Math.max(0, Math.min(100, goal && value > goal ? (value - goal) / goal * 100 : 0));
  const remaining = goal - value;
  const circleNumber = remaining >= 0 ? round(remaining) : round(Math.abs(remaining));
  const circleStatus = remaining >= 0 ? "left" : "over";
  return `
    <article class="macro-circle-card ${overPct ? "is-over" : ""}" style="--pct:${pct}%; --over-pct:${overPct}%; --ring-color:${color};">
      <div class="macro-circle">
        <div class="macro-circle-inner-text"><span class="macro-circle-number">${safeText(circleNumber)}</span><span class="macro-circle-status">${safeText(circleStatus)}</span></div>
      </div>
      <div>
        <h3>${safeText(label)}</h3>
        <p><span class="macro-current-value">${round(value)}</span> <span class="macro-divider">/</span> <span class="macro-target-value">${round(goal)}</span> g</p>
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

function metricCard(label, value, caption, status = "neutral", mobileCaption = "") {
  return `<div class="metric-card ${safeText(status)}"><span>${safeText(label)}</span><strong class="metric-value">${safeText(value)}</strong><small><span class="desktop-caption">${safeText(caption)}</span><span class="mobile-caption">${safeText(mobileCaption || caption)}</span></small></div>`;
}

function metricCardHTML(label, valueHTML, caption, status = "neutral", mobileCaption = "") {
  return `<div class="metric-card ${safeText(status)}"><span>${safeText(label)}</span><strong class="metric-value">${valueHTML}</strong><small><span class="desktop-caption">${safeText(caption)}</span><span class="mobile-caption">${safeText(mobileCaption || caption)}</span></small></div>`;
}

function renderMealCard(mealId, label) {
  const entries = state.logs.filter(entry => entry.meal === mealId);
  const total = addNutrients(entries);
  const collapsed = state.collapsedMeals[mealId] !== false;
  const summaryHTML = entries.length ? `
          <div class="meal-summary">
            <span class="meal-kcal">${round(total.kcal, 0)} kcal</span>
            <span class="meal-protein">P ${round(total.protein)}g</span>
            <span class="meal-carbs">C ${round(total.carbs)}g</span>
            <span class="meal-fat">F ${round(total.fat)}g</span>
          </div>` : "";
  return `
    <article class="meal-card meal-card-${safeText(mealId)}">
      <div class="meal-head">
        <div class="meal-title">
          <h3>${safeText(label)}</h3>
          ${summaryHTML}
        </div>
        <div class="meal-actions">
          ${entries.length ? `<button class="tiny-btn fold-btn" data-action="toggle-meal-foods" data-meal="${mealId}">${collapsed ? "Show" : "Hide"}</button>` : ""}
          <button class="tiny-btn" data-action="go-search" data-meal="${mealId}">+ Add</button>
        </div>
      </div>
      ${entries.length && !collapsed ? `<div class="food-list">${entries.map(renderLogEntry).join("")}</div>` : ""}
    </article>
  `;
}

function renderLogEntry(entry) {
  const n = normalizeNutrients(entry.nutrientsSnapshot);
  return `
    <div class="food-entry diary-log-entry">
      <div class="food-entry-head">
        <div class="food-entry-title">
          <strong>${safeText(entry.nameSnapshot)}</strong>
          <small>${round(entry.amount)} ${safeText(entry.unit)}${entry.gramsEquivalent ? ` · ${round(entry.gramsEquivalent)} g` : ""}</small>
        </div>
        <div class="entry-actions entry-head-actions">
          <button class="tiny-btn" data-action="edit-entry" data-id="${entry.id}">Edit</button>
          <button class="tiny-btn" data-action="delete-entry" data-id="${entry.id}">Delete</button>
        </div>
      </div>
      ${nutrientSummaryHTML(n)}
    </div>
  `;
}

function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeCompactSearchText(value) {
  return normalizeSearchText(value).replace(/[^a-z0-9äöüß]/gi, "");
}

function searchTokens(value) {
  return normalizeSearchText(value).split(/\s+/).filter(Boolean);
}

function searchMatchScore(parts, queryText) {
  const query = normalizeSearchText(queryText);
  const compactQuery = normalizeCompactSearchText(queryText);
  if (!query && !compactQuery) return 1;
  const haystack = normalizeSearchText((parts || []).filter(Boolean).join(" "));
  const compactHaystack = normalizeCompactSearchText(haystack);
  const tokens = searchTokens(query);
  let score = 0;

  if (haystack === query || compactHaystack === compactQuery) score += 1000;
  if (haystack.startsWith(query) || compactHaystack.startsWith(compactQuery)) score += 700;
  if (haystack.includes(query) || compactHaystack.includes(compactQuery)) score += 450;
  if (tokens.length && tokens.every(token => haystack.includes(token) || compactHaystack.includes(normalizeCompactSearchText(token)))) score += 260;
  if (tokens.length) {
    score += tokens.reduce((sum, token) => {
      const compactToken = normalizeCompactSearchText(token);
      if (haystack.startsWith(token) || compactHaystack.startsWith(compactToken)) return sum + 80;
      if (haystack.includes(token) || compactHaystack.includes(compactToken)) return sum + 45;
      return sum;
    }, 0);
  }
  return score;
}

function foodSearchParts(food) {
  return [food?.name, food?.brand, food?.barcode, food?.sourceId, food?.notes];
}


function looksLikeBarcode(value) {
  return /^\d{8,14}$/.test(String(value || "").replace(/\D/g, ""));
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

function searchRankForFood(food) {
  return number(food.usedCount) || number(food.eatenCount) || 0;
}

function foodSearchSort(a, b) {
  const favoriteDiff = Number(!!b.favorite) - Number(!!a.favorite);
  if (favoriteDiff) return favoriteDiff;
  const eatenDiff = searchRankForFood(b) - searchRankForFood(a);
  if (eatenDiff) return eatenDiff;
  return displayFoodName(a).localeCompare(displayFoodName(b));
}

function searchPersonalLibrary(queryText) {
  const query = normalizeSearchText(queryText);
  if (!query) return [];
  return state.customFoods
    .map(food => ({ food, score: searchMatchScore(foodSearchParts(food), query) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || foodSearchSort(a.food, b.food))
    .slice(0, API_SEARCH_RESULT_LIMIT)
    .map(({ food }) => markResultFood(food, resultKindForFood(food)));
}

function eatenFoodResults(queryText) {
  const query = normalizeSearchText(queryText);
  return state.customFoods
    .filter(food => searchRankForFood(food) > 0)
    .map(food => ({ food, score: query ? searchMatchScore(foodSearchParts(food), query) : 1 }))
    .filter(({ score }) => !query || score > 0)
    .sort((a, b) => b.score - a.score || searchRankForFood(b.food) - searchRankForFood(a.food) || displayFoodName(a.food).localeCompare(displayFoodName(b.food)))
    .map(({ food }) => markResultFood(food, "eaten"));
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
  // Search history chips were intentionally removed. Keep this as a no-op so
  // existing search flows do not persist or render last searched terms.
  state.recentSearches = [];
  markSearchStateSaved();
}

function openFoodFactsHost() {
  return SEARCH_REGIONS.find(([value]) => value === state.settings.searchRegion)?.[2] || "world.openfoodfacts.org";
}

function mergeFoodResults(localResults, apiResults, queryText = "") {
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
  const filtered = applySearchFilters([...map.values()]);
  const query = normalizeSearchText(queryText);
  if (!query) return filtered.sort(foodSearchSort);
  return filtered
    .map(food => ({ food, score: searchMatchScore(foodSearchParts(food), query) }))
    .filter(({ score, food }) => score > 0 || food.resultKind !== "database")
    .sort((a, b) => b.score - a.score || foodSearchSort(a.food, b.food))
    .map(({ food }) => food);
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
        <div class="search-bar search-bar-compact">
          <input id="foodSearchInput" type="search" placeholder="Name or barcode" aria-label="Food search" />
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
  const validTabs = ["foods", "eaten", "mealsets", "recipes"];
  const activeTab = validTabs.includes(state.searchTab) ? state.searchTab : "foods";
  const hasFoodQuery = !!normalizeSearchText(state.searchQuery);
  const combined = hasFoodQuery
    ? (state.searchResultsQuery === state.searchQuery && state.searchResults.length
      ? state.searchResults
      : mergeFoodResults(searchPersonalLibrary(state.searchQuery), getCachedSearch(state.searchQuery) || [], state.searchQuery))
    : [];
  const eatenResults = eatenFoodResults(state.searchQuery);
  const mealsetResults = searchLibraryItems(state.mealsets, state.searchQuery);
  const recipeResults = searchLibraryItems(state.recipes, state.searchQuery);
  const pagedTabs = { foods: combined, eaten: eatenResults, mealsets: mealsetResults, recipes: recipeResults };
  const activePagedResults = pagedTabs[activeTab] || [];
  const totalPages = Math.max(1, Math.ceil(activePagedResults.length / SEARCH_PAGE_SIZE));
  state.searchPage = Math.min(Math.max(1, state.searchPage || 1), totalPages);
  const pageStart = (state.searchPage - 1) * SEARCH_PAGE_SIZE;
  const pageResults = activePagedResults.slice(pageStart, pageStart + SEARCH_PAGE_SIZE);
  const pageInfo = activePagedResults.length ? `page ${state.searchPage} of ${totalPages}` : "";
  const activeMeta = {
    foods: ["Foods", pageInfo],
    eaten: ["Eaten foods", pageInfo],
    mealsets: ["Mealsets", pageInfo],
    recipes: ["Recipes", pageInfo]
  }[activeTab];
  const activeCards = {
    foods: pageResults.length ? pageResults.map(food => renderFoodResultCard(food, registerTempFood(food))).join("") : `<div class="empty-state">Search, scan a barcode, or add a custom food.</div>`,
    eaten: pageResults.length ? pageResults.map(food => renderEatenFoodCard(food, registerTempFood(food))).join("") : `<div class="empty-state">No eaten foods yet. Log foods to build this list.</div>`,
    mealsets: pageResults.length ? pageResults.map(renderMealsetSearchCard).join("") : `<div class="empty-state">No mealsets found.</div>`,
    recipes: pageResults.length ? pageResults.map(renderRecipeSearchCard).join("") : `<div class="empty-state">No recipes found.</div>`
  }[activeTab];

  els.pages.search.innerHTML = `
    <div class="stack">
      <div class="card stack search-panel">
        <div class="meal-head">
          <div>
            <h3>Find food</h3>
          </div>
          <button class="secondary-btn" data-action="open-custom-food-modal">Add custom food</button>
        </div>
        <div class="search-bar search-bar-compact">
          <input id="foodSearchInput" type="search" value="${safeText(state.searchQuery)}" placeholder="Name or barcode" autocomplete="off" aria-label="Food search" />
          <button class="primary-btn" data-action="search-foods" ${state.searchLoading ? "disabled" : ""}>${state.searchLoading ? "Searching..." : "Search"}</button>
          ${state.settings.modules.barcode ? `<button class="secondary-btn" data-action="open-barcode-modal">Barcode</button>` : ""}
        </div>
        ${state.searchFeedback || !navigator.onLine ? `<div class="loading-line">${safeText(state.searchFeedback || "Offline: showing personal and saved foods.")}</div>` : ""}
      </div>

      <div class="card stack">
        <div class="segmented search-tabs" aria-label="Search category">
          ${[
            ["foods", "Foods"],
            ["eaten", "Eaten"],
            ["mealsets", "Mealsets"],
            ["recipes", "Recipes"]
          ].map(([tab, label]) => `<button type="button" class="tiny-btn ${activeTab === tab ? "active" : ""}" data-action="set-search-tab" data-tab="${tab}">${label}</button>`).join("")}
        </div>
        <div class="meal-head">
          <h3>${activeMeta[0]}</h3>
          ${activeMeta[1] ? `<span class="kicker">${activeMeta[1]}</span>` : ""}
        </div>
        <div id="searchResults" class="result-grid">
          ${activeCards}
        </div>
        ${activePagedResults.length > SEARCH_PAGE_SIZE ? `
          <div class="pagination">
            <button class="ghost-btn" data-action="search-prev-page" ${state.searchPage <= 1 ? "disabled" : ""}>Previous</button>
            <span class="kicker">${pageStart + 1}-${Math.min(pageStart + SEARCH_PAGE_SIZE, activePagedResults.length)} of ${activePagedResults.length}</span>
            <button class="ghost-btn" data-action="search-next-page" ${state.searchPage >= totalPages ? "disabled" : ""}>Next</button>
          </div>
        ` : ""}
      </div>
    </div>
  `;

  document.getElementById("foodSearchInput")?.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      runActiveSearch(event.currentTarget.value).catch(showError);
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
  state.searchResults = mergeFoodResults(searchPersonalLibrary(state.searchQuery), getCachedSearch(state.searchQuery) || state.searchResults, state.searchQuery);
  renderSearchV2();
}

function nutrientInputHTML(key, nutrients = {}) {
  const rawValue = nutrients?.[key];
  const hasValue = rawValue !== undefined && rawValue !== null && rawValue !== "" && number(rawValue) !== 0;
  const valueAttr = hasValue ? ` value="${round(rawValue, 3)}"` : "";
  return `
    <label>${safeText(NUTRIENT_LABELS[key])} (${safeText(NUTRIENT_UNITS[key])}) / 100 g
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
    nutrientSectionHTML("Fats", "Total fat with saturated and trans fats as fat sub-values.", ["fat", "saturatedFat", "transFat"], nutrients),
    nutrientSectionHTML("Micronutrients", "Optional vitamins, minerals, and sodium. Salt is calculated from sodium.", ["sodium", "calcium", "iron", "potassium", "magnesium", "vitaminA", "vitaminC", "vitaminD", "vitaminB12"], nutrients)
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
  const createFoodForm = document.getElementById("customFoodForm");
  bindCustomServingUnit(createFoodForm);
  createFoodForm?.addEventListener("submit", saveCustomFood);
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

function renderRecipeSearchCard(recipe) {
  const n = normalizeNutrients(recipe.nutrientsPerPortion || scaleNutrients(recipe.totalNutrients, 1 / Math.max(1, recipe.portions || 1)));
  return `
    <div class="result-card used ${recipe.favorite ? "favorite" : ""}">
      <div>
        <h4>${safeText(recipe.name)}</h4>
        <p>${round(n.kcal, 0)} kcal / portion</p>
        ${nutrientSummaryHTML(n)}
      </div>
      <div class="inline-actions">
        ${itemFavoriteButton("recipe", recipe)}
        <button class="primary-btn" data-action="log-recipe" data-id="${recipe.id}">Log</button>
      </div>
    </div>
  `;
}

function renderMealsetSearchCard(mealset) {
  const n = normalizeNutrients(mealset.totalNutrients);
  return `
    <div class="result-card used ${mealset.favorite ? "favorite" : ""}">
      <div>
        <h4>${safeText(mealset.name)}</h4>
        <p>${round(n.kcal, 0)} kcal / mealset</p>
        ${nutrientSummaryHTML(n)}
      </div>
      <div class="inline-actions">
        ${itemFavoriteButton("mealset", mealset)}
        <button class="primary-btn" data-action="log-mealset" data-id="${mealset.id}">Log</button>
      </div>
    </div>
  `;
}

function renderEatenFoodCard(food, key) {
  const n = normalizeNutrients(food.nutrientsPer100g);
  const count = searchRankForFood(food);
  return `
    <div class="result-card eaten ${food.favorite ? "favorite" : ""}">
      <div>
        <h4>${safeText(displayFoodName(food))}</h4>
        <p>${count}x eaten${food.lastUsedAt ? ` · last ${new Date(number(food.lastUsedAt)).toLocaleDateString()}` : ""}</p>
        ${nutrientSummaryHTML(n)}
      </div>
      <div class="inline-actions">
        <button class="primary-btn" data-action="log-food" data-key="${safeText(key)}">Log</button>
        <button class="tiny-btn" data-action="food-detail" data-key="${safeText(key)}">Detail</button>
      </div>
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
      </div>
    </div>
  `;
}

function openFoodDetailModal(food) {
  if (!food) return;
  const warnings = foodDataWarnings(food);
  openModal(`
    <div class="modal food-detail-modal">
      <div class="modal-head"><h3>${safeText(displayFoodName(food))}</h3><button class="close-btn" data-action="close-modal">x</button></div>
      <div class="modal-body">
        <div class="badges">
          <span class="badge ${food.resultKind === "database" ? "blue" : food.resultKind === "personal" ? "green" : "orange"}">${safeText(food.resultKind || resultKindForFood(food))}</span>
          ${food.brand ? `<span class="badge gray">${safeText(food.brand)}</span>` : ""}
          ${food.barcode ? `<span class="badge gray">Barcode ${safeText(food.barcode)}</span>` : ""}
          <span class="badge gray">${safeText(food.source || "custom")}</span>
        </div>
        ${warnings.length ? `<div class="empty-state">${warnings.map(safeText).join(", ")}</div>` : ""}
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
        ${food.source === "custom" && food.id ? `
          <div class="form-actions custom-food-detail-actions">
            <button class="tiny-btn" type="button" data-action="edit-custom-food" data-id="${food.id}">Edit</button>
            <button class="danger-btn" type="button" data-action="delete-custom-food" data-id="${food.id}">Delete</button>
          </div>
        ` : ""}
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
      nutrientsPer100g: (() => {
        const n = normalizeNutrients(Object.fromEntries(NUTRIENT_KEYS.map(k => [k, data.get(k)])));
        n.salt = round(number(n.sodium) / 400, 3);
        return n;
      })(),
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

async function toggleFavoriteTarget(kind, id) {
  const isRecipe = kind === "recipe";
  const collectionName = isRecipe ? "recipes" : "mealsets";
  const target = (isRecipe ? state.recipes : state.mealsets).find(item => item.id === id);
  if (!target) return;
  await updateDoc(userDoc(collectionName, id), { favorite: !target.favorite, updatedAt: Date.now() });
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
        <button class="tiny-btn" data-action="food-detail" data-key="${safeText(key)}">Detail</button>
        ${food.source === "custom" ? "" : `<button class="tiny-btn" data-action="save-api-food" data-key="${safeText(key)}">Save</button>`}
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
  url.searchParams.set("page_size", String(API_SEARCH_RESULT_LIMIT));
  url.searchParams.set("fields", "code,product_name,brands,nutriments,serving_size,serving_quantity,quantity");

  showToast("Searching Open Food Facts…");
  const res = await fetch(url.toString(), { headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error("Open Food Facts search failed.");
  const data = await res.json();
  state.searchResults = (data.products || [])
    .map(normalizeOpenFoodFactsProduct)
    .filter(Boolean)
    .filter(food => food.nutrientsPer100g.kcal > 0)
    .slice(0, API_SEARCH_RESULT_LIMIT);
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
  state.searchResults = [food, ...state.searchResults.filter(f => f.barcode !== food.barcode)].slice(0, API_SEARCH_RESULT_LIMIT);
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
  url.searchParams.set("page_size", String(API_SEARCH_RESULT_LIMIT));
  url.searchParams.set("fields", "code,product_name,generic_name,abbreviated_product_name,brands,nutriments,serving_size,serving_quantity,quantity,product_quantity");
  const res = await fetch(url.toString(), { headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error("Open Food Facts search failed.");
  const data = await res.json();
  return (data.products || [])
    .map(normalizeOpenFoodFactsProduct)
    .filter(Boolean)
    .filter(food => food.nutrientsPer100g.kcal > 0)
    .slice(0, API_SEARCH_RESULT_LIMIT);
}

async function runFoodSearch(queryText, options = {}) {
  const query = String(queryText || "").trim();
  if (!query) {
    state.searchQuery = "";
    state.searchResultsQuery = "";
    state.searchPage = 1;
    state.searchResults = [];
    state.searchFeedback = "Enter a food name to search.";
    if (options.updateState !== false) renderSearchV2();
    return state.searchResults;
  }
  if (looksLikeBarcode(query) && options.barcodeLookup !== false) {
    state.searchQuery = query;
    state.searchResultsQuery = query;
    state.searchPage = 1;
    state.searchLoading = true;
    state.searchFeedback = "Looking up barcode.";
    if (options.updateState !== false) renderSearchV2();
    try {
      await lookupBarcodeCached(query, { updateState: false });
      return state.searchResults;
    } catch (error) {
      state.searchFeedback = "Barcode not found; searching food names.";
    } finally {
      state.searchLoading = false;
      if (options.updateState !== false) renderSearchV2();
    }
  }
  state.searchQuery = query;
  state.searchResultsQuery = query;
  state.searchPage = 1;
  const localResults = searchPersonalLibrary(query);
  const cached = getCachedSearch(query) || [];
  state.searchResults = mergeFoodResults(localResults, cached, query);
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
    state.searchResults = mergeFoodResults(localResults, apiResults, query);
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

async function runActiveSearch(queryText) {
  if (state.searchTab === "foods") return runFoodSearch(queryText);
  const query = String(queryText || "").trim();
  state.searchQuery = query;
  state.searchPage = 1;
  const label = state.searchTab === "recipes" ? "recipes" : state.searchTab === "eaten" ? "eaten foods" : "mealsets";
  state.searchFeedback = query ? `Filtering ${label}.` : state.searchTab === "eaten" ? "Showing eaten foods." : `Showing starred and saved ${label}.`;
  renderSearchV2();
  return [];
}

async function lookupBarcodeCached(barcode, options = {}) {
  const cleanBarcode = String(barcode || "").replace(/\D/g, "");
  if (!cleanBarcode) throw new Error("Enter a barcode first.");
  const cached = getCachedBarcode(cleanBarcode);
  if (cached) {
    state.searchTab = "foods";
    state.searchQuery = cleanBarcode;
    state.searchResultsQuery = cleanBarcode;
    state.searchResults = mergeFoodResults(searchPersonalLibrary(cleanBarcode), [cached], cleanBarcode);
    state.searchFeedback = "Barcode loaded from cache.";
    if (options.updateState !== false) renderSearchV2();
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
  state.searchTab = "foods";
  state.searchQuery = cleanBarcode;
  state.searchResultsQuery = cleanBarcode;
  state.searchResults = mergeFoodResults(searchPersonalLibrary(cleanBarcode), [food], cleanBarcode);
  state.searchFeedback = `Found ${displayFoodName(food)}.`;
  if (options.updateState !== false) renderSearchV2();
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
      transFat: nutriments["trans-fat_100g"],
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
  nutrientsPer100g.salt = round(number(nutrientsPer100g.sodium) / 400, 3);
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
    { label: "grams", grams: 1, mode: "grams", unit: "g" },
    { label: "100 g", grams: 100, mode: "serving", unit: "g" }
  ];
  for (const serving of food?.servingOptions || []) {
    const grams = number(serving.grams);
    if (grams > 0 && !options.some(option => normalizeSearchText(servingDisplayName(option)) === normalizeSearchText(servingDisplayName(serving)))) {
      options.push({ ...serving, grams, mode: "serving", unit: serving.unit || serving.label || "serving" });
    }
  }
  if (food?.defaultServing?.grams && !options.some(option => normalizeSearchText(servingDisplayName(option)) === normalizeSearchText(servingDisplayName(food.defaultServing)))) {
    options.push({ ...food.defaultServing, mode: "serving", unit: food.defaultServing.unit || food.defaultServing.label || "serving" });
  }
  return options;
}

function servingDisplayName(serving = {}) {
  if (serving.mode === "grams") return "grams";
  return String(serving.label || serving.unit || "serving").trim() || "serving";
}

function servingUnitName(serving = {}) {
  if (serving.mode === "grams") return "g";
  const unit = String(serving.unit || "").trim();
  return unit && normalizeSearchText(unit) !== "g" ? unit : servingDisplayName(serving);
}

function formNumberValue(value, fallback = 0) {
  const raw = value && typeof value === "object" && "value" in value ? value.value : value;
  if (raw === null || raw === undefined || raw === "") return fallback;
  const parsed = Number(String(raw).trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function preferredServingIndex(servingOptions = [], currentUnit = "", currentGrams = null, preferNonGram = true) {
  const options = servingOptions.length ? servingOptions : [{ label: "grams", grams: 1, mode: "grams", unit: "g" }];
  const unitText = normalizeSearchText(currentUnit);
  if (unitText) {
    const directIndex = options.findIndex(option => [servingDisplayName(option), servingUnitName(option), option.label, option.unit]
      .some(value => normalizeSearchText(value) === unitText));
    if (directIndex >= 0) return directIndex;
  }
  const grams = number(currentGrams, NaN);
  if (Number.isFinite(grams) && grams > 0) {
    const gramIndex = options.findIndex(option => option.mode !== "grams" && Math.abs(number(option.grams) - grams) < Math.max(0.5, grams * 0.01));
    if (gramIndex >= 0) return gramIndex;
  }
  if (preferNonGram) {
    const nonGramIndex = options.findIndex(option => option.mode !== "grams" && normalizeSearchText(servingDisplayName(option)) !== "100 g");
    if (nonGramIndex >= 0) return nonGramIndex;
  }
  const hundredGramIndex = options.findIndex(option => normalizeSearchText(servingDisplayName(option)) === "100 g");
  return hundredGramIndex >= 0 ? hundredGramIndex : 0;
}

function defaultAmountForServing(serving = {}, fallbackGrams = 100) {
  if (serving.mode === "grams") return fallbackGrams;
  return 1;
}

function gramsForServingAmount(serving = {}, amount = 0) {
  return serving.mode === "grams" ? number(amount) : number(amount) * number(serving.grams, 1);
}

function servingSelectionFromData(food, data, amountName = "amount", unitName = "unitIndex", fallbackAmount = 100) {
  const servingOptions = buildServingOptions(food);
  const selected = servingOptions[formNumberValue(data.get(unitName), preferredServingIndex(servingOptions, "", null, true))] || servingOptions[0];
  const amount = formNumberValue(data.get(amountName), defaultAmountForServing(selected, fallbackAmount));
  const grams = gramsForServingAmount(selected, amount);
  const unit = servingUnitName(selected);
  return { amount, selected, unit, grams };
}

function bindServingAmountDefaults(form, food) {
  if (!form || !food) return;
  const amountInput = form.elements.amount;
  const select = form.elements.unitIndex;
  const applyDefault = () => {
    const serving = buildServingOptions(food)[formNumberValue(select?.value, 0)] || buildServingOptions(food)[0];
    if (!amountInput || document.activeElement === amountInput) return;
    amountInput.value = defaultAmountForServing(serving);
  };
  select?.addEventListener("change", applyDefault);
}

function findCustomFoodForReference(ref = {}) {
  return state.customFoods.find(food => food.id && (food.id === ref.itemId || food.id === ref.sourceId || food.id === ref.id))
    || state.customFoods.find(food => ref.barcode && food.barcode === ref.barcode)
    || state.customFoods.find(food => normalizeSearchText(displayFoodName(food)) === normalizeSearchText(ref.nameSnapshot || ref.displayName || ref.name));
}

function foodLikeFromEntry(entry = {}) {
  const snapshot = entry.itemSnapshot || {};
  if ((entry.itemType && entry.itemType !== "food") || (snapshot.itemType && snapshot.itemType !== "food")) return null;
  const libraryFood = findCustomFoodForReference({ ...snapshot, ...entry });
  const grams = number(entry.gramsEquivalent || snapshot.gramsEquivalent);
  const derivedPer100g = grams > 0 ? scaleNutrients(entry.nutrientsSnapshot || snapshot.nutrientsSnapshot, 100 / grams) : null;
  const nutrientsPer100g = normalizeNutrients(snapshot.nutrientsPer100g || libraryFood?.nutrientsPer100g || derivedPer100g || {});
  if (!number(nutrientsPer100g.kcal) && !number(nutrientsPer100g.protein) && !number(nutrientsPer100g.carbs) && !number(nutrientsPer100g.fat)) return null;
  return {
    id: snapshot.itemId || entry.itemId || libraryFood?.id || null,
    source: snapshot.source || entry.source || libraryFood?.source || "custom",
    sourceId: snapshot.sourceId || entry.sourceId || libraryFood?.sourceId || null,
    barcode: snapshot.barcode || entry.barcode || libraryFood?.barcode || null,
    name: snapshot.name || entry.nameSnapshot || libraryFood?.name || "Food",
    brand: snapshot.brand || entry.brandSnapshot || libraryFood?.brand || null,
    defaultServing: snapshot.defaultServing || libraryFood?.defaultServing || null,
    servingOptions: snapshot.servingOptions || libraryFood?.servingOptions || [],
    nutrientsPer100g
  };
}

function foodLikeFromTargetItem(item = {}) {
  if (item.itemType === "recipe" || item.source === "recipe") {
    return {
      id: item.itemId || item.recipeSnapshot?.id || null,
      source: "recipe",
      name: item.nameSnapshot || item.recipeSnapshot?.name || "Recipe",
      brand: "Recipe",
      nutrientsPerPortion: normalizeNutrients(item.recipeSnapshot?.nutrientsPerPortion || scaleNutrients(item.nutrientsSnapshot, 1 / Math.max(1, number(item.amount, 1)))),
      defaultServing: { label: "portion", grams: 100, mode: "portion", unit: "portion" },
      servingOptions: [{ label: "portion", grams: 100, mode: "portion", unit: "portion" }]
    };
  }
  const libraryFood = findCustomFoodForReference(item);
  const grams = number(item.grams);
  const derivedPer100g = grams > 0 ? scaleNutrients(item.nutrientsSnapshot, 100 / grams) : null;
  const nutrientsPer100g = normalizeNutrients(item.nutrientsPer100g || item.itemSnapshot?.nutrientsPer100g || libraryFood?.nutrientsPer100g || derivedPer100g || {});
  return {
    id: item.itemId || libraryFood?.id || null,
    source: item.source || libraryFood?.source || "custom",
    sourceId: item.sourceId || libraryFood?.sourceId || null,
    barcode: item.barcode || libraryFood?.barcode || null,
    name: item.nameSnapshot || libraryFood?.name || "Food",
    brand: item.brandSnapshot || libraryFood?.brand || null,
    defaultServing: item.defaultServing || item.itemSnapshot?.defaultServing || libraryFood?.defaultServing || null,
    servingOptions: item.servingOptions || item.itemSnapshot?.servingOptions || libraryFood?.servingOptions || [],
    nutrientsPer100g
  };
}

function openLogFoodModal(food) {
  if (!food) return;
  state.activeLogFood = food;
  const foodKey = registerTempFood(food);
  const servingOptions = buildServingOptions(food);
  const selectedServingIndex = preferredServingIndex(servingOptions, "", food.defaultServing?.grams, true);
  const selectedServing = servingOptions[selectedServingIndex] || servingOptions[0];
  const defaultAmount = defaultAmountForServing(selectedServing);
  const defaultMeal = state.defaultLogMeal || "breakfast";
  const defaultDate = state.defaultLogDate || state.currentDate;
  openModal(`
    <div class="modal amount-selector-modal">
      <div class="modal-head"><h3>Log ${safeText(displayFoodName(food))}</h3><button class="close-btn" data-action="close-modal">x</button></div>
      <form id="logFoodForm" class="modal-body" data-food-key="${safeText(foodKey)}">
        <div class="form-grid two">
          <label>Amount<input name="amount" type="number" inputmode="decimal" step="0.01" min="0" value="${defaultAmount}" required /></label>
          <label>Unit
            <select name="unitIndex">
              ${servingOptions.map((s, idx) => `<option value="${idx}" ${idx === selectedServingIndex ? "selected" : ""}>${safeText(servingDisplayName(s))}</option>`).join("")}
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
  const form = document.getElementById("logFoodForm");
  bindServingAmountDefaults(form, food);
  requestAnimationFrame(() => {
    form?.elements.amount?.focus();
    form?.elements.amount?.select?.();
  });
}

function cloneSnapshot(value) {
  return cleanForFirestore(structuredClone(value || null));
}

function loggedFoodSnapshot(food, grams, amount, unit, nutrientsSnapshot, createdAt) {
  return cloneSnapshot({
    itemType: "food",
    itemId: food.id || food.sourceId || null,
    source: food.source || null,
    originalSource: food.originalSource || null,
    sourceId: food.sourceId || null,
    barcode: food.barcode || null,
    name: food.name || "Unnamed food",
    displayName: displayFoodName(food),
    brand: food.brand || null,
    amount,
    unit,
    gramsEquivalent: grams,
    defaultServing: food.defaultServing || null,
    servingOptions: food.servingOptions || [],
    nutrientsPer100g: normalizeNutrients(food.nutrientsPer100g),
    nutrientsSnapshot,
    sourceCreatedAt: food.createdAt || null,
    sourceUpdatedAt: food.updatedAt || null,
    loggedAt: createdAt
  });
}

function loggedTargetSnapshot(kind, target, amount, nutrientsSnapshot, createdAt) {
  const isRecipe = kind === "recipe";
  const items = cloneSnapshot(isRecipe ? target.ingredients || [] : target.items || []);
  const totalNutrients = normalizeNutrients(target.totalNutrients);
  const perPortion = isRecipe
    ? normalizeNutrients(target.nutrientsPerPortion || scaleNutrients(totalNutrients, 1 / Math.max(1, number(target.portions, 1))))
    : totalNutrients;
  return cloneSnapshot({
    itemType: kind,
    itemId: target.id || null,
    name: target.name || (isRecipe ? "Unnamed recipe" : "Unnamed mealset"),
    notes: target.notes || "",
    amount,
    unit: isRecipe ? "portion" : "mealset",
    portions: isRecipe ? number(target.portions, 1) : null,
    ingredients: isRecipe ? items : [],
    items: isRecipe ? [] : items,
    totalNutrients,
    nutrientsPerPortion: isRecipe ? perPortion : null,
    nutrientsPerUnit: isRecipe ? perPortion : totalNutrients,
    nutrientsSnapshot,
    sourceCreatedAt: target.createdAt || null,
    sourceUpdatedAt: target.updatedAt || null,
    loggedAt: createdAt
  });
}

async function logFood(food, amount, unit, grams, meal, dateISO) {
  const createdAt = Date.now();
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
    itemSnapshot: loggedFoodSnapshot(food, grams, amount, unit, nutrientsSnapshot, createdAt),
    createdAt,
    updatedAt: createdAt
  };
  await addDoc(entryCollection(dateISO), cleanForFirestore(entry));
  showToast("Food logged.");
  ensureFoodInPersonalLibrary(food, { incrementUsage: true }).catch(console.warn);
  queueDailySummaryUpdate(dateISO);
  scheduleReportRecalculationForDate(dateISO);
}

function renderRecipes() {
  const recipes = sortFavoriteFirst(state.recipes);
  const mealsets = sortFavoriteFirst(state.mealsets);
  els.pages.recipes.innerHTML = `
    <div class="grid-2">
      ${state.settings.modules.recipes ? `<div class="card stack target-section ${state.recipeSectionsCollapsed.recipes ? "is-collapsed" : ""}" data-section="recipes">
        <div class="meal-head">
          <h3>Recipes</h3>
          <div class="section-actions">
            <button class="tiny-btn section-fold-btn" type="button" data-action="toggle-target-section" data-section="recipes">${state.recipeSectionsCollapsed.recipes ? "Show" : "Hide"}</button>
            <button class="primary-btn" type="button" data-action="create-recipe">+ Recipe</button>
          </div>
        </div>
        <div class="result-grid">${recipes.length ? recipes.map(renderRecipeCard).join("") : `<div class="empty-state">No recipes yet.</div>`}</div>
      </div>` : `<div class="card"><div class="empty-state">Recipes are disabled in Settings.</div></div>`}

      ${state.settings.modules.mealsets ? `<div class="card stack target-section ${state.recipeSectionsCollapsed.mealsets ? "is-collapsed" : ""}" data-section="mealsets">
        <div class="meal-head">
          <h3>Mealsets</h3>
          <div class="section-actions">
            <button class="tiny-btn section-fold-btn" type="button" data-action="toggle-target-section" data-section="mealsets">${state.recipeSectionsCollapsed.mealsets ? "Show" : "Hide"}</button>
            <button class="primary-btn" type="button" data-action="create-mealset">+ Mealset</button>
          </div>
        </div>
        <div class="result-grid">${mealsets.length ? mealsets.map(renderMealsetCard).join("") : `<div class="empty-state">No mealsets yet.</div>`}</div>
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
  return `
    <div class="result-card recipe-card ${recipe.favorite ? "favorite" : ""}">
      <div class="recipe-card-main">
        <div class="recipe-card-head">
          <div>
            <h4>${safeText(recipe.name)}</h4>
            <p>${round(perPortion.kcal, 0)} kcal / portion</p>
          </div>
          <div class="recipe-quick-actions">
            ${itemFavoriteButton("recipe", recipe)}
            <button class="tiny-btn" data-action="detail-recipe" data-id="${recipe.id}">Details</button>
          </div>
        </div>
        ${macroSplitSummaryHTML(perPortion)}
      </div>
    </div>
  `;
}

function renderMealsetCard(mealset) {
  const total = normalizeNutrients(mealset.totalNutrients);
  return `
    <div class="result-card recipe-card ${mealset.favorite ? "favorite" : ""}">
      <div class="recipe-card-main">
        <div class="recipe-card-head">
          <div>
            <h4>${safeText(mealset.name)}</h4>
            <p>${round(total.kcal, 0)} kcal</p>
          </div>
          <div class="recipe-quick-actions">
            ${itemFavoriteButton("mealset", mealset)}
            <button class="tiny-btn" data-action="detail-mealset" data-id="${mealset.id}">Details</button>
          </div>
        </div>
        ${macroSplitSummaryHTML(total)}
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
    favorite: false,
    ingredients: [],
    totalNutrients: emptyNutrients(),
    nutrientsPerPortion: emptyNutrients(),
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  try {
    await addDoc(userCollection("recipes"), cleanForFirestore(recipe));
  } catch (error) {
    if (error?.code === "permission-denied") {
      throw new Error("Recipe creation is blocked by Firestore rules. Deploy the included firestore.rules file or allow apps/food-tracker/users/{userId}/recipes.");
    }
    throw error;
  }
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
    favorite: false,
    items: [],
    totalNutrients: emptyNutrients(),
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  try {
    await addDoc(userCollection("mealsets"), cleanForFirestore(mealset));
  } catch (error) {
    if (error?.code === "permission-denied") {
      throw new Error("Mealset creation is blocked by Firestore rules. Deploy the included firestore.rules file or allow apps/food-tracker/users/{userId}/mealsets.");
    }
    throw error;
  }
  closeModal();
  setRoute("recipes");
  showToast("Mealset created. Add items next.");
}

function recipeSnapshotForReference(recipe) {
  return cloneSnapshot({
    id: recipe.id || null,
    name: recipe.name || "Recipe",
    portions: number(recipe.portions, 1),
    ingredients: recipe.ingredients || [],
    totalNutrients: normalizeNutrients(recipe.totalNutrients),
    nutrientsPerPortion: normalizeNutrients(recipe.nutrientsPerPortion || scaleNutrients(recipe.totalNutrients, 1 / Math.max(1, number(recipe.portions, 1)))),
    updatedAt: recipe.updatedAt || null
  });
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
    recipeSnapshot: recipeSnapshotForReference(recipe),
    defaultServing: { label: "portion", grams: 100 },
    servingOptions: [{ label: "portion", grams: 100 }]
  };
}

function recipeReferenceItem(recipe, amount = 1, existing = {}) {
  const perPortion = normalizeNutrients(recipe.nutrientsPerPortion || scaleNutrients(recipe.totalNutrients, 1 / Math.max(1, number(recipe.portions, 1))));
  return {
    ...existing,
    itemType: "recipe",
    source: "recipe",
    itemId: recipe.id || existing.itemId || null,
    nameSnapshot: recipe.name || existing.nameSnapshot || "Recipe",
    brandSnapshot: "Recipe",
    grams: null,
    amount,
    unit: "portion",
    nutrientsSnapshot: scaleNutrients(perPortion, amount),
    recipeSnapshot: recipeSnapshotForReference(recipe),
    sourceUpdatedAt: recipe.updatedAt || null,
    updatedAt: Date.now()
  };
}

async function syncRecipeReferencesInMealsets(recipeId, recipeOverride = null) {
  const recipe = recipeOverride || state.recipes.find(item => item.id === recipeId);
  if (!recipe) return;
  const now = Date.now();
  for (const mealset of state.mealsets || []) {
    let changed = false;
    const items = (mealset.items || []).map(item => {
      if (item.itemType !== "recipe" || item.itemId !== recipeId) return item;
      changed = true;
      return recipeReferenceItem(recipe, number(item.amount, 1), item);
    });
    if (!changed) continue;
    await updateDoc(userDoc("mealsets", mealset.id), cleanForFirestore({
      items,
      totalNutrients: addNutrients(items),
      updatedAt: now
    })).catch(console.warn);
  }
}

function targetForKind(kind, id) {
  return kind === "recipe" ? state.recipes.find(r => r.id === id) : state.mealsets.find(m => m.id === id);
}

function targetItemsForKind(kind, id) {
  const target = targetForKind(kind, id);
  return target ? (kind === "recipe" ? target.ingredients || [] : target.items || []) : [];
}

function targetPortionDivisor(kind, target) {
  return kind === "recipe" ? Math.max(1, number(target?.portions, 1)) : 1;
}

function targetItemDisplayNutrients(kind, target, item) {
  return scaleNutrients(item?.nutrientsSnapshot, 1 / targetPortionDivisor(kind, target));
}

function targetItemKcalLabel(kind) {
  return kind === "recipe" ? "kcal / portion" : "kcal";
}

function targetTotalDisplayNutrients(kind, target, itemsOverride = null) {
  if (!target) return emptyNutrients();
  if (itemsOverride) {
    const total = addNutrients(itemsOverride);
    return kind === "recipe" ? scaleNutrients(total, 1 / targetPortionDivisor(kind, target)) : total;
  }
  return kind === "recipe"
    ? normalizeNutrients(target.nutrientsPerPortion || scaleNutrients(target.totalNutrients, 1 / targetPortionDivisor(kind, target)))
    : normalizeNutrients(target.totalNutrients);
}

function contributionPercent(value, total) {
  return total ? round(number(value) / number(total) * 100, 0) : 0;
}

function targetItemContributionHTML(nutrients, total) {
  const n = normalizeNutrients(nutrients);
  const t = normalizeNutrients(total);
  return `
    <div class="item-contribution-row" aria-label="Contribution to total">
      <span class="kcal">kcal ${contributionPercent(n.kcal, t.kcal)}%</span>
      <span class="protein">P ${contributionPercent(n.protein, t.protein)}%</span>
      <span class="carbs">C ${contributionPercent(n.carbs, t.carbs)}%</span>
      <span class="fat">F ${contributionPercent(n.fat, t.fat)}%</span>
    </div>
  `;
}

function targetItemStatsHTML(kind, target, item, displayNutrients = null, totalOverride = null) {
  const n = normalizeNutrients(displayNutrients || targetItemDisplayNutrients(kind, target, item));
  const total = normalizeNutrients(totalOverride || targetTotalDisplayNutrients(kind, target));
  return `${nutrientSummaryHTML(n)}${targetItemContributionHTML(n, total)}`;
}

function targetDetailSummaryHTML(total, label) {
  return `
    <div class="target-detail-summary-panel">
      <div class="target-kcal-card">
        <span>Calories</span>
        <strong>${round(total.kcal, 0)}</strong>
        <small>${safeText(label)}</small>
      </div>
      ${macroSplitSummaryHTML(total)}
    </div>
  `;
}


function updateLocalTarget(kind, id, patch) {
  const key = kind === "recipe" ? "recipes" : "mealsets";
  state[key] = (state[key] || []).map(item => item.id === id ? { ...item, ...patch } : item);
}

function renderTargetCurrentItems(kind, id) {
  const target = targetForKind(kind, id);
  const items = target ? (kind === "recipe" ? target.ingredients || [] : target.items || []) : [];
  const label = kind === "recipe" ? "Ingredients" : "Items";
  return `
    <details class="current-target-items" open>
      <summary class="current-target-summary">
        <span>${label}</span>
        <span class="kicker">${items.length} saved</span>
      </summary>
      <div class="result-grid compact-results">
        ${items.length ? items.map((item, index) => {
          const displayNutrients = targetItemDisplayNutrients(kind, target, item);
          return `
          <div class="food-entry target-item-entry target-item-row" data-target-item-index="${index}">
            <div class="target-item-main">
              <div class="food-entry-head">
                <div class="food-entry-title"><strong>${safeText(item.nameSnapshot)}</strong><small>${itemAmountText(item)}</small></div>
              </div>
              ${targetItemEditPreviewHTML(kind, target, items, number(index), displayNutrients)}
            </div>
            <div class="inline-actions target-item-actions">
              <button class="tiny-btn" data-action="edit-target-item" data-kind="${kind}" data-id="${id}" data-index="${index}">Amount</button>
              <button class="tiny-btn" data-action="remove-target-item" data-kind="${kind}" data-id="${id}" data-index="${index}">Remove</button>
            </div>
          </div>`;
        }).join("") : `<div class="empty-state">No ${kind === "recipe" ? "ingredients" : "items"} yet.</div>`}
      </div>
    </details>
  `;
}

function openIngredientModal(kind, id, options = {}) {
  const target = kind === "recipe" ? state.recipes.find(r => r.id === id) : state.mealsets.find(m => m.id === id);
  if (!target) return;
  const canRestore = options.restore && state.ingredientSearch?.kind === kind && state.ingredientSearch?.id === id;
  if (!canRestore) {
    state.ingredientSearch = { kind, id, query: "", mode: "food", page: 1, results: [] };
  }
  const flow = state.ingredientSearch;
  const restoredResults = flow.results?.length
    ? renderIngredientResultPage(flow.results, kind, id, flow.page, flow.mode, flow.query)
    : `<div class="empty-state">Search for a food${kind === "mealset" ? " or add a saved recipe." : "."}</div>`;
  openModal(`
    <div class="modal">
      <div class="modal-head"><h3>${kind === "recipe" ? "Ingredients" : "Items"} for ${safeText(target.name)}</h3><button class="close-btn" data-action="return-target-detail" data-kind="${kind}" data-id="${id}">x</button></div>
      <div class="modal-body">
        <div class="search-bar">
          <input id="ingredientSearchInput" type="search" placeholder="Name of the food" value="${safeText(flow.query)}" aria-label="Search ingredients" />
          <button class="primary-btn" data-action="ingredient-search" data-kind="${kind}" data-id="${id}">Search</button>
          ${kind === "mealset" ? `<button class="secondary-btn" data-action="show-recipe-ingredients" data-kind="${kind}" data-id="${id}">Recipes</button>` : ""}
        </div>
        <div id="ingredientResults" class="result-grid">
          ${restoredResults}
        </div>
      </div>
    </div>
  `);
  document.getElementById("ingredientSearchInput")?.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      document.querySelector(`[data-action="ingredient-search"][data-kind="${kind}"][data-id="${id}"]`)?.click();
    }
  });
}

function renderIngredientResultPage(foods, kind, id, page = 1, mode = "food", query = "") {
  const totalPages = Math.max(1, Math.ceil(foods.length / SEARCH_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * SEARCH_PAGE_SIZE;
  const pageItems = foods.slice(start, start + SEARCH_PAGE_SIZE);
  return `
    ${pageItems.map(food => renderIngredientResult(food, registerTempFood(food), kind, id)).join("") || `<div class="empty-state">No results.</div>`}
    ${foods.length > SEARCH_PAGE_SIZE ? `
      <div class="pagination ingredient-pagination" data-kind="${kind}" data-id="${id}" data-mode="${mode}" data-query="${safeText(query)}" data-page="${safePage}">
        <button class="ghost-btn" data-action="ingredient-prev-page" ${safePage <= 1 ? "disabled" : ""}>Previous</button>
        <span class="kicker">${start + 1}-${Math.min(start + SEARCH_PAGE_SIZE, foods.length)} of ${foods.length}</span>
        <button class="ghost-btn" data-action="ingredient-next-page" ${safePage >= totalPages ? "disabled" : ""}>Next</button>
      </div>
    ` : ""}
  `;
}

function renderIngredientResult(food, key, kind, id) {
  const detail = food.source === "recipe"
    ? `${round(food.nutrientsPerPortion?.kcal, 0)} kcal / portion`
    : caloriesText(food);
  const nutrients = food.source === "recipe"
    ? normalizeNutrients(food.nutrientsPerPortion)
    : normalizeNutrients(food.nutrientsPer100g);
  return `
    <div class="result-card">
      <div>
        <h4>${safeText(displayFoodName(food))}</h4>
        <p>${safeText(detail)}</p>
        ${nutrientSummaryHTML(nutrients)}
      </div>
      <button class="primary-btn" data-action="select-ingredient" data-key="${safeText(key)}" data-kind="${kind}" data-id="${id}">Add</button>
    </div>
  `;
}

function nutrientsForIngredientAmount(food, amount, grams = null) {
  if (food?.source === "recipe") return scaleNutrients(food.nutrientsPerPortion, amount);
  const gramAmount = grams === null ? amount : grams;
  return scaleNutrients(food?.nutrientsPer100g, gramAmount / 100);
}

function targetTotalAbsoluteNutrients(kind, target) {
  if (!target) return emptyNutrients();
  return normalizeNutrients(target.totalNutrients);
}

function ingredientAmountPreviewNutrients(food, amount, kind, id, grams = null) {
  return nutrientsForIngredientAmount(food, amount, grams);
}

function targetItemContributionPreviewHTML(food, amount, kind, id, grams = null) {
  const target = targetForKind(kind, id);
  const displayNutrients = ingredientAmountPreviewNutrients(food, amount, kind, id, grams);
  const total = targetTotalAbsoluteNutrients(kind, target);
  return `${nutrientSummaryHTML(displayNutrients)}${targetItemContributionHTML(displayNutrients, total)}`;
}

function resetIngredientSearch(kind, id) {
  state.ingredientSearch = { kind, id, query: "", mode: "food", page: 1, results: [] };
  state.keyboardSelection.ingredient = -1;
}

function openIngredientAmountModal(food, kind, id) {
  if (!food) return;
  const isRecipePortion = food?.source === "recipe";
  const servingOptions = isRecipePortion ? [{ label: "portion", grams: 100, mode: "portion", unit: "portion" }] : buildServingOptions(food);
  const selectedServingIndex = isRecipePortion ? 0 : preferredServingIndex(servingOptions, "", food.defaultServing?.grams, true);
  const selectedServing = servingOptions[selectedServingIndex] || servingOptions[0];
  const defaultAmount = defaultAmountForServing(selectedServing);
  const defaultGrams = isRecipePortion ? null : gramsForServingAmount(selectedServing, defaultAmount);
  openModal(`
    <div class="modal amount-selector-modal">
      <div class="modal-head">
        <h3>Add ${safeText(displayFoodName(food))}</h3>
        <button class="close-btn" type="button" data-action="back-to-ingredient-search" data-kind="${kind}" data-id="${id}">x</button>
      </div>
      <form id="ingredientAmountForm" class="modal-body">
        <div class="form-grid two">
          <label>${isRecipePortion ? "Portions" : "Amount"}<input name="amount" type="number" inputmode="decimal" step="0.1" min="0" value="${defaultAmount}" required /></label>
          <label>Unit
            <select name="unitIndex" ${isRecipePortion ? "disabled" : ""}>
              ${servingOptions.map((s, idx) => `<option value="${idx}" ${idx === selectedServingIndex ? "selected" : ""}>${safeText(servingDisplayName(s))}</option>`).join("")}
            </select>
          </label>
        </div>
        <div id="ingredientAmountPreview" class="amount-preview">
          ${targetItemContributionPreviewHTML(food, defaultAmount, kind, id, defaultGrams)}
        </div>
        <div class="form-actions"><button class="primary-btn" type="submit">Add</button></div>
      </form>
    </div>
  `);
  const form = document.getElementById("ingredientAmountForm");
  const preview = document.getElementById("ingredientAmountPreview");
  const updatePreview = () => {
    const data = new FormData(form);
    const selected = servingOptions[formNumberValue(data.get("unitIndex"), selectedServingIndex)] || selectedServing;
    const amount = formNumberValue(data.get("amount"), defaultAmountForServing(selected));
    const grams = isRecipePortion ? null : gramsForServingAmount(selected, amount);
    preview.innerHTML = targetItemContributionPreviewHTML(food, amount, kind, id, grams);
  };
  form?.elements.amount?.addEventListener("input", updatePreview);
  form?.elements.amount?.addEventListener("change", updatePreview);
  form?.elements.unitIndex?.addEventListener("change", () => {
    if (!isRecipePortion && form.elements.amount && document.activeElement !== form.elements.amount) {
      const selected = servingOptions[formNumberValue(form.elements.unitIndex?.value, selectedServingIndex)] || selectedServing;
      form.elements.amount.value = defaultAmountForServing(selected);
    }
    updatePreview();
  });
  requestAnimationFrame(() => {
    form?.elements.amount?.focus();
    form?.elements.amount?.select?.();
  });
  form.addEventListener("submit", event => {
    event.preventDefault();
    if (form.dataset.submitting === "true") return;
    form.dataset.submitting = "true";
    const data = new FormData(event.currentTarget);
    const selected = servingOptions[formNumberValue(data.get("unitIndex"), selectedServingIndex)] || selectedServing;
    const amount = formNumberValue(data.get("amount"), defaultAmountForServing(selected));
    const unit = isRecipePortion ? "portion" : servingUnitName(selected);
    const grams = isRecipePortion ? null : gramsForServingAmount(selected, amount);
    form.querySelectorAll("button, input, select").forEach(el => el.disabled = true);
    addIngredientToTarget(food, amount, unit, grams, kind, id).catch(showError);
    resetIngredientSearch(kind, id);
    openIngredientModal(kind, id, { restore: false });
  });
}

async function addIngredientToTarget(food, amount, unit, grams, kind, id) {
  const isRecipePortion = food?.source === "recipe";
  const nutrientsSnapshot = isRecipePortion
    ? scaleNutrients(food.nutrientsPerPortion, amount)
    : scaleNutrients(food.nutrientsPer100g, number(grams) / 100);
  const ingredient = isRecipePortion
    ? recipeReferenceItem(state.recipes.find(recipe => recipe.id === food.id) || food, amount, { createdAt: Date.now() })
    : {
      itemType: "food",
      source: food.source,
      itemId: food.id || food.sourceId || null,
      sourceId: food.sourceId || food.id || null,
      barcode: food.barcode || null,
      nameSnapshot: displayFoodName(food),
      brandSnapshot: food.brand || null,
      grams,
      amount,
      unit,
      defaultServing: food.defaultServing || null,
      servingOptions: food.servingOptions || [],
      nutrientsPer100g: normalizeNutrients(food.nutrientsPer100g),
      itemSnapshot: loggedFoodSnapshot(food, grams, amount, unit, nutrientsSnapshot, Date.now()),
      nutrientsSnapshot,
      createdAt: Date.now()
    };

  if (kind === "recipe") {
    const recipe = state.recipes.find(r => r.id === id);
    if (!recipe) throw new Error("Recipe not found anymore.");
    const ingredients = [...(recipe.ingredients || []), ingredient];
    const totalNutrients = addNutrients(ingredients);
    const nutrientsPerPortion = scaleNutrients(totalNutrients, 1 / Math.max(1, number(recipe.portions, 1)));
    const updatedRecipe = { ...recipe, ingredients, totalNutrients, nutrientsPerPortion, updatedAt: Date.now() };
    updateLocalTarget("recipe", id, updatedRecipe);
    showToast("Ingredient added.");
    updateDoc(userDoc("recipes", id), cleanForFirestore({ ingredients, totalNutrients, nutrientsPerPortion, updatedAt: updatedRecipe.updatedAt }))
      .then(() => syncRecipeReferencesInMealsets(id, updatedRecipe))
      .catch(console.warn);
  } else {
    const mealset = state.mealsets.find(m => m.id === id);
    if (!mealset) throw new Error("Mealset not found anymore.");
    const items = [...(mealset.items || []), ingredient];
    const totalNutrients = addNutrients(items);
    const updatedAt = Date.now();
    updateLocalTarget("mealset", id, { items, totalNutrients, updatedAt });
    showToast("Item added.");
    updateDoc(userDoc("mealsets", id), cleanForFirestore({ items, totalNutrients, updatedAt })).catch(console.warn);
  }

  if (!isRecipePortion && food?.source !== "custom") {
    ensureFoodInPersonalLibrary(food, { incrementUsage: false }).catch(console.warn);
  }
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

function saveTargetDetailScroll(kind, id) {
  const modal = document.querySelector(".target-detail-modal");
  const body = document.querySelector(".target-detail-modal .modal-body");
  state.targetDetailScroll[`${kind}:${id}`] = {
    modalTop: number(modal?.scrollTop),
    bodyTop: number(body?.scrollTop)
  };
}

function restoreTargetDetailScroll(kind, id) {
  const saved = state.targetDetailScroll[`${kind}:${id}`];
  if (!saved) return;
  requestAnimationFrame(() => {
    const modal = document.querySelector(".target-detail-modal");
    const body = document.querySelector(".target-detail-modal .modal-body");
    if (modal) modal.scrollTop = number(saved.modalTop);
    if (body) body.scrollTop = number(saved.bodyTop);
  });
}

function openTargetDetail(kind, id) {
  const isRecipe = kind === "recipe";
  const target = targetForKind(kind, id);
  if (!target) return;
  const items = isRecipe ? target.ingredients || [] : target.items || [];
  const total = isRecipe ? normalizeNutrients(target.nutrientsPerPortion || scaleNutrients(target.totalNutrients, 1 / Math.max(1, target.portions || 1))) : normalizeNutrients(target.totalNutrients);
  openModal(`
    <div class="modal target-detail-modal">
      <div class="modal-head">
        <h3>${safeText(target.name)}</h3>
        <button class="close-btn" data-action="close-modal">x</button>
      </div>
      <div class="modal-body">
        <p class="kicker">${isRecipe ? `${target.portions || 1} portions` : "Mealset"}${target.notes ? ` - ${safeText(target.notes)}` : ""}</p>
        ${targetDetailSummaryHTML(total, isRecipe ? "per portion" : "per mealset")}
        <div class="target-detail-actions">
          <button class="primary-btn target-action-log" data-action="log-${kind}-from-detail" data-id="${id}">Log</button>
          <button class="tiny-btn target-action-item" data-action="add-ingredient" data-kind="${kind}" data-id="${id}">${isRecipe ? "Ingredient" : "Item"}</button>
          <button class="tiny-btn target-action-edit" data-action="edit-${kind}" data-id="${id}">Edit</button>
          <button class="danger-btn target-action-delete" data-action="delete-${kind}" data-id="${id}">Delete</button>
        </div>
        <div class="result-grid">
          ${items.length ? items.map((item, index) => {
            const displayNutrients = targetItemDisplayNutrients(kind, target, item);
            return `
            <div class="food-entry target-item-row" data-target-item-index="${index}">
              <div class="target-item-main">
                <div class="food-entry-head">
                  <div class="food-entry-title"><strong>${safeText(item.nameSnapshot)}</strong><small>${itemAmountText(item)}</small></div>
                </div>
                ${targetItemStatsHTML(kind, target, item, displayNutrients)}
              </div>
              <div class="inline-actions target-item-actions">
                <button class="tiny-btn" data-action="edit-target-item" data-kind="${kind}" data-id="${id}" data-index="${index}">Edit amount</button>
                <button class="tiny-btn" data-action="remove-target-item" data-kind="${kind}" data-id="${id}" data-index="${index}">Remove</button>
              </div>
            </div>`;
          }).join("") : `<div class="empty-state">No ${isRecipe ? "ingredients" : "items"} yet.</div>`}
        </div>
      </div>
    </div>
  `);
  restoreTargetDetailScroll(kind, id);
}

function openTargetEditor(kind, id) {
  const isRecipe = kind === "recipe";
  const target = targetForKind(kind, id);
  if (!target) return;
  openModal(`
    <div class="modal">
      <div class="modal-head"><h3>Edit ${isRecipe ? "recipe" : "mealset"}</h3><button class="close-btn" data-action="return-target-detail" data-kind="${kind}" data-id="${id}">x</button></div>
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
    updateLocalTarget(kind, id, patch);
    await updateDoc(userDoc(isRecipe ? "recipes" : "mealsets", id), cleanForFirestore(patch));
    if (isRecipe) await syncRecipeReferencesInMealsets(id, { ...target, ...patch });
    openTargetDetail(kind, id);
  });
}

async function duplicateTarget(kind, id) {
  const isRecipe = kind === "recipe";
  const target = isRecipe ? state.recipes.find(item => item.id === id) : state.mealsets.find(item => item.id === id);
  if (!target) return;
  const copy = { ...target, name: `${target.name} copy`, favorite: false, createdAt: Date.now(), updatedAt: Date.now() };
  delete copy.id;
  await addDoc(userCollection(isRecipe ? "recipes" : "mealsets"), cleanForFirestore(copy));
  showToast(`${isRecipe ? "Recipe" : "Mealset"} duplicated.`);
}

function targetItemEditPreviewHTML(kind, target, items, index, nextDisplayNutrients) {
  const oldItem = items[number(index)];
  const oldDisplay = targetItemDisplayNutrients(kind, target, oldItem);
  const currentTotal = targetTotalDisplayNutrients(kind, target, items);
  const adjustedTotal = addNutrients([
    { nutrientsSnapshot: currentTotal },
    { nutrientsSnapshot: scaleNutrients(oldDisplay, -1) },
    { nutrientsSnapshot: nextDisplayNutrients }
  ]);
  return `${nutrientSummaryHTML(nextDisplayNutrients)}${targetItemContributionHTML(nextDisplayNutrients, adjustedTotal)}`;
}

function openTargetItemAmountEditor(kind, id, index) {
  const isRecipe = kind === "recipe";
  const target = targetForKind(kind, id);
  const items = [...(isRecipe ? target?.ingredients || [] : target?.items || [])];
  const item = items[number(index)];
  if (!target || !item) return;
  const food = foodLikeFromTargetItem(item);
  const isRecipePortion = food?.source === "recipe" || item.itemType === "recipe" || item.source === "recipe";
  const servingOptions = isRecipePortion ? [{ label: "portion", grams: 100, mode: "portion", unit: "portion" }] : buildServingOptions(food);
  const selectedServingIndex = isRecipePortion ? 0 : preferredServingIndex(servingOptions, item.unit, item.grams, true);
  const selectedServing = servingOptions[selectedServingIndex] || servingOptions[0];
  const currentAmount = item.amount !== undefined && item.amount !== null
    ? round(item.amount, 2)
    : selectedServing.mode === "grams"
      ? round(item.grams || 100, 2)
      : round(number(item.grams) / Math.max(0.0001, number(selectedServing.grams, 1)), 2);
  const nutrientsForSelection = (amount, selected) => {
    if (isRecipePortion) return scaleNutrients(food.nutrientsPerPortion || item.nutrientsSnapshot, amount);
    const grams = gramsForServingAmount(selected, amount);
    return nutrientsForIngredientAmount(food, amount, grams);
  };
  const displayForSelection = (amount, selected) => {
    const absolute = nutrientsForSelection(amount, selected);
    return kind === "recipe" ? scaleNutrients(absolute, 1 / targetPortionDivisor(kind, target)) : absolute;
  };
  openModal(`
    <div class="modal amount-selector-modal">
      <div class="modal-head"><h3>Edit ${safeText(item.nameSnapshot)}</h3><button class="close-btn" data-action="return-target-detail" data-kind="${kind}" data-id="${id}">x</button></div>
      <form id="targetItemEditForm" class="modal-body">
        <div class="form-grid two">
          <label>Amount<input name="amount" type="number" inputmode="decimal" step="0.1" min="0" value="${currentAmount}" /></label>
          <label>Unit
            <select name="unitIndex" ${isRecipePortion ? "disabled" : ""}>
              ${servingOptions.map((s, idx) => `<option value="${idx}" ${idx === selectedServingIndex ? "selected" : ""}>${safeText(servingDisplayName(s))}</option>`).join("")}
            </select>
          </label>
        </div>
        <div id="targetItemAmountPreview" class="amount-preview">
          ${targetItemEditPreviewHTML(kind, target, items, number(index), displayForSelection(currentAmount, selectedServing))}
        </div>
        <div class="form-actions"><button class="primary-btn" type="submit">Save amount</button></div>
      </form>
    </div>
  `);
  const form = document.getElementById("targetItemEditForm");
  const preview = document.getElementById("targetItemAmountPreview");
  const updatePreview = () => {
    const data = new FormData(form);
    const selected = servingOptions[formNumberValue(data.get("unitIndex"), selectedServingIndex)] || selectedServing;
    const amount = formNumberValue(data.get("amount"), defaultAmountForServing(selected));
    preview.innerHTML = targetItemEditPreviewHTML(kind, target, items, number(index), displayForSelection(amount, selected));
  };
  form?.elements.amount?.addEventListener("input", updatePreview);
  form?.elements.amount?.addEventListener("change", updatePreview);
  form?.elements.unitIndex?.addEventListener("change", () => {
    const selected = servingOptions[formNumberValue(form.elements.unitIndex?.value, selectedServingIndex)] || selectedServing;
    if (!isRecipePortion && form.elements.amount && document.activeElement !== form.elements.amount) {
      form.elements.amount.value = defaultAmountForServing(selected);
    }
    updatePreview();
  });
  requestAnimationFrame(() => {
    form?.elements.amount?.focus();
    form?.elements.amount?.select?.();
  });
  form.addEventListener("submit", event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const selected = servingOptions[formNumberValue(data.get("unitIndex"), selectedServingIndex)] || selectedServing;
    const newAmount = formNumberValue(data.get("amount"), currentAmount);
    const unit = isRecipePortion ? "portion" : servingUnitName(selected);
    const grams = isRecipePortion ? null : gramsForServingAmount(selected, newAmount);
    const nutrientsSnapshot = nutrientsForSelection(newAmount, selected);
    items[number(index)] = {
      ...item,
      amount: newAmount,
      unit,
      grams,
      defaultServing: isRecipePortion ? item.defaultServing || null : food.defaultServing || item.defaultServing || null,
      servingOptions: isRecipePortion ? item.servingOptions || [] : food.servingOptions || item.servingOptions || [],
      nutrientsPer100g: isRecipePortion ? item.nutrientsPer100g || null : normalizeNutrients(food.nutrientsPer100g),
      nutrientsSnapshot,
      updatedAt: Date.now()
    };
    const patch = recalculateTarget(kind, target, items);
    updateLocalTarget(kind, id, patch);
    openTargetDetail(kind, id);
    updateDoc(userDoc(isRecipe ? "recipes" : "mealsets", id), cleanForFirestore(patch))
      .then(() => isRecipe ? syncRecipeReferencesInMealsets(id, { ...target, ...patch }) : null)
      .catch(console.warn);
    showToast("Amount updated.");
  });
}

async function removeTargetItem(kind, id, index) {
  const isRecipe = kind === "recipe";
  const target = targetForKind(kind, id);
  if (!target) return;
  const items = [...(isRecipe ? target.ingredients || [] : target.items || [])];
  items.splice(number(index), 1);
  const patch = recalculateTarget(kind, target, items);
  updateLocalTarget(kind, id, patch);
  openTargetDetail(kind, id);
  updateDoc(userDoc(isRecipe ? "recipes" : "mealsets", id), cleanForFirestore(patch))
    .then(() => isRecipe ? syncRecipeReferencesInMealsets(id, { ...target, ...patch }) : null)
    .catch(console.warn);
  showToast("Item removed.");
}

async function incrementFoodUsageForTargetItems(items = []) {
  const now = Date.now();
  const foodIds = [...new Set((items || [])
    .filter(item => item?.itemType === "food" && item.itemId)
    .map(item => item.itemId))];
  for (const id of foodIds) {
    const local = state.customFoods.find(food => food.id === id);
    if (!local) continue;
    await updateDoc(userDoc("customFoods", id), cleanForFirestore({
      usedCount: number(local.usedCount) + 1,
      lastUsedAt: now,
      updatedAt: now
    })).catch(console.warn);
  }
}

function openLogRecipeModal(recipe, returnTarget = null) {
  const perPortion = normalizeNutrients(recipe.nutrientsPerPortion);
  const closeAction = returnTarget ? `data-action="return-target-detail" data-kind="${returnTarget.kind}" data-id="${returnTarget.id}"` : `data-action="close-modal"`;
  openModal(`
    <div class="modal">
      <div class="modal-head"><h3>Log ${safeText(recipe.name)}</h3><button class="close-btn" type="button" ${closeAction}>x</button></div>
      <form id="logRecipeForm" class="modal-body">
        <div class="form-grid two">
          <label>Portions<input name="amount" type="number" step="0.1" min="0" value="1" required /></label>
          <label>Meal<select name="meal">${MEALS.map(([id, label]) => `<option value="${id}" ${id === (state.defaultLogMeal || "breakfast") ? "selected" : ""}>${label}</option>`).join("")}</select></label>
          <label>Date<input name="date" type="date" value="${state.defaultLogDate || state.currentDate}" /></label>
        </div>
        ${targetDetailSummaryHTML(perPortion, "per portion")}
        <div class="form-actions"><button class="primary-btn" type="submit">Log recipe</button></div>
      </form>
    </div>
  `);
  document.getElementById("logRecipeForm").addEventListener("submit", async event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const amount = number(data.get("amount"), 1);
    const createdAt = Date.now();
    const nutrientsSnapshot = scaleNutrients(perPortion, amount);
    const entry = {
      itemType: "recipe",
      itemId: recipe.id,
      nameSnapshot: recipe.name,
      amount,
      unit: "portion",
      meal: data.get("meal"),
      date: data.get("date"),
      nutrientsSnapshot,
      itemSnapshot: loggedTargetSnapshot("recipe", recipe, amount, nutrientsSnapshot, createdAt),
      createdAt,
      updatedAt: createdAt
    };
    await addDoc(entryCollection(data.get("date")), cleanForFirestore(entry));
    await incrementFoodUsageForTargetItems(recipe.ingredients || []);
    await updateDailyCalorieSummary(data.get("date")).catch(console.warn);
    closeModal();
    if (returnTarget) renderRecipes();
    showToast("Recipe logged.");
  });
}

function openLogMealsetModal(mealset, returnTarget = null) {
  const total = normalizeNutrients(mealset.totalNutrients);
  const closeAction = returnTarget ? `data-action="return-target-detail" data-kind="${returnTarget.kind}" data-id="${returnTarget.id}"` : `data-action="close-modal"`;
  openModal(`
    <div class="modal">
      <div class="modal-head"><h3>Log ${safeText(mealset.name)}</h3><button class="close-btn" type="button" ${closeAction}>x</button></div>
      <form id="logMealsetForm" class="modal-body">
        <div class="form-grid two">
          <label>Quantity<input name="amount" type="number" step="0.1" min="0" value="1" required /></label>
          <label>Meal<select name="meal">${MEALS.map(([id, label]) => `<option value="${id}" ${id === (state.defaultLogMeal || "breakfast") ? "selected" : ""}>${label}</option>`).join("")}</select></label>
          <label>Date<input name="date" type="date" value="${state.defaultLogDate || state.currentDate}" /></label>
        </div>
        ${targetDetailSummaryHTML(total, "per mealset")}
        <div class="form-actions"><button class="primary-btn" type="submit">Log mealset</button></div>
      </form>
    </div>
  `);
  document.getElementById("logMealsetForm").addEventListener("submit", async event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const amount = number(data.get("amount"), 1);
    const createdAt = Date.now();
    const nutrientsSnapshot = scaleNutrients(total, amount);
    const entry = {
      itemType: "mealset",
      itemId: mealset.id,
      nameSnapshot: mealset.name,
      amount,
      unit: "mealset",
      meal: data.get("meal"),
      date: data.get("date"),
      nutrientsSnapshot,
      itemSnapshot: loggedTargetSnapshot("mealset", mealset, amount, nutrientsSnapshot, createdAt),
      createdAt,
      updatedAt: createdAt
    };
    await addDoc(entryCollection(data.get("date")), cleanForFirestore(entry));
    await incrementFoodUsageForTargetItems(mealset.items || []);
    await updateDailyCalorieSummary(data.get("date")).catch(console.warn);
    closeModal();
    if (returnTarget) renderRecipes();
    showToast("Mealset logged.");
  });
}

function renderReportsShell() {
  state.reportRange = state.reportRange || periodRange();
  const [start, end] = state.reportRange;
  const label = `${state.reportMode[0].toUpperCase()}${state.reportMode.slice(1)} report`;
  els.pages.reports.innerHTML = `
    <div class="stack">
      <div class="card report-period-card">
        <div class="report-period-head">
          <div class="report-period-title">
            <h3>${safeText(label)}</h3>
            <span class="report-date-range"><span>${safeText(start)}</span><span class="range-separator">to</span><span>${safeText(end)}</span></span>
          </div>
        </div>
        <div class="segmented report-period-tabs" aria-label="Report period">
          ${["week", "month", "year"].map(mode => `<button class="tiny-btn ${state.reportMode === mode ? "active" : ""}" data-action="set-report-mode" data-mode="${mode}">${mode}</button>`).join("")}
        </div>
        <div class="report-period-actions">
          <button class="ghost-btn" data-action="report-prev-period">Previous</button>
          <button class="ghost-btn" data-action="report-next-period">Next</button>
        </div>
      </div>
      <div id="reportOutput" class="stack">
        <div class="empty-state">Loading current ${safeText(state.reportMode)}...</div>
      </div>
    </div>
  `;
  setTimeout(() => loadReport().catch(showError), 0);
}

async function loadReport() {
  const [start, end] = state.reportRange || periodRange();
  if (!start || !end || start > end) throw new Error("Choose a valid date range.");
  state.reportRange = [start, end];
  const meta = { mode: state.reportMode || "week", start, end, key: reportCacheKey(state.reportMode || "week", start, end) };
  const cached = await readReportCache(meta);
  if (cached) {
    applyReportGoalsFromData(cached);
    state.reportEntries = cached.entries || [];
    state.reportData = cached;
    renderReportOutput(start, end, state.reportEntries, cached);
    return cached;
  }

  const output = document.getElementById("reportOutput");
  if (output) output.innerHTML = `<div class="empty-state">Calculating ${safeText(meta.mode)} report once and saving it to Firebase...</div>`;
  const data = await calculateAndStoreReportCache(meta, { force: true });
  applyReportGoalsFromData(data);
  state.reportEntries = data.entries || [];
  state.reportData = data;
  renderReportOutput(start, end, state.reportEntries, data);
  return data;
}

async function readReportCache(meta) {
  if (!state.user || !meta?.key) return null;
  try {
    const snap = await getDoc(reportCacheDoc(meta.key));
    if (!snap.exists()) return null;
    const data = snap.data();
    if (data?.dirty || data?.version !== REPORT_CACHE_VERSION) return null;
    if (data.mode !== meta.mode || data.start !== meta.start || data.end !== meta.end) return null;
    return normalizeReportData(data);
  } catch (error) {
    console.warn("Report cache read failed; recalculating.", error);
    return null;
  }
}

function normalizeReportData(data = {}) {
  const dates = data.dates || dateRange(data.start, data.end);
  const byDate = Object.fromEntries(dates.map(date => [date, normalizeNutrients(data.byDate?.[date] || {})]));
  return {
    ...data,
    dates,
    activeDates: data.activeDates || reportActiveDates(data.entries || [], dates),
    entries: data.entries || [],
    byDate,
    total: normalizeNutrients(data.total || {}),
    flatRows: data.flatRows || [],
    goalsByDate: data.goalsByDate || {}
  };
}

function applyReportGoalsFromData(data = {}) {
  for (const [dateISO, goal] of Object.entries(data.goalsByDate || {})) {
    if (!dateISO || !goal) continue;
    state.dailyGoals[dateISO] = goal;
  }
}

function flatRowsFromReportEntries(entries = []) {
  return entries.flatMap(entry => flattenReportEntry(entry).map(item => ({
    ...item,
    entryDate: entry.date || null,
    meal: entry.meal || "",
    source: entry.source || entry.itemType || "",
    brand: item.brand || entry.brandSnapshot || entry.itemSnapshot?.brand || ""
  })));
}

async function buildReportData(meta) {
  const dates = dateRange(meta.start, meta.end);
  const entries = [];
  const goalsByDate = {};
  for (const dateISO of dates) {
    await loadDailyGoalForDate(dateISO);
    goalsByDate[dateISO] = state.dailyGoals?.[dateISO] || goalSnapshotFromSettings(state.settings);
    const snap = await getDocs(entryCollection(dateISO));
    snap.docs.forEach(d => entries.push({ id: d.id, ...d.data(), date: dateISO }));
  }
  const byDate = Object.fromEntries(dates.map(date => [date, emptyNutrients()]));
  for (const entry of entries) byDate[entry.date] = addNutrients([{ nutrientsSnapshot: byDate[entry.date] }, entry]);
  const total = addNutrients(entries);
  const flatRows = flatRowsFromReportEntries(entries);
  return cleanForFirestore({
    version: REPORT_CACHE_VERSION,
    key: meta.key,
    mode: meta.mode,
    start: meta.start,
    end: meta.end,
    dates,
    activeDates: reportActiveDates(entries, dates),
    entries,
    byDate,
    total,
    flatRows,
    goalsByDate,
    dirty: false,
    generatedAt: Date.now(),
    sourceEntryCount: entries.length
  });
}

async function calculateAndStoreReportCache(meta, options = {}) {
  if (!state.user || !meta?.key) return buildReportData(meta);
  if (!options.force) {
    const cached = await readReportCache(meta);
    if (cached) return cached;
  }
  const data = await buildReportData(meta);
  await setDoc(reportCacheDoc(meta.key), data, { merge: false });
  return normalizeReportData(data);
}

function scheduleReportRecalculationForDate(dateISO) {
  if (!state.user || !dateISO) return;
  for (const meta of affectedReportPeriods(dateISO)) {
    const existing = state.reportCacheJobs.get(meta.key);
    if (existing?.timeout) clearTimeout(existing.timeout);
    const token = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    setDoc(reportCacheDoc(meta.key), {
      key: meta.key,
      mode: meta.mode,
      start: meta.start,
      end: meta.end,
      version: REPORT_CACHE_VERSION,
      dirty: true,
      invalidatedAt: Date.now()
    }, { merge: true }).catch(console.warn);
    const timeout = setTimeout(() => rebuildReportCacheInBackground(meta, token), REPORT_RECALC_DEBOUNCE_MS);
    state.reportCacheJobs.set(meta.key, { token, timeout });
  }
}

async function rebuildReportCacheInBackground(meta, token) {
  const current = state.reportCacheJobs.get(meta.key);
  if (!current || current.token !== token) return;
  current.timeout = null;
  try {
    const data = await buildReportData(meta);
    const latest = state.reportCacheJobs.get(meta.key);
    if (!latest || latest.token !== token) return;
    await setDoc(reportCacheDoc(meta.key), data, { merge: false });
    const [start, end] = state.reportRange || [];
    if (state.route === "reports" && state.reportMode === meta.mode && start === meta.start && end === meta.end) {
      applyReportGoalsFromData(data);
      state.reportEntries = data.entries || [];
      state.reportData = normalizeReportData(data);
      renderReportOutput(meta.start, meta.end, state.reportEntries, state.reportData);
    }
  } catch (error) {
    console.warn("Background report cache rebuild failed.", error);
  } finally {
    const latest = state.reportCacheJobs.get(meta.key);
    if (latest?.token === token) state.reportCacheJobs.delete(meta.key);
  }
}

function goalStatus(value, goal, mode = "min") {
  if (!goal) return "neutral";
  if (mode === "max") return value <= goal ? "good" : "bad";
  return value >= goal ? "good" : "bad";
}

function reportGoalAverages(start, end, datesOverride = null) {
  const dates = datesOverride || dateRange(start, end);
  const totals = dates.reduce((acc, day) => {
    const goals = effectiveGoalsForDate(day);
    const macros = effectiveMacroGoals(goals);
    acc.calorieGoal += number(goals.calorieGoal, state.settings.calorieGoal);
    acc.proteinGoal += number(macros.proteinGoal);
    acc.carbsGoal += number(macros.carbsGoal);
    acc.fatGoal += number(macros.fatGoal);
    return acc;
  }, { calorieGoal: 0, proteinGoal: 0, carbsGoal: 0, fatGoal: 0 });
  const divisor = Math.max(1, dates.length);
  return {
    calorieGoal: totals.calorieGoal / divisor,
    proteinGoal: totals.proteinGoal / divisor,
    carbsGoal: totals.carbsGoal / divisor,
    fatGoal: totals.fatGoal / divisor
  };
}

function macroGoalStatus(avg, goals) {
  const proteinOk = avg.protein >= goals.proteinGoal;
  const carbsOk = goals.carbsGoal ? avg.carbs <= goals.carbsGoal * 1.1 : true;
  const fatOk = goals.fatGoal ? avg.fat <= goals.fatGoal * 1.1 : true;
  return proteinOk && carbsOk && fatOk ? "good" : "bad";
}

function reportActiveDates(entries, dates) {
  const withEntries = new Set(entries.map(entry => entry.date).filter(Boolean));
  return dates.filter(date => withEntries.has(date));
}

function reportSortButton(table, key, label) {
  const sort = state.reportSorts?.[table] || {};
  const active = sort.key === key;
  const marker = active ? (sort.dir === "asc" ? "↑" : "↓") : "";
  const directionLabel = active ? (sort.dir === "asc" ? "ascending" : "descending") : "unsorted";
  return `<button class="sort-btn ${active ? "active" : ""}" type="button" data-action="report-sort" data-table="${table}" data-key="${key}" aria-label="Sort ${safeText(label)} ${directionLabel}">${safeText(label)}${marker ? `<span aria-hidden="true">${marker}</span>` : ""}</button>`;
}

function setReportSort(table, key) {
  const current = state.reportSorts?.[table] || {};
  const defaultDir = key === "name" ? "asc" : "desc";
  state.reportSorts[table] = {
    key,
    dir: current.key === key ? (current.dir === "asc" ? "desc" : "asc") : defaultDir
  };
}

function compareReportValue(a, b, key) {
  const av = a?.[key];
  const bv = b?.[key];
  if (typeof av === "string" || typeof bv === "string") return String(av || "").localeCompare(String(bv || ""));
  return number(av) - number(bv);
}

function sortReportRows(rows, table) {
  const sort = state.reportSorts?.[table] || {};
  const key = sort.key || "kcal";
  const dir = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => compareReportValue(a, b, key) * dir);
}

function paginatedReportRows(rows, table) {
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(Math.max(1, number(state.reportPages?.[table], 1)), totalPages);
  state.reportPages[table] = current;
  const start = (current - 1) * pageSize;
  return { rows: rows.slice(start, start + pageSize), page: current, totalPages, total: rows.length, start };
}

function renderReportPagination(table, pageData) {
  if (!pageData || pageData.total <= 10) return "";
  return `
    <div class="pagination report-pagination">
      <button class="ghost-btn" data-action="report-page" data-table="${table}" data-dir="-1" ${pageData.page <= 1 ? "disabled" : ""}>Previous</button>
      <span class="kicker">${pageData.start + 1}-${Math.min(pageData.start + 10, pageData.total)} of ${pageData.total}</span>
      <button class="ghost-btn" data-action="report-page" data-table="${table}" data-dir="1" ${pageData.page >= pageData.totalPages ? "disabled" : ""}>Next</button>
    </div>
  `;
}


function renderReportOutput(start, end, entries, reportData = null) {
  const sourceData = reportData ? normalizeReportData(reportData) : null;
  if (sourceData) applyReportGoalsFromData(sourceData);
  const dates = sourceData?.dates || dateRange(start, end);
  const activeDates = sourceData?.activeDates || reportActiveDates(entries, dates);
  const activeDays = Math.max(1, activeDates.length);
  const total = normalizeNutrients(sourceData?.total || addNutrients(entries));
  const avg = scaleNutrients(total, 1 / activeDays);
  const macro = macroCalories(total);
  const byDate = sourceData?.byDate || Object.fromEntries(dates.map(d => [d, emptyNutrients()]));
  if (!sourceData) for (const entry of entries) byDate[entry.date] = addNutrients([{ nutrientsSnapshot: byDate[entry.date] }, entry]);
  const filteredFlatRows = applyReportFlatFilters(sourceData?.flatRows || flatRowsFromReportEntries(entries));
  const foodRows = foodFrequencyRowsFromFlatRows(filteredFlatRows);
  const topRows = sortReportRows(foodRows, "topSources");
  const frequencyRows = sortReportRows(foodRows, "frequency");
  const topPage = paginatedReportRows(topRows, "topSources");
  const frequencyPage = paginatedReportRows(frequencyRows, "frequency");
  const avgGoals = reportGoalAverages(start, end, activeDates);
  const targetCaloriesTotal = avgGoals.calorieGoal * activeDays;
  const loggedDayLabel = `${activeDates.length} logged day${activeDates.length === 1 ? "" : "s"}`;
  const output = document.getElementById("reportOutput");
  output.innerHTML = `
    <div class="grid-4 report-metrics-grid">
      ${metricCard("Average kcal/day", `${round(avg.kcal, 0)} kcal`, `target ${round(avgGoals.calorieGoal, 0)} kcal/day - ${loggedDayLabel}`, goalStatus(avg.kcal, avgGoals.calorieGoal, "max"), `target ${round(avgGoals.calorieGoal, 0)}`)}
      ${metricCard("Average protein", `${round(avg.protein)} g`, `target ${round(avgGoals.proteinGoal)} g/day - ${round(total.protein)} g total`, goalStatus(avg.protein, avgGoals.proteinGoal, "min"), `target ${round(avgGoals.proteinGoal)}g`)}
      ${metricCardHTML("Macro split", `<span class="macro-split-metric"><span class="split-segment ${avg.protein > avgGoals.proteinGoal ? "over" : ""}">${round(macro.proteinPct, 0)}</span><span class="split-separator"> / </span><span class="split-segment ${avg.carbs > avgGoals.carbsGoal ? "over" : ""}">${round(macro.carbsPct, 0)}</span><span class="split-separator"> / </span><span class="split-segment ${avg.fat > avgGoals.fatGoal ? "over" : ""}">${round(macro.fatPct, 0)}</span><span class="split-unit">%</span></span>`, `avg ${round(avg.protein)}P / ${round(avg.carbs)}C / ${round(avg.fat)}F g`, "neutral", `${round(avg.protein)}P / ${round(avg.carbs)}C / ${round(avg.fat)}F`)}
      ${metricCard("Target difference", `${round(total.kcal - targetCaloriesTotal, 0)} kcal`, `vs ${round(targetCaloriesTotal, 0)} kcal target - ${loggedDayLabel}`, goalStatus(total.kcal, targetCaloriesTotal, "max"), `vs ${round(targetCaloriesTotal, 0)}`)}
    </div>

    <div class="grid-2">
      <div class="card chart-card">
        <h3>Calories</h3>
        <canvas id="calorieChart"></canvas>
      </div>
      <div class="card chart-card">
        <h3>Macros</h3>
        <canvas id="macroChart"></canvas>
      </div>
    </div>

    <div class="card">
      <h3>Top sources</h3>
      <div class="table-wrap"><table class="report-table"><thead><tr><th>${reportSortButton("topSources", "name", "Food")}</th><th>${reportSortButton("topSources", "kcal", "kcal")}</th><th>${reportSortButton("topSources", "protein", "Protein")}</th><th>${reportSortButton("topSources", "carbs", "Carbs")}</th><th>${reportSortButton("topSources", "fat", "Fat")}</th></tr></thead><tbody>${topPage.rows.map(row => `<tr><td>${safeText(row.name)}</td><td>${round(row.kcal, 0)}</td><td>${round(row.protein)} g</td><td>${round(row.carbs)} g</td><td>${round(row.fat)} g</td></tr>`).join("") || `<tr><td colspan="5">No entries.</td></tr>`}</tbody></table></div>
      ${renderReportPagination("topSources", topPage)}
    </div>

    <div class="card">
      <div class="table-card-head">
        <h3>Food frequency</h3>
        <div class="segmented">
          <button class="tiny-btn ${state.reportFrequencyMode === "abs" ? "active" : ""}" type="button" data-action="set-report-frequency-mode" data-mode="abs">Abs</button>
          <button class="tiny-btn ${state.reportFrequencyMode === "avg" ? "active" : ""}" type="button" data-action="set-report-frequency-mode" data-mode="avg">Avg</button>
        </div>
      </div>
      <div class="table-wrap">
        <table class="report-table">
          <thead><tr><th>${reportSortButton("frequency", "name", "Food")}</th><th>${reportSortButton("frequency", "count", state.reportFrequencyMode === "avg" ? "Times/day" : "Times")}</th><th>${reportSortButton("frequency", "grams", state.reportFrequencyMode === "avg" ? "Amount/day" : "Total amount")}</th><th>${reportSortButton("frequency", "kcal", state.reportFrequencyMode === "avg" ? "kcal/day" : "Total kcal")}</th></tr></thead>
          <tbody>${frequencyPage.rows.length ? frequencyPage.rows.map(row => {
            const factor = state.reportFrequencyMode === "avg" ? 1 / activeDays : 1;
            return `<tr><td>${safeText(row.name)}</td><td>${round(row.count * factor, state.reportFrequencyMode === "avg" ? 2 : 0)}</td><td>${round(row.grams * factor, 0)} g</td><td>${round(row.kcal * factor, 0)}</td></tr>`;
          }).join("") : `<tr><td colspan="4">No entries in this range.</td></tr>`}</tbody>
        </table>
      </div>
      ${renderReportPagination("frequency", frequencyPage)}
    </div>

    <div class="card">
      <div class="table-card-head">
        <h3>Micronutrients and limits</h3>
        <div class="segmented">
          <button class="tiny-btn ${state.reportMicroMode === "abs" ? "active" : ""}" type="button" data-action="set-report-micro-mode" data-mode="abs">Abs</button>
          <button class="tiny-btn ${state.reportMicroMode === "avg" ? "active" : ""}" type="button" data-action="set-report-micro-mode" data-mode="avg">Avg</button>
        </div>
      </div>
      <div class="table-wrap">
        <table class="report-table">
          <thead><tr><th>${reportSortButton("micros", "name", "Nutrient")}</th><th>${reportSortButton("micros", "consumed", state.reportMicroMode === "avg" ? "Avg consumed" : "Consumed")}</th><th>${reportSortButton("micros", "target", state.reportMicroMode === "avg" ? "Daily guidance" : "Period guidance")}</th><th>${reportSortButton("micros", "diff", "Difference")}</th></tr></thead>
          <tbody>${renderMicroRows(total, activeDays)}</tbody>
        </table>
      </div>
    </div>
  `;
  renderCharts(byDate);
}

function foodNameFromReportItem(item) {
  return item?.nameSnapshot || item?.displayName || item?.name || "Unnamed";
}

function gramsFromReportItem(item, factor = 1) {
  return number(item?.gramsEquivalent ?? item?.grams ?? (item?.unit === "g" ? item?.amount : 0)) * factor;
}

function recipeSnapshotFromItem(item) {
  if (item?.recipeSnapshot) return item.recipeSnapshot;
  if (item?.itemSnapshot?.ingredients) return item.itemSnapshot;
  if (item?.itemId) return state.recipes.find(recipe => recipe.id === item.itemId) || null;
  return null;
}

function flattenReportItem(item, factor = 1) {
  if (!item) return [];
  if (item.itemType === "recipe") {
    const snapshot = recipeSnapshotFromItem(item);
    const ingredients = snapshot?.ingredients || [];
    if (ingredients.length) {
      const portionFactor = factor * number(item.amount, 1) / Math.max(1, number(snapshot.portions, 1));
      return ingredients.flatMap(ingredient => flattenReportItem(ingredient, portionFactor));
    }
  }
  if (item.itemType === "mealset") {
    const snapshot = item.itemSnapshot || item;
    const items = snapshot.items || [];
    if (items.length) return items.flatMap(child => flattenReportItem(child, factor * number(item.amount, 1)));
  }
  const nutrients = scaleNutrients(item.nutrientsSnapshot, factor);
  return [{
    name: foodNameFromReportItem(item),
    brand: item.brandSnapshot || item.brand || "",
    grams: gramsFromReportItem(item, factor),
    kcal: nutrients.kcal,
    protein: nutrients.protein,
    carbs: nutrients.carbs,
    fat: nutrients.fat
  }];
}

function flattenReportEntry(entry) {
  if (entry.itemType === "recipe") {
    const snapshot = entry.itemSnapshot || recipeSnapshotFromItem(entry);
    const ingredients = snapshot?.ingredients || [];
    if (ingredients.length) {
      const factor = number(entry.amount, 1) / Math.max(1, number(snapshot.portions, 1));
      return ingredients.flatMap(item => flattenReportItem(item, factor));
    }
  }
  if (entry.itemType === "mealset") {
    const items = entry.itemSnapshot?.items || [];
    if (items.length) return items.flatMap(item => flattenReportItem(item, number(entry.amount, 1)));
  }
  return flattenReportItem(entry, 1);
}

function foodFrequencyRows(entries) {
  const map = new Map();
  for (const entry of entries) {
    for (const item of flattenReportEntry(entry)) {
      const key = normalizeSearchText(`${item.name}|${item.brand}`);
      const current = map.get(key) || { name: item.name, count: 0, grams: 0, kcal: 0, protein: 0, carbs: 0, fat: 0, brand: item.brand || "" };
      current.count += 1;
      current.grams += number(item.grams);
      current.kcal += number(item.kcal);
      current.protein += number(item.protein);
      current.carbs += number(item.carbs);
      current.fat += number(item.fat);
      map.set(key, current);
    }
  }
  return [...map.values()].sort((a, b) => b.kcal - a.kcal);
}

function foodFrequencyRowsFromFlatRows(rows = []) {
  const map = new Map();
  for (const item of rows || []) {
    const key = normalizeSearchText(`${item.name}|${item.brand}`);
    const current = map.get(key) || { name: item.name, count: 0, grams: 0, kcal: 0, protein: 0, carbs: 0, fat: 0, brand: item.brand || "" };
    current.count += 1;
    current.grams += number(item.grams);
    current.kcal += number(item.kcal);
    current.protein += number(item.protein);
    current.carbs += number(item.carbs);
    current.fat += number(item.fat);
    map.set(key, current);
  }
  return [...map.values()].sort((a, b) => b.kcal - a.kcal);
}

function applyReportFlatFilters(rows = []) {
  const meal = document.getElementById("reportMealFilter")?.value || "all";
  const brand = normalizeSearchText(document.getElementById("reportBrandFilter")?.value || "");
  const source = normalizeSearchText(document.getElementById("reportSourceFilter")?.value || "");
  return rows.filter(row => {
    if (meal !== "all" && row.meal !== meal) return false;
    if (brand && !normalizeSearchText(row.brand).includes(brand)) return false;
    if (source && !normalizeSearchText(row.source).includes(source)) return false;
    return true;
  });
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

function reportMicroRows(total, days) {
  const displayMode = state.reportMicroMode === "avg" ? "avg" : "abs";
  const rows = [
    ["fiber", state.settings.fiberGoal * days, "min"],
    ["sugar", state.settings.sugarGoal * days, "max"],
    ["sodium", state.settings.sodiumMax * days, "max"],
    ...Object.entries(state.settings.micronutrientGoals || {})
      .filter(([key]) => !["sodium", "salt"].includes(key))
      .map(([key, value]) => [key, number(value.target) * days, value.mode || "min"])
  ].filter(([key]) => nutrientVisible(key));
  return rows.map(([key, target, goalMode]) => {
    const consumed = displayMode === "avg" ? number(total[key]) / days : number(total[key]);
    const shownTarget = displayMode === "avg" ? number(target) / days : number(target);
    const diff = consumed - shownTarget;
    const unit = NUTRIENT_UNITS[key];
    const badgeClass = goalMode === "max" ? (diff > 0 ? "orange" : "") : (diff >= 0 ? "" : "orange");
    return {
      key,
      name: NUTRIENT_LABELS[key],
      consumed,
      target: shownTarget,
      diff,
      unit,
      badgeClass
    };
  });
}

function renderMicroRows(total, days) {
  return sortReportRows(reportMicroRows(total, days), "micros").map(row => {
    const precision = row.key === "sodium" ? 0 : 1;
    return `<tr><td>${safeText(row.name)}</td><td>${round(row.consumed, precision)} ${safeText(row.unit)}</td><td>${round(row.target, precision)} ${safeText(row.unit)}</td><td><span class="badge ${row.badgeClass}">${row.diff >= 0 ? "+" : ""}${round(row.diff, precision)} ${safeText(row.unit)}</span></td></tr>`;
  }).join("");
}

function reportChartData(byDate) {
  const dates = Object.keys(byDate);
  if (state.reportMode === "year") {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const buckets = monthNames.map(() => emptyNutrients());
    const targetBuckets = monthNames.map(() => ({ kcal: 0, protein: 0, carbs: 0, fat: 0 }));
    for (const date of dates) {
      const month = new Date(`${date}T12:00:00`).getMonth();
      const goals = effectiveGoalsForDate(date);
      const macros = effectiveMacroGoals(goals);
      buckets[month] = addNutrients([{ nutrientsSnapshot: buckets[month] }, byDate[date]]);
      targetBuckets[month].kcal += number(goals.calorieGoal);
      targetBuckets[month].protein += number(macros.proteinGoal);
      targetBuckets[month].carbs += number(macros.carbsGoal);
      targetBuckets[month].fat += number(macros.fatGoal);
    }
    return { labels: monthNames, values: buckets, targets: targetBuckets };
  }
  const labels = dates.map(date => {
    const d = new Date(`${date}T12:00:00`);
    if (state.reportMode === "month") return String(d.getDate()).padStart(2, "0");
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
  });
  const targets = dates.map(date => {
    const goals = effectiveGoalsForDate(date);
    const macros = effectiveMacroGoals(goals);
    return {
      kcal: number(goals.calorieGoal),
      protein: number(macros.proteinGoal),
      carbs: number(macros.carbsGoal),
      fat: number(macros.fatGoal)
    };
  });
  return { labels, values: dates.map(date => byDate[date]), targets };
}

function renderCharts(byDate) {
  if (!window.Chart) return;
  Object.values(state.charts).forEach(chart => chart?.destroy?.());
  const chartData = reportChartData(byDate);
  const labels = chartData.labels;
  const kcal = chartData.values.map(n => round(n.kcal, 0));
  const protein = chartData.values.map(n => round(n.protein, 1));
  const carbs = chartData.values.map(n => round(n.carbs, 1));
  const fat = chartData.values.map(n => round(n.fat, 1));
  const kcalTarget = chartData.targets.map(n => round(n.kcal, 0));
  const proteinTarget = chartData.targets.map(n => round(n.protein, 1));
  const carbsTarget = chartData.targets.map(n => round(n.carbs, 1));
  const fatTarget = chartData.targets.map(n => round(n.fat, 1));
  const calorieCtx = document.getElementById("calorieChart");
  const macroCtx = document.getElementById("macroChart");
  if (calorieCtx) {
    state.charts.calorie = new Chart(calorieCtx, {
      type: "line",
      data: {
        labels,
        datasets: [
          { label: "kcal", data: kcal, borderColor: "#f97316", backgroundColor: "rgba(249,115,22,.13)", tension: .35 },
          { label: "kcal target", data: kcalTarget, borderColor: "#f97316", borderDash: [6, 6], pointRadius: 0, tension: 0, isTarget: true }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { filter: (item, data) => !data.datasets[item.datasetIndex]?.isTarget } } } }
    });
  }
  if (macroCtx) {
    state.charts.macro = new Chart(macroCtx, {
      type: "line",
      data: {
        labels,
        datasets: [
          { label: "Protein", data: protein, borderColor: "#2563eb", backgroundColor: "rgba(37,99,235,.12)", tension: .35 },
          { label: "Protein target", data: proteinTarget, borderColor: "#2563eb", borderDash: [6, 6], pointRadius: 0, tension: 0, isTarget: true },
          { label: "Carbs", data: carbs, borderColor: "#7c3aed", backgroundColor: "rgba(124,58,237,.12)", tension: .35 },
          { label: "Carbs target", data: carbsTarget, borderColor: "#7c3aed", borderDash: [6, 6], pointRadius: 0, tension: 0, isTarget: true },
          { label: "Fat", data: fat, borderColor: "#f59e0b", backgroundColor: "rgba(245,158,11,.14)", tension: .35 },
          { label: "Fat target", data: fatTarget, borderColor: "#f59e0b", borderDash: [6, 6], pointRadius: 0, tension: 0, isTarget: true }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { filter: (item, data) => !data.datasets[item.datasetIndex]?.isTarget } } } }
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

  const header = ["date", "meal", "item_name", "brand", "amount", "unit", "grams", "kcal", "protein", "carbs", "sugar", "fat", "saturated_fat", "trans_fat", "fiber", "sodium", "source"];
  const rows = entries.map(e => {
    const n = normalizeNutrients(e.nutrientsSnapshot);
    return [
      e.date, e.meal, e.nameSnapshot, e.brandSnapshot || "", e.amount, e.unit, e.gramsEquivalent || "",
      n.kcal, n.protein, n.carbs, n.sugar, n.fat, n.saturatedFat, n.transFat, n.fiber, n.sodium, e.source || e.itemType
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
  const s = effectiveGoalsForDate(state.currentDate);
  const appPrefs = state.settings;
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
            <p>Targets are saved for the selected Diary date, so older days keep their original goal.</p>
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

      <div class="card preferences-card">
        <h3>App preferences</h3>
        <div class="form-grid">
          ${preferenceControl("Theme", `
            <select name="theme">
              ${["system", "light", "dark"].map(v => `<option value="${v}" ${appPrefs.theme === v ? "selected" : ""}>${v}</option>`).join("")}
            </select>
          `)}
          ${preferenceControl("Search region", `
            <select name="searchRegion">
              ${SEARCH_REGIONS.map(([value, label]) => `<option value="${value}" ${appPrefs.searchRegion === value ? "selected" : ""}>${label}</option>`).join("")}
            </select>
          `)}
          ${preferenceControl("Database preference", `
            <select name="databasePreference">
              ${[
                ["custom-first", "Personal first"],
                ["api-first", "API first"],
                ["offline-only", "Offline/cache only"]
              ].map(([value, label]) => `<option value="${value}" ${appPrefs.databasePreference === value ? "selected" : ""}>${label}</option>`).join("")}
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
          <button class="secondary-btn sync-diff-btn" type="button" data-action="resolve-sync-conflict">Check local/Firebase difference</button>
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
    dashboardDensity: "comfortable",
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
      const dayGoal = goalSnapshotFromSettings(next);
      dayGoal.savedForDate = state.currentDate;
      state.dailyGoals[state.currentDate] = dayGoal;
      writeLocal(`dailyGoal:${state.currentDate}`, dayGoal);
      writeLocal("settings", next);
      await Promise.all([
        setDoc(userDoc("private", "settings"), cleanForFirestore(next), { merge: true }),
        setDoc(dailyGoalDoc(state.currentDate), cleanForFirestore(dayGoal), { merge: true })
      ]);
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
    dailyGoals: state.dailyGoals,
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

    for (const [dateISO, goal] of Object.entries(payload.dailyGoals || {})) {
      if (!dateISO || !goal) continue;
      state.dailyGoals[dateISO] = goal;
      writeLocal(`dailyGoal:${dateISO}`, goal);
      await setDoc(dailyGoalDoc(dateISO), cleanForFirestore(goal), { merge: true });
    }

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
        <p>This deletes settings, custom foods, recipes, mealsets, local offline data, and all logged diary days that can be found from Firebase summaries, goals, and local cache. Type <strong>DELETE</strong> to confirm.</p>
        <label>Confirmation<input name="confirmation" autocomplete="off" placeholder="DELETE" /></label>
        <div id="deleteProgress" class="delete-progress hidden" aria-live="polite">
          <div class="delete-progress-head">
            <strong id="deleteProgressText">Preparing deletion...</strong>
            <span id="deleteProgressCount">0%</span>
          </div>
          <div class="delete-progress-track">
            <div id="deleteProgressBar" class="delete-progress-bar" style="width:0%;"></div>
          </div>
          <small id="deleteProgressDetail">This can take a moment for imported diary histories.</small>
        </div>
        <div class="form-actions"><button class="danger-btn" type="submit">Delete all data</button></div>
      </form>
    </div>
  `);
  document.getElementById("deleteAllDataForm")?.addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector("button[type=\"submit\"]");
    const confirmation = new FormData(form).get("confirmation");
    if (confirmation !== "DELETE") {
      showToast("Type DELETE to confirm.");
      return;
    }
    const progressBox = document.getElementById("deleteProgress");
    progressBox?.classList.remove("hidden");
    if (button) {
      button.disabled = true;
      button.textContent = "Deleting...";
    }
    try {
      await deleteAllAccountData(updateDeleteProgress);
      updateDeleteProgress({ current: 1, total: 1, label: "Deletion complete", detail: "Refreshing the app state now." });
      closeModal();
      showToast("All account data deleted successfully.");
    } catch (error) {
      if (button) {
        button.disabled = false;
        button.textContent = "Delete all data";
      }
      updateDeleteProgress({ current: 0, total: 1, label: "Deletion failed", detail: error?.message || "Something went wrong." });
      showError(error, "Delete all data failed.");
    }
  });
}

function updateDeleteProgress({ current = 0, total = 1, label = "Deleting data...", detail = "" } = {}) {
  const safeTotal = Math.max(1, number(total, 1));
  const safeCurrent = Math.max(0, Math.min(safeTotal, number(current, 0)));
  const pct = Math.max(0, Math.min(100, Math.round(safeCurrent / safeTotal * 100)));
  const bar = document.getElementById("deleteProgressBar");
  const text = document.getElementById("deleteProgressText");
  const count = document.getElementById("deleteProgressCount");
  const detailEl = document.getElementById("deleteProgressDetail");
  if (bar) bar.style.width = `${pct}%`;
  if (text) text.textContent = label;
  if (count) count.textContent = `${pct}%`;
  if (detailEl) detailEl.textContent = detail || `${safeCurrent} of ${safeTotal} delete steps finished.`;
}

function nextPaint() {
  return new Promise(resolve => requestAnimationFrame(() => resolve()));
}

async function deleteCollectionDocs(collectionName, progress = () => {}, counter = { current: 0, total: 1 }) {
  progress({ current: counter.current, total: counter.total, label: `Scanning ${collectionName}...`, detail: "Finding saved documents." });
  await nextPaint();
  const snap = await getDocs(userCollection(collectionName));
  const deletedIds = [];
  for (const docSnap of snap.docs) {
    await deleteDoc(userDoc(collectionName, docSnap.id));
    deletedIds.push(docSnap.id);
    counter.current += 1;
    progress({ current: counter.current, total: counter.total, label: `Deleting ${collectionName}...`, detail: `${deletedIds.length} ${collectionName} document${deletedIds.length === 1 ? "" : "s"} deleted.` });
    if (counter.current % 10 === 0) await nextPaint();
  }
  writeLocal(collectionName, []);
  return deletedIds;
}

function removeAllLocalUserData() {
  const uid = state.user?.uid || "guest";
  const prefix = `${APP_STORAGE_PREFIX}:${uid}:`;
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(prefix)) localStorage.removeItem(key);
  }
}

async function discoverLoggedDatesForDelete(progress = () => {}) {
  progress({ current: 0, total: 1, label: "Scanning diary dates...", detail: "Checking local cache and Firebase summaries." });
  await nextPaint();

  const knownDates = new Set([
    state.currentDate,
    ...state.logs.map(entry => entry.date).filter(Boolean),
    ...state.reportEntries.map(entry => entry.date).filter(Boolean),
    ...Object.keys(state.dailyGoals || {})
  ]);

  const uid = state.user?.uid || "guest";
  const logsPrefix = `${APP_STORAGE_PREFIX}:${uid}:logs:`;
  const goalsPrefix = `${APP_STORAGE_PREFIX}:${uid}:dailyGoal:`;
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(logsPrefix)) knownDates.add(key.slice(logsPrefix.length));
    if (key.startsWith(goalsPrefix)) knownDates.add(key.slice(goalsPrefix.length));
  }

  for (const collectionName of ["dailyCalories", "dailyGoals", "dailyLogs"]) {
    try {
      progress({ current: 0, total: 1, label: `Scanning ${collectionName}...`, detail: `${knownDates.size} possible diary day${knownDates.size === 1 ? "" : "s"} found so far.` });
      await nextPaint();
      const snap = await getDocs(userCollection(collectionName));
      snap.docs.forEach(docSnap => knownDates.add(docSnap.id));
    } catch (error) {
      console.warn(`Could not enumerate ${collectionName} while deleting account data.`, error);
    }
  }

  return [...knownDates].filter(Boolean);
}

async function estimateDeleteWork(datesToDelete) {
  let total = 1; // settings reset
  const topLevelCollections = ["customFoods", "recipes", "mealsets", "dailyCalories", "dailyGoals"];
  const collectionCounts = {};

  for (const collectionName of topLevelCollections) {
    try {
      const snap = await getDocs(userCollection(collectionName));
      collectionCounts[collectionName] = snap.size;
      total += snap.size;
    } catch (error) {
      collectionCounts[collectionName] = 0;
      console.warn(`Could not count ${collectionName} before deletion.`, error);
    }
  }

  const entryCounts = {};
  for (const dateISO of datesToDelete) {
    try {
      const snap = await getDocs(entryCollection(dateISO));
      entryCounts[dateISO] = snap.size;
      total += snap.size + 2; // dailyCalories + dailyGoals doc attempts
    } catch (error) {
      entryCounts[dateISO] = 0;
      total += 2;
      console.warn(`Could not count diary entries for ${dateISO}.`, error);
    }
  }

  return { total: Math.max(1, total), collectionCounts, entryCounts };
}

async function deleteAllAccountData(progress = () => {}) {
  if (!state.user) throw new Error("You need to be signed in to delete account data.");

  const datesToDelete = await discoverLoggedDatesForDelete(progress);
  progress({ current: 0, total: 1, label: "Counting data...", detail: `${datesToDelete.length} diary day${datesToDelete.length === 1 ? "" : "s"} found.` });
  await nextPaint();

  const work = await estimateDeleteWork(datesToDelete);
  const counter = { current: 0, total: work.total };

  for (const dateISO of datesToDelete) {
    progress({ current: counter.current, total: counter.total, label: `Deleting diary ${dateISO}...`, detail: "Removing diary entries and daily summaries." });
    await nextPaint();

    try {
      const entriesSnap = await getDocs(entryCollection(dateISO));
      let deletedEntries = 0;
      for (const docSnap of entriesSnap.docs) {
        await deleteDoc(entryDoc(docSnap.id, dateISO));
        deletedEntries += 1;
        counter.current += 1;
        progress({ current: counter.current, total: counter.total, label: `Deleting diary ${dateISO}...`, detail: `${deletedEntries} entr${deletedEntries === 1 ? "y" : "ies"} deleted for this day.` });
        if (counter.current % 10 === 0) await nextPaint();
      }
    } catch (error) {
      console.warn(`Could not delete entries for ${dateISO}.`, error);
    }

    try {
      await deleteDoc(dailyCaloriesDoc(dateISO));
    } catch (error) {
      console.warn(`Could not delete calorie summary for ${dateISO}.`, error);
    }
    counter.current += 1;
    progress({ current: counter.current, total: counter.total, label: `Deleting diary ${dateISO}...`, detail: "Daily calorie summary cleared." });

    try {
      await deleteDoc(dailyGoalDoc(dateISO));
    } catch (error) {
      console.warn(`Could not delete daily goal for ${dateISO}.`, error);
    }
    counter.current += 1;
    progress({ current: counter.current, total: counter.total, label: `Deleting diary ${dateISO}...`, detail: "Daily goal snapshot cleared." });
  }

  for (const collectionName of ["customFoods", "recipes", "mealsets", "dailyCalories", "dailyGoals"]) {
    await deleteCollectionDocs(collectionName, progress, counter).catch(error => console.warn(`Could not fully clear ${collectionName}.`, error));
  }

  progress({ current: counter.current, total: counter.total, label: "Resetting settings...", detail: "Restoring default settings." });
  await setDoc(userDoc("private", "settings"), cleanForFirestore(DEFAULT_SETTINGS), { merge: false });
  counter.current += 1;
  progress({ current: counter.current, total: counter.total, label: "Clearing local cache...", detail: "Removing offline data from this browser." });

  removeAllLocalUserData();
  writeLocal("settings", DEFAULT_SETTINGS);
  writeLocal("customFoods", []);
  writeLocal("recipes", []);
  writeLocal("mealsets", []);
  writeLocal(`logs:${state.currentDate}`, []);

  state.settings = structuredClone(DEFAULT_SETTINGS);
  state.logs = [];
  state.customFoods = [];
  state.recipes = [];
  state.mealsets = [];
  state.dailyGoals = {};
  state.searchResults = [];
  state.reportEntries = [];
  state.reportData = null;
  state.reportPages = { topSources: 1, frequency: 1 };
  state.reportRange = periodRange();
  setTheme();
  if (state.route === "today") subscribeLogsForCurrentDate();
  renderCurrentRoute();
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
        ${canScan ? `
          <div class="video-box"><video id="barcodeVideo" muted playsinline></video></div>
        ` : `<div class="empty-state">Camera barcode scanning is not available in this browser. Type the barcode in the search field instead.</div>`}
      </div>
    </div>
  `);
  if (canScan) setTimeout(() => startBarcodeScan().catch(showError), 0);
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

function openEntrySnapshotModal(id) {
  const entry = state.logs.find(e => e.id === id);
  const snapshot = entry?.itemSnapshot;
  if (!entry || !snapshot) return;
  const n = normalizeNutrients(snapshot.nutrientsSnapshot || entry.nutrientsSnapshot);
  const ingredientRows = snapshot.itemType === "recipe" ? snapshot.ingredients || [] : snapshot.items || [];
  openModal(`
    <div class="modal">
      <div class="modal-head"><h3>${safeText(entry.nameSnapshot)}</h3><button class="close-btn" data-action="close-modal">x</button></div>
      <div class="modal-body">
        <p class="kicker">Logged ${entry.createdAt ? new Date(number(entry.createdAt)).toLocaleString() : "at this entry time"}. This is the saved version, independent of later recipe or mealset edits.</p>
        ${nutrientSummaryHTML(n)}
        ${ingredientRows.length ? `
          <div class="detail-table">
            ${ingredientRows.map(item => `
              <div class="detail-row"><span>${safeText(item.nameSnapshot || item.name || "Item")}</span><strong>${itemAmountText(item)} · ${round(item.nutrientsSnapshot?.kcal, 0)} kcal</strong></div>
            `).join("")}
          </div>
        ` : `<div class="empty-state">No ingredient snapshot stored for this entry.</div>`}
      </div>
    </div>
  `);
}

async function editEntry(id) {
  const entry = state.logs.find(e => e.id === id);
  if (!entry) return;
  const food = foodLikeFromEntry(entry);
  const isFoodEntry = !!food;
  const servingOptions = isFoodEntry ? buildServingOptions(food) : [{ label: entry.unit || "serving", grams: 100, mode: "serving", unit: entry.unit || "serving" }];
  const selectedServingIndex = isFoodEntry ? preferredServingIndex(servingOptions, entry.unit, entry.gramsEquivalent, true) : 0;
  const selectedServing = servingOptions[selectedServingIndex] || servingOptions[0];
  const currentAmount = entry.amount !== undefined && entry.amount !== null
    ? round(entry.amount, 2)
    : isFoodEntry
      ? (selectedServing.mode === "grams" ? round(entry.gramsEquivalent || 100, 2) : round(number(entry.gramsEquivalent) / Math.max(0.0001, number(selectedServing.grams, 1)), 2))
      : round(entry.amount || 1, 2);
  const nutrientsForEntrySelection = (amount, selected) => {
    if (isFoodEntry) return nutrientsForIngredientAmount(food, amount, gramsForServingAmount(selected, amount));
    const oldAmount = number(entry.amount, 1) || 1;
    return scaleNutrients(entry.nutrientsSnapshot, amount / oldAmount);
  };
  openModal(`
    <div class="modal amount-selector-modal">
      <div class="modal-head"><h3>Edit entry</h3><button class="close-btn" type="button" data-action="close-modal">x</button></div>
      <form id="editEntryForm" class="modal-body">
        <div class="form-grid two">
          <label>Amount<input name="amount" type="number" inputmode="decimal" step="0.01" min="0" value="${currentAmount}" required /></label>
          <label>Unit
            <select name="unitIndex" ${isFoodEntry ? "" : "disabled"}>
              ${servingOptions.map((s, idx) => `<option value="${idx}" ${idx === selectedServingIndex ? "selected" : ""}>${safeText(servingDisplayName(s))}</option>`).join("")}
            </select>
          </label>
          <label>Meal<select name="meal">${MEALS.map(([mid, label]) => `<option value="${mid}" ${entry.meal === mid ? "selected" : ""}>${label}</option>`).join("")}</select></label>
        </div>
        <div id="editEntryPreview" class="amount-preview">
          ${nutrientSummaryHTML(nutrientsForEntrySelection(currentAmount, selectedServing))}
        </div>
        <div class="form-actions"><button class="primary-btn" type="submit">Save</button></div>
      </form>
    </div>
  `);
  const form = document.getElementById("editEntryForm");
  const preview = document.getElementById("editEntryPreview");
  const updatePreview = () => {
    const data = new FormData(form);
    const selected = servingOptions[formNumberValue(data.get("unitIndex"), selectedServingIndex)] || selectedServing;
    const amount = formNumberValue(data.get("amount"), defaultAmountForServing(selected));
    preview.innerHTML = nutrientSummaryHTML(nutrientsForEntrySelection(amount, selected));
  };
  form?.elements.amount?.addEventListener("input", updatePreview);
  form?.elements.amount?.addEventListener("change", updatePreview);
  form?.elements.unitIndex?.addEventListener("change", () => {
    const selected = servingOptions[formNumberValue(form.elements.unitIndex?.value, selectedServingIndex)] || selectedServing;
    if (isFoodEntry && form.elements.amount && document.activeElement !== form.elements.amount) {
      form.elements.amount.value = defaultAmountForServing(selected);
    }
    updatePreview();
  });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const selected = servingOptions[formNumberValue(data.get("unitIndex"), selectedServingIndex)] || selectedServing;
    const newAmount = formNumberValue(data.get("amount"), currentAmount);
    const unit = isFoodEntry ? servingUnitName(selected) : (entry.unit || servingUnitName(selected));
    const gramsEquivalent = isFoodEntry ? gramsForServingAmount(selected, newAmount) : (entry.gramsEquivalent ? entry.gramsEquivalent * (newAmount / (number(entry.amount, 1) || 1)) : entry.gramsEquivalent);
    const updatedAt = Date.now();
    const nutrientsSnapshot = nutrientsForEntrySelection(newAmount, selected);
    const itemSnapshot = entry.itemSnapshot ? {
      ...entry.itemSnapshot,
      amount: newAmount,
      unit,
      gramsEquivalent,
      defaultServing: isFoodEntry ? food.defaultServing || entry.itemSnapshot.defaultServing || null : entry.itemSnapshot.defaultServing,
      servingOptions: isFoodEntry ? food.servingOptions || entry.itemSnapshot.servingOptions || [] : entry.itemSnapshot.servingOptions,
      nutrientsPer100g: isFoodEntry ? normalizeNutrients(food.nutrientsPer100g) : entry.itemSnapshot.nutrientsPer100g,
      nutrientsSnapshot,
      updatedAt
    } : null;
    await updateDoc(entryDoc(id), cleanForFirestore({
      amount: newAmount,
      unit,
      gramsEquivalent,
      meal: data.get("meal"),
      nutrientsSnapshot,
      ...(itemSnapshot ? { itemSnapshot } : {}),
      updatedAt
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
  const createdAt = Date.now();
  const copy = { ...entry, createdAt, updatedAt: createdAt };
  if (copy.itemSnapshot) copy.itemSnapshot = { ...copy.itemSnapshot, loggedAt: createdAt, duplicatedFrom: entry.createdAt || null };
  delete copy.id;
  await addDoc(entryCollection(state.currentDate), cleanForFirestore(copy));
  await updateDailyCalorieSummary(state.currentDate).catch(console.warn);
}

function openModal(html) {
  els.modalRoot.innerHTML = html;
  els.modalRoot.classList.remove("hidden");
  document.body.classList.add("modal-open");
}

function closeModal() {
  const video = document.getElementById("barcodeVideo");
  if (video?.srcObject) video.srcObject.getTracks().forEach(track => track.stop());
  els.modalRoot.classList.add("hidden");
  els.modalRoot.innerHTML = "";
  document.body.classList.remove("modal-open");
}

async function handleDynamicSubmit(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  try {
    if (form.id === "logFoodForm") {
      event.preventDefault();
      if (form.dataset.submitting === "true") return;
      form.dataset.submitting = "true";
      const data = new FormData(form);
      const key = form.dataset.foodKey;
      const food = key ? getFoodByKey(key) : state.activeLogFood;
      if (!food) throw new Error("Could not find this food anymore. Close the modal and open it again.");
      const { amount, unit, grams } = servingSelectionFromData(food, data);
      await logFood(food, amount, unit, grams, data.get("meal"), data.get("date"));
      closeModal();
      return;
    }
  } catch (error) {
    form.dataset.submitting = "";
    showError(error);
  }
}


function selectableCardsForKeyboard(scope) {
  const root = scope === "ingredient" ? document.getElementById("ingredientResults") : document.getElementById("searchResults");
  if (!root) return [];
  return [...root.querySelectorAll(".result-card")].filter(card => card.offsetParent !== null);
}

function updateKeyboardSelection(scope, direction) {
  const cards = selectableCardsForKeyboard(scope);
  if (!cards.length) return;
  const current = number(state.keyboardSelection?.[scope], -1);
  const next = Math.max(0, Math.min(cards.length - 1, current + direction));
  state.keyboardSelection[scope] = next;
  cards.forEach((card, index) => card.classList.toggle("keyboard-active", index === next));
  cards[next]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function activateKeyboardSelection(scope) {
  const cards = selectableCardsForKeyboard(scope);
  const index = number(state.keyboardSelection?.[scope], -1);
  const card = cards[index];
  if (!card) return false;
  const button = card.querySelector('[data-action="select-ingredient"], [data-action="log-food"], [data-action="log-recipe"], [data-action="log-mealset"], .primary-btn');
  button?.click();
  return !!button;
}

function handleKeyboardNavigation(event) {
  if (window.matchMedia("(max-width: 980px)").matches) return;
  const inIngredient = !!document.getElementById("ingredientResults") && !els.modalRoot.classList.contains("hidden");
  const inSearch = state.route === "search" && !!document.getElementById("searchResults");
  const scope = inIngredient ? "ingredient" : inSearch ? "search" : null;
  if (!scope) return;
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    updateKeyboardSelection(scope, event.key === "ArrowDown" ? 1 : -1);
  }
  if (event.key === "Enter" && state.keyboardSelection?.[scope] >= 0) {
    event.preventDefault();
    activateKeyboardSelection(scope);
  }
}

document.addEventListener("keydown", handleKeyboardNavigation);

document.addEventListener("submit", handleDynamicSubmit);

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
    if (action === "jump-today") {
      state.currentDate = todayISO();
      state.defaultLogDate = state.currentDate;
      subscribeLogsForCurrentDate();
    }
    if (action === "recent-search") await runActiveSearch(btn.dataset.query || "");
    if (action === "search-foods") await runActiveSearch(document.getElementById("foodSearchInput")?.value || "");
    if (action === "set-search-tab") {
      state.searchTab = btn.dataset.tab || "foods";
      state.searchPage = 1;
      renderSearchV2();
    }
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
    if (action === "start-barcode-scan") await startBarcodeScan();
    if (action === "log-food") openLogFoodModal(getFoodByKey(btn.dataset.key));
    if (action === "food-detail") openFoodDetailModal(getFoodByKey(btn.dataset.key));
    if (action === "save-api-food") await saveApiFoodAsCustom(btn.dataset.key);
    if (action === "toggle-favorite-food") await toggleFavoriteFood(btn.dataset.id);
    if (action === "edit-custom-food") openCustomFoodEditor(state.customFoods.find(food => food.id === btn.dataset.id));
    if (action === "duplicate-custom-food") openCustomFoodEditor(state.customFoods.find(food => food.id === btn.dataset.id), true);
    if (action === "delete-custom-food" && confirm("Delete this custom food?")) {
      await deleteDoc(userDoc("customFoods", btn.dataset.id));
      if (btn.closest(".modal")) closeModal();
    }
    if (action === "delete-entry") {
      await deleteDoc(entryDoc(btn.dataset.id));
      await updateDailyCalorieSummary(state.currentDate).catch(console.warn);
    }
    if (action === "entry-snapshot") openEntrySnapshotModal(btn.dataset.id);
    if (action === "edit-entry") await editEntry(btn.dataset.id);
    if (action === "move-entry") await moveEntry(btn.dataset.id);
    if (action === "duplicate-entry") await duplicateEntry(btn.dataset.id);
    if (action === "toggle-meal-foods") {
      const meal = btn.dataset.meal;
      const nextCollapsed = state.collapsedMeals[meal] === false;
      const isMobileMeals = window.matchMedia("(max-width: 980px)").matches;
      if (isMobileMeals) {
        MEALS.forEach(([id]) => { state.collapsedMeals[id] = true; });
        state.collapsedMeals[meal] = nextCollapsed;
      } else {
        const pairMap = { breakfast: "lunch", lunch: "breakfast", dinner: "snack", snack: "dinner" };
        state.collapsedMeals[meal] = nextCollapsed;
        if (pairMap[meal]) state.collapsedMeals[pairMap[meal]] = nextCollapsed;
      }
      renderToday();
    }
    if (action === "create-recipe") await createRecipe();
    if (action === "create-mealset") await createMealset();
    if (action === "toggle-target-section") {
      const section = btn.dataset.section;
      state.recipeSectionsCollapsed[section] = !state.recipeSectionsCollapsed[section];
      renderRecipes();
    }
    if (action === "detail-recipe") openTargetDetail("recipe", btn.dataset.id);
    if (action === "detail-mealset") openTargetDetail("mealset", btn.dataset.id);
    if (action === "return-target-detail") openTargetDetail(btn.dataset.kind, btn.dataset.id);
    if (action === "edit-recipe") openTargetEditor("recipe", btn.dataset.id);
    if (action === "edit-mealset") openTargetEditor("mealset", btn.dataset.id);
    if (action === "duplicate-recipe") await duplicateTarget("recipe", btn.dataset.id);
    if (action === "duplicate-mealset") await duplicateTarget("mealset", btn.dataset.id);
    if (action === "toggle-favorite-recipe") await toggleFavoriteTarget("recipe", btn.dataset.id);
    if (action === "toggle-favorite-mealset") await toggleFavoriteTarget("mealset", btn.dataset.id);
    if (action === "delete-recipe" && confirm("Delete this recipe?")) {
      await deleteDoc(userDoc("recipes", btn.dataset.id));
      closeModal();
    }
    if (action === "delete-mealset" && confirm("Delete this mealset?")) {
      await deleteDoc(userDoc("mealsets", btn.dataset.id));
      closeModal();
    }
    if (action === "add-ingredient") openIngredientModal(btn.dataset.kind, btn.dataset.id);
    if (action === "back-to-ingredient-search") openIngredientModal(btn.dataset.kind, btn.dataset.id, { restore: true });
    if (action === "ingredient-search") {
      const query = document.getElementById("ingredientSearchInput")?.value || "";
      const root = document.getElementById("ingredientResults");
      const oldLabel = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Searching...";
      try {
        if (!normalizeSearchText(query)) {
          state.ingredientSearch = { kind: btn.dataset.kind, id: btn.dataset.id, query: "", mode: "food", page: 1, results: [] };
          state.keyboardSelection.ingredient = -1;
          root.innerHTML = `<div class="empty-state">Enter a food name to search.</div>`;
        } else {
          const results = await runFoodSearch(query, { updateState: false });
          state.ingredientSearch = { kind: btn.dataset.kind, id: btn.dataset.id, query, mode: "food", page: 1, results };
          state.keyboardSelection.ingredient = -1;
          root.innerHTML = renderIngredientResultPage(results, btn.dataset.kind, btn.dataset.id, 1, "food", query);
        }
      } finally {
        btn.disabled = false;
        btn.textContent = oldLabel;
      }
    }
    if (action === "show-recipe-ingredients") {
      const recipePortions = state.recipes.filter(recipe => recipe.id !== btn.dataset.id).map(recipePortionAsFood);
      state.ingredientSearch = { kind: btn.dataset.kind, id: btn.dataset.id, query: "", mode: "recipes", page: 1, results: recipePortions };
      document.getElementById("ingredientResults").innerHTML = renderIngredientResultPage(recipePortions, btn.dataset.kind, btn.dataset.id, 1, "recipes", "");
    }
    if (action === "ingredient-prev-page" || action === "ingredient-next-page") {
      const pager = btn.closest(".ingredient-pagination");
      const root = document.getElementById("ingredientResults");
      const nextPage = number(pager?.dataset.page, 1) + (action === "ingredient-next-page" ? 1 : -1);
      const kind = pager?.dataset.kind || btn.dataset.kind;
      const id = pager?.dataset.id || btn.dataset.id;
      const mode = pager?.dataset.mode || "food";
      const query = pager?.dataset.query || "";
      const flow = state.ingredientSearch?.kind === kind && state.ingredientSearch?.id === id && state.ingredientSearch?.mode === mode && state.ingredientSearch?.query === query
        ? state.ingredientSearch
        : null;
      const results = flow?.results?.length ? flow.results : mode === "recipes"
        ? state.recipes.filter(recipe => recipe.id !== id).map(recipePortionAsFood)
        : await runFoodSearch(query, { updateState: false });
      state.ingredientSearch = { kind, id, query, mode, page: nextPage, results };
      root.innerHTML = renderIngredientResultPage(results, kind, id, nextPage, mode, query);
    }
    if (action === "select-ingredient") {
      btn.disabled = true;
      openIngredientAmountModal(getFoodByKey(btn.dataset.key), btn.dataset.kind, btn.dataset.id);
    }
    if (action === "edit-target-item") {
      saveTargetDetailScroll(btn.dataset.kind, btn.dataset.id);
      openTargetItemAmountEditor(btn.dataset.kind, btn.dataset.id, btn.dataset.index);
    }
    if (action === "remove-target-item") {
      saveTargetDetailScroll(btn.dataset.kind, btn.dataset.id);
      await removeTargetItem(btn.dataset.kind, btn.dataset.id, btn.dataset.index);
    }
    if (action === "log-recipe") openLogRecipeModal(state.recipes.find(r => r.id === btn.dataset.id));
    if (action === "log-mealset") openLogMealsetModal(state.mealsets.find(m => m.id === btn.dataset.id));
    if (action === "log-recipe-from-detail") openLogRecipeModal(state.recipes.find(r => r.id === btn.dataset.id), { kind: "recipe", id: btn.dataset.id });
    if (action === "log-mealset-from-detail") openLogMealsetModal(state.mealsets.find(m => m.id === btn.dataset.id), { kind: "mealset", id: btn.dataset.id });
    if (action === "set-report-mode") {
      state.reportMode = btn.dataset.mode || "week";
      state.reportRange = periodRange();
      state.reportData = null;
      state.reportPages = { topSources: 1, frequency: 1 };
      renderReportsShell();
    }
    if (action === "report-prev-period" || action === "report-next-period") {
      shiftReportPeriod(action === "report-prev-period" ? -1 : 1);
      state.reportData = null;
      state.reportPages = { topSources: 1, frequency: 1 };
      renderReportsShell();
    }
    if (action === "load-report") await loadReport();
    if (action === "report-sort") {
      setReportSort(btn.dataset.table, btn.dataset.key);
      if (state.reportPages?.[btn.dataset.table]) state.reportPages[btn.dataset.table] = 1;
      const [start, end] = state.reportRange || periodRange();
      renderReportOutput(start, end, state.reportEntries || [], state.reportData);
    }
    if (action === "report-page") {
      const table = btn.dataset.table;
      state.reportPages[table] = Math.max(1, number(state.reportPages?.[table], 1) + number(btn.dataset.dir, 0));
      const [start, end] = state.reportRange || periodRange();
      renderReportOutput(start, end, state.reportEntries || [], state.reportData);
    }
    if (action === "set-report-micro-mode") {
      state.reportMicroMode = btn.dataset.mode === "avg" ? "avg" : "abs";
      const [start, end] = state.reportRange || periodRange();
      renderReportOutput(start, end, state.reportEntries || [], state.reportData);
    }
    if (action === "set-report-frequency-mode") {
      state.reportFrequencyMode = btn.dataset.mode === "avg" ? "avg" : "abs";
      state.reportPages.frequency = 1;
      const [start, end] = state.reportRange || periodRange();
      renderReportOutput(start, end, state.reportEntries || [], state.reportData);
    }
    if (action === "export-full-csv") await exportEntries("csv", false);
    if (action === "export-calories-csv") await exportEntries("csv", true);
    if (action === "export-calories-json") await exportEntries("json", true);
    if (action === "set-macro-mode") {
      const form = document.getElementById("settingsForm");
      const nextMode = btn.dataset.mode || "manual";
      if (form?.elements.macroGoalMode) form.elements.macroGoalMode.value = nextMode;
      syncMacroGoalInputs(form);
      if (form) state.settings = collectSettingsFromForm(form);
      state.settings.macroGoalMode = nextMode;
      const dayGoal = goalSnapshotFromSettings(state.settings);
      dayGoal.savedForDate = state.currentDate;
      state.dailyGoals[state.currentDate] = dayGoal;
      writeLocal("settings", state.settings);
      writeLocal(`dailyGoal:${state.currentDate}`, dayGoal);
      await Promise.all([
        setDoc(userDoc("private", "settings"), cleanForFirestore(state.settings), { merge: true }),
        setDoc(dailyGoalDoc(state.currentDate), cleanForFirestore(dayGoal), { merge: true })
      ]);
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
    if (state.unsubDailyGoal) state.unsubDailyGoal();
    state.logs = [];
    state.customFoods = [];
    state.recipes = [];
    state.mealsets = [];
    state.dailyGoals = {};
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
