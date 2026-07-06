# NutriPilot Firestore Calorie Data Access Summary

This file explains where another app can read NutriPilot calorie summaries and report averages from Firebase Firestore.

## 1. Daily Calories

Firestore path:

```text
/apps/food-tracker/users/{uid}/dailyCalories/{YYYY-MM-DD}
```

Example:

```text
/apps/food-tracker/users/abc123/dailyCalories/2026-07-06
```

Important fields:

```json
{
  "date": "2026-07-06",
  "uid": "abc123",
  "app": "NutriPilot",
  "totalKcal": 2140,
  "protein": 128.4,
  "carbs": 246.2,
  "fat": 68.1,
  "fiber": 31.5,
  "meals": {
    "breakfast": 520,
    "lunch": 760,
    "dinner": 690,
    "snack": 170
  },
  "itemCount": 8,
  "updatedAt": 1783300000000
}
```

Daily calories are available at:

```js
doc.totalKcal
```

## 2. Weekly Report Cache

Firestore path:

```text
/apps/food-tracker/users/{uid}/reportCaches/week_{weekStart}_{weekEnd}
```

Example:

```text
/apps/food-tracker/users/abc123/reportCaches/week_2026-07-06_2026-07-12
```

The week starts on Monday and ends on Sunday.

Important fields:

```json
{
  "mode": "week",
  "start": "2026-07-06",
  "end": "2026-07-12",
  "dates": ["2026-07-06", "2026-07-07", "..."],
  "activeDates": ["2026-07-06", "2026-07-07"],
  "total": {
    "kcal": 4440,
    "protein": 270.5,
    "carbs": 516.7,
    "fat": 140.5
  },
  "dirty": false,
  "generatedAt": 1783300000000,
  "sourceEntryCount": 16
}
```

Weekly average calories per logged day:

```js
weeklyAverageKcal = doc.total.kcal / Math.max(1, doc.activeDates.length)
```

Weekly average calories per calendar day:

```js
weeklyCalendarAverageKcal = doc.total.kcal / Math.max(1, doc.dates.length)
```

NutriPilot uses the logged-day average in its report UI.

## 3. Monthly Report Cache

Firestore path:

```text
/apps/food-tracker/users/{uid}/reportCaches/month_{YYYY-MM}
```

Example:

```text
/apps/food-tracker/users/abc123/reportCaches/month_2026-07
```

The document structure is the same as the weekly report cache.

## 4. Yearly Report Cache

Firestore path:

```text
/apps/food-tracker/users/{uid}/reportCaches/year_{YYYY}
```

Example:

```text
/apps/food-tracker/users/abc123/reportCaches/year_2026
```

The document structure is the same as the weekly report cache.

## 5. Access Requirement

The Firestore data is stored under:

```text
/apps/food-tracker/users/{uid}/...
```

Another program can access it only if it either:

1. authenticates as the same Firebase user, or
2. runs in a trusted backend with the Firebase Admin SDK.

Client-side apps should authenticate with Firebase Auth and only read data belonging to the current user.
