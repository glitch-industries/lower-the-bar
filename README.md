# Lower the Bar

A mobile-first progressive web app (PWA) for tracking a 12-week movement plan.

## What it does

- Shows today's workout based on the current date in the 12-week schedule
- Tracks energy level and how each session felt
- Adjusts the workout to a lower-intensity version on hard days
- Works offline via service worker
- Installable on iOS and Android as a home screen app

## Structure

```
index.html        — standalone single-file version of the app
app.js            — modular app (loads plan from /data/*.json)
sw.js             — service worker for offline support
data/
  exercises.json  — exercise definitions
  templates.json  — day templates (which exercises, in what order)
  schedule.json   — 12-week calendar mapping dates to templates
  phases.json     — phase progression parameters (Foundation → Consolidate)
```

## Running locally

Open `index.html` directly in a browser, or serve the folder with any static file server:

```bash
npx serve .
```

## Philosophy

The bar is: did you start? That's it. Done beats perfect.
