# NutriPilot

NutriPilot is a personal nutrition tracker built for people who want the detail of a serious food log without the friction of a spreadsheet. It combines a fast daily diary, macro-aware recipes and mealsets, Open Food Facts search, barcode scanning, Firebase sync, offline support, and report views that turn day-to-day logging into useful feedback.

The app is intentionally lightweight: plain HTML, CSS, and JavaScript, with Firebase handling authentication and data storage. It can be served as a static PWA and installed on mobile.

## What It Does

- Tracks daily calories, protein, carbs, fat, fiber, sugar, sodium, and optional micronutrients.
- Organizes food logs by Breakfast, Lunch, Dinner, and Snack / Other.
- Shows macro progress, remaining calories, macro calorie-share circles, and live amount previews before saving.
- Searches personal foods, eaten foods, saved recipes, mealsets, and Open Food Facts.
- Supports barcode lookup through Open Food Facts.
- Lets you create custom foods with serving sizes and full nutrition data.
- Builds recipes from ingredients and calculates per-portion nutrition automatically.
- Builds mealsets from foods and saved recipes for fast repeat logging.
- Preserves snapshots of logged foods, recipes, and mealsets so historical entries stay stable even after edits.
- Stores daily goal snapshots so older days keep the targets they were logged against.
- Generates week, month, and year reports with averages, macro split, calorie deficit, top sources, food frequency, micronutrient limits, charts, and exports.
- Excludes the current day from aggregate report averages so an unfinished day does not drag down kcal and protein metrics.
- Syncs with Firebase while keeping local offline cache support through the service worker.
- Exports calorie-only CSV/JSON, full CSV, and full backup JSON.

## Highlights

### Diary First

The first screen is the actual food diary, not a landing page. It is built for repeated daily use: quick meal navigation, compact entry controls, daily macro feedback, and responsive mobile behavior.

### Recipes And Mealsets

Recipes are portion-based and mealsets are bundle-based. Both support editable amounts, live macro previews, favorites, details, duplication, and logging back into the diary.

### Reports That Respect Real Life

Reports can be viewed by week, month, or year. A manual recalc path rebuilds report data from raw diary entries when summaries may be stale, and aggregate metrics skip the current day so incomplete logging does not distort trends.

### Offline-Capable PWA

The app includes a manifest, favicons, app icons, and a service worker. Core app files and icon assets are cached for a smoother installed-app experience.

## Tech Stack

- Vanilla JavaScript modules
- HTML and CSS
- Firebase Authentication
- Cloud Firestore
- Chart.js
- ZXing barcode scanning
- Open Food Facts API
- Firebase Hosting

## Project Structure

```text
.
|-- index.html              # App shell and navigation
|-- app.js                  # Application state, Firebase sync, diary, search, recipes, reports
|-- styles.css              # Responsive UI and visual system
|-- sw.js                   # PWA service worker cache
|-- manifest.webmanifest    # Installable PWA metadata and icons
|-- firebase.json           # Firebase Hosting and Firestore config
|-- firestore.rules         # Firestore security rules
|-- favicons/               # Browser favicon assets
|-- icons/                  # PWA and app icon assets
`-- test-data/              # Optional import/test data
```

## Run Locally

Because the app uses JavaScript modules, serve the folder over HTTP:

```powershell
python -m http.server 18123 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:18123/index.html
```

## Firebase

The app expects Firebase Auth and Firestore to be configured for the project in `app.js`. Hosting and Firestore rules are defined in:

- `firebase.json`
- `firestore.rules`

Deploy with the Firebase CLI from this folder after logging in and selecting the project.

## Data Ownership

NutriPilot is designed around personal data ownership:

- Food logs are stored under the signed-in user's Firestore data.
- Local storage is used as an offline/cache layer.
- Backups can be exported as JSON.
- CSV exports are available for analysis outside the app.

## Status

This is an actively evolving personal app. The current focus is practical daily tracking, reliable reports, and a polished mobile PWA experience.
