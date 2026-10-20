const FIELDS = "code,product_name,generic_name,brands,nutriments,serving_size,serving_quantity,quantity,product_quantity";

function buildQuery(query, regions, language, fuzzy = false) {
  const languages = [...new Set(["main", "en", "de", language])];
  const fields = [...languages.flatMap(lang => [`product_name.${lang}`, `generic_name.${lang}`]), "brands"];
  const tokens = query.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  const parts = tokens.map(token => {
    const distance = !fuzzy || token.length < 3 || /^\d+$/.test(token) ? 0 : token.length <= 5 ? 1 : 2;
    return `(${fields.map(field => `${field}:${token}${distance ? `~${distance}` : ""}`).join(" OR ")})`;
  });
  if (!parts.length) return "";
  if (!regions.includes("world")) {
    const countries = regions.map(region => ({ uk: "united-kingdom", us: "united-states" })[region] || region);
    parts.push(`(${countries.map(country => `countries_tags:"en:${country}"`).join(" OR ")})`);
  }
  return parts.join(" AND ");
}

function createFoodSearchHandler({ verifyIdToken, fetchImpl = fetch, now = Date.now }) {
  const cache = new Map();
  const requests = new Map();
  async function readJson(url, timeout = 8000) {
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(timeout), headers: { Accept: "application/json", "User-Agent": "NutriPilot/1.0 (food tracker)" } });
    if (!response.ok) throw new Error(`Open Food Facts returned HTTP ${response.status}`);
    const data = await response.json();
    if (data.errors?.length) throw new Error("Open Food Facts search is temporarily unavailable");
    return data;
  }
  async function search(q) {
    const url = new URL("https://search.openfoodfacts.org/search");
    url.searchParams.set("q", q);
    url.searchParams.set("page_size", "100");
    url.searchParams.set("fields", FIELDS);
    const data = await readJson(url);
    return Array.isArray(data.hits) ? data.hits : [];
  }
  return async (req, res) => {
    res.set("Cache-Control", "no-store");
    if (req.method !== "POST") return res.status(405).json({ error: "Use POST." });
    const token = /^Bearer (\S+)$/.exec(req.headers.authorization || "")?.[1];
    if (!token) return res.status(401).json({ error: "Sign in to search foods." });
    let user;
    try { user = await verifyIdToken(token); }
    catch { return res.status(401).json({ error: "Sign in again to search foods." }); }
    const query = String(req.body?.query || "").trim();
    const regions = req.body?.regions || ["world"];
    const language = String(req.body?.language || "en").split("-")[0].toLowerCase();
    if (!query || query.length > 200 || !Array.isArray(regions) || !regions.length || regions.length > 40
      || regions.some(region => typeof region !== "string" || !/^[a-z-]{2,30}$/.test(region)) || !/^[a-z]{2,3}$/.test(language)) {
      return res.status(400).json({ error: "Enter a valid food name and search region." });
    }
    const key = JSON.stringify([query.toLowerCase(), [...new Set(regions)].sort(), language]);
    const recent = requests.get(user.uid);
    const window = recent && now() - recent.since < 60000 ? recent : { since: now(), count: 0 };
    if (++window.count > 20) return res.status(429).json({ error: "Please wait a moment before searching again." });
    requests.set(user.uid, window);
    if (requests.size > 1000) for (const [uid, entry] of requests) if (now() - entry.since >= 60000) requests.delete(uid);
    if (cache.has(key) && now() - cache.get(key).createdAt < 300000) return res.json(cache.get(key).data);
    const exact = buildQuery(query, regions, language);
    if (!exact) return res.json({ products: [] });
    try {
      let products;
      let primaryError;
      try { products = await search(exact); } catch (error) { products = []; primaryError = error; }
      if (products.length < 10) {
        const fuzzy = buildQuery(query, regions, language, true);
        if (fuzzy !== exact) {
          try { products.push(...await search(fuzzy)); }
          catch (error) { if (primaryError) throw error; }
        } else if (primaryError) throw primaryError;
      }
      const unique = new Map(products.filter(product => product?.code && /^\d+$/.test(String(product.code))).map(product => [String(product.code), product]));
      const codes = [...unique.keys()].slice(0, 100);
      if (codes.length) {
        const url = new URL("https://world.openfoodfacts.org/api/v2/search");
        url.searchParams.set("code", codes.join(","));
        url.searchParams.set("page_size", "100");
        url.searchParams.set("fields", FIELDS);
        try {
          const full = await readJson(url, 4000);
          for (const product of full.products || []) if (unique.has(String(product.code))) unique.set(String(product.code), product);
        } catch { /* Search results remain useful when full-product lookup is unavailable. */ }
      }
      const data = { products: codes.map(code => unique.get(code)) };
      cache.set(key, { createdAt: now(), data });
      if (cache.size > 100) cache.delete(cache.keys().next().value);
      return res.json(data);
    } catch {
      return res.status(503).json({ error: "Open Food Facts is temporarily unavailable. Saved foods remain available; please try again shortly." });
    }
  };
}

module.exports = { createFoodSearchHandler, buildQuery };
