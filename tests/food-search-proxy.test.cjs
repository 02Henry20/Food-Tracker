const assert = require("node:assert/strict");
const { test } = require("node:test");
const { createFoodSearchHandler, buildQuery } = require("../functions/food-search");
const product = (code, name) => ({ code, product_name: name, nutriments: { "energy-kcal_100g": 100 } });
const ok = data => ({ ok: true, json: async () => data });
const request = body => ({ method: "POST", headers: { authorization: "Bearer valid" }, body: { query: "chikcen", regions: ["germany"], language: "en-US", ...body } });
function response() {
  return { code: 200, headers: {}, set(name, value) { this.headers[name] = value; return this; }, status(code) { this.code = code; return this; }, json(data) { this.body = data; return this; } };
}

test("proxy rejects unauthenticated calls before contacting Open Food Facts", async () => {
  let calls = 0;
  const handler = createFoodSearchHandler({ verifyIdToken: async () => { throw Error(); }, fetchImpl: async () => calls++ });
  const res = response();
  await handler(request(), res);
  assert.equal(res.code, 401);
  assert.equal(calls, 0);
});

test("proxy validates search input and prevents query-field injection", async () => {
  const handler = createFoodSearchHandler({ verifyIdToken: async () => ({ uid: "alice" }) });
  for (const body of [{ regions: ['germany" OR *'] }, { language: "*" }, { query: "a".repeat(201) }]) {
    const res = response();
    await handler(request(body), res);
    assert.equal(res.code, 400);
  }
  assert.equal(buildQuery('" OR *', ["world"], "en").includes("*"), false);
  assert.match(buildQuery("Chikcen breast", ["germany", "uk"], "de", true), /countries_tags:"en:germany" OR countries_tags:"en:united-kingdom"/);
});

test("server proxy searches exact then fuzzy and retains results when hydration fails", async () => {
  const calls = [];
  const handler = createFoodSearchHandler({ verifyIdToken: async () => ({ uid: "alice" }), fetchImpl: async value => {
    const url = new URL(value);
    calls.push(url);
    if (url.pathname === "/api/v2/search") return { ok: false, status: 503 };
    return ok({ hits: url.searchParams.get("q").includes("~") ? [product("12345678", "Chicken breast")] : [] });
  } });
  const res = response();
  await handler(request(), res);
  assert.equal(res.code, 200);
  assert.equal(res.body.products[0].product_name, "Chicken breast");
  assert.equal(calls.length, 3);
  assert.ok(calls[1].searchParams.get("q").includes("product_name.main:chikcen~2"));
});

test("proxy caches results by query and region without repeating upstream requests", async () => {
  let calls = 0;
  const handler = createFoodSearchHandler({ verifyIdToken: async () => ({ uid: "alice" }), fetchImpl: async value => {
    calls++;
    const url = new URL(value);
    return ok(url.pathname === "/search" ? { hits: [product("12345678", "Milk")] } : { products: [] });
  } });
  await handler(request({ query: "milk" }), response());
  const initial = calls;
  await handler(request({ query: "milk" }), response());
  assert.equal(calls, initial);
  await handler(request({ query: "milk", regions: ["world"] }), response());
  assert.ok(calls > initial);
});

test("proxy reports upstream failures instead of returning a false empty search", async () => {
  const handler = createFoodSearchHandler({ verifyIdToken: async () => ({ uid: "alice" }), fetchImpl: async () => { throw Error("down"); } });
  const res = response();
  await handler(request(), res);
  assert.equal(res.code, 503);
  assert.match(res.body.error, /temporarily unavailable/);
});

test("proxy bounds request rates for each signed-in user", async () => {
  const handler = createFoodSearchHandler({ verifyIdToken: async () => ({ uid: "alice" }), fetchImpl: async () => ok({ hits: [] }) });
  for (let i = 0; i < 20; i++) await handler(request({ query: "milk" }), response());
  const res = response();
  await handler(request({ query: "milk" }), res);
  assert.equal(res.code, 429);
});
