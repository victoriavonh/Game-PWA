# Game Companion PWA

A generic, installable offline-first game tracker.

## Included modules
- Multi-game support
- Custom quests with subtasks
- Materials / ingredient calculator
- Grouped collectible sets
- Bestiary / enemy notes
- HP min/max, resistances, weaknesses, locations, notes
- Search and filtering
- Offline local storage
- JSON backup export/import
- Installable PWA shell

## Run locally
A service worker requires HTTP/HTTPS rather than opening `index.html` directly.

From this folder, one easy option is:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Put it on your phone
Deploy the folder to any static HTTPS host such as GitHub Pages, Netlify, Cloudflare Pages, or similar.
Open the deployed URL in Chrome on Android and choose **Install app** / **Add to Home screen**.

## Data
Your data is stored locally in the browser using localStorage.
Use **Data → Export backup** occasionally to save a JSON copy.

## Files
- index.html
- styles.css
- app.js
- manifest.webmanifest
- sw.js
- icon.svg
