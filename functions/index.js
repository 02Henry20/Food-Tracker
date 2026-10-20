const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { createFoodSearchHandler } = require("./food-search");

initializeApp();
exports.foodSearch = onRequest({
  region: "europe-west1",
  timeoutSeconds: 30,
  memory: "256MiB",
  maxInstances: 3
}, createFoodSearchHandler({ verifyIdToken: token => getAuth().verifyIdToken(token) }));
