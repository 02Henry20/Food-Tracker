// Optional browser regression check: requires Playwright and installed Chrome.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "app.js"), "utf8");
const shell = fs.readFileSync(path.join(root, "index.html"), "utf8").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
const firebaseStubs = `
  const records = new Map();
  let writes = 0;
  function initializeApp() { return {}; }
  function getAuth() { return {}; }
  function getFirestore() { return {}; }
  function setPersistence() { return Promise.resolve(); }
  const browserLocalPersistence = {};
  function enableIndexedDbPersistence() { return Promise.resolve(); }
  function onAuthStateChanged(auth, callback) { window.authChanged = callback; }
  function signInWithEmailAndPassword() { return Promise.resolve(); }
  function signOut() { window.authChanged(null); return Promise.resolve(); }
  function doc(...segments) { return { path: segments.filter(segment => typeof segment === 'string').join('/') || crypto.randomUUID() }; }
  function collection(...segments) { return doc(...segments); }
  function getDoc(ref) { return Promise.resolve({ exists: () => records.has(ref.path), data: () => records.get(ref.path) }); }
  function getDocs(ref) { const prefix = ref.path + '/'; const docs = [...records].filter(([key]) => key.startsWith(prefix) && !key.slice(prefix.length).includes('/')).map(([key, value]) => ({ id: key.slice(prefix.length), data: () => value })); return Promise.resolve({ docs, size: docs.length }); }
  async function setDoc(ref, data, options) { records.set(ref.path, options?.merge ? { ...records.get(ref.path), ...data } : data); }
  async function addDoc(ref, data) { await new Promise(resolve => setTimeout(resolve, 40)); const id = 'entry-' + (++writes); records.set(ref.path + '/' + id, data); return { id }; }
  function updateDoc(ref, patch) { return setDoc(ref, patch, { merge: true }); }
  async function deleteDoc(ref) { records.delete(ref.path); }
  function onSnapshot() { return () => {}; }
  function writeBatch() { const jobs = []; return { set: (ref, data) => jobs.push(() => setDoc(ref, data)), delete: ref => jobs.push(() => deleteDoc(ref)), commit: async () => { for (const job of jobs) await job(); } }; }
`;

(async () => {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("http://127.0.0.1:18123/**", route => {
      const file = new URL(route.request().url()).pathname;
      if (file === "/" || file === "/index.html") return route.fulfill({ contentType: "text/html", body: shell });
      const target = path.resolve(root, "." + file);
      if (!target.startsWith(root + path.sep) || !fs.existsSync(target)) return route.fulfill({ status: 404 });
      return route.fulfill({ path: target });
    });
    await page.goto("http://127.0.0.1:18123/");
    await page.addScriptTag({ content: firebaseStubs + source.slice(source.indexOf("const firebaseConfig")) });
    await page.evaluate(() => {
      state.user = { uid: "review-user" };
      state.userSession = 1;
      state.settings.databasePreference = "offline-only";
      state.customFoods = [{ id: "milk", source: "custom", name: "Milk", nutrientsPer100g: { kcal: 100, protein: 8 } }];
      state.logs = [{ id: "old", itemType: "food", itemId: "milk", nameSnapshot: "Milk", meal: "breakfast", date: state.currentDate, amount: 100, unit: "g", gramsEquivalent: 100, nutrientsSnapshot: { kcal: 80, protein: 5 } }];
      state.recipes = [{ id: "recipe", name: "Test recipe", portions: 0.5, ingredients: [], totalNutrients: { kcal: 200 }, nutrientsPerPortion: { kcal: 400 } }];
      records.set(entryDoc("old").path, { ...state.logs[0] });
      records.set(userDoc("customFoods", "milk").path, state.customFoods[0]);
      document.body.classList.remove("auth-active");
      els.authView.classList.add("hidden");
      els.appView.classList.remove("hidden");
      scheduleReportRecalculationForDate = () => {};
      setRoute("today");
    });
    for (const route of ["today", "search", "recipes", "reports", "settings"]) {
      await page.evaluate(route => setRoute(route), route);
      assert.ok(await page.locator(`#${route}Page`).isVisible(), `${route} renders`);
    }
    await page.evaluate(() => setRoute("search"));
    await page.locator("#foodSearchInput").fill("MiLK");
    await page.locator("#foodSearchInput").press("Enter");
    await page.locator('[data-action="log-food"]').first().click();
    await page.locator('#logFoodForm [name="amount"]').fill("200");
    await page.mouse.click(5, 5);
    assert.equal(await page.locator('#logFoodForm [name="amount"]').inputValue(), "200");
    await page.locator("#logFoodForm").getByRole("button", { name: "Add to day" }).click();
    await page.waitForFunction(() => els.modalRoot.classList.contains("hidden"));
    assert.equal(await page.evaluate(() => [...records.values()].filter(value => value.itemType === "food" && value.amount === 200)[0].nutrientsSnapshot.kcal), 200);

    await page.evaluate(() => editEntry("old"));
    assert.ok((await page.locator("#editEntryAmountPreview").innerText()).includes("80"));
    await page.locator('[data-action="close-modal"]').click();
    await page.evaluate(() => openLogRecipeModal(state.recipes[0]));
    const before = await page.evaluate(() => writes);
    await page.evaluate(() => { const form = document.getElementById("logRecipeForm"); form.requestSubmit(); form.requestSubmit(); });
    await page.waitForFunction(() => els.modalRoot.classList.contains("hidden"));
    assert.equal(await page.evaluate(() => writes), before + 1, "duplicate recipe submits write once");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => { setRoute("search"); openLogFoodModal(state.customFoods[0]); });
    await page.locator('#logFoodForm [name="amount"]').fill("125");
    await page.locator('#logFoodForm [name="amount"]').press("Escape");
    assert.ok(await page.locator("#modalRoot").isVisible());
    await page.locator('[data-action="close-modal"]').click();
    await page.evaluate(() => { state.reportData = { private: true }; window.authChanged(null); });
    assert.equal(await page.evaluate(() => state.tempFoods.size), 0);
    assert.equal(await page.evaluate(() => state.reportData), null);
    assert.deepEqual(errors, []);
    console.log("Browser review passed: all routes, offline search, logging, historical edit preview, duplicate-submit protection, mobile popups, and sign-out cleanup.");
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
