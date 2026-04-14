# MangaAfrik Ads & Notifications Admin (Green)

Independent admin UI for managing:

- **Hero ads** (main app hero panel)
- **Notifications** (mobile push + in-app)
- **System notices** (maintenance + platform notices)

This panel currently runs in **local mode** (mock DB backed by `localStorage`) so it works immediately.

## Run

```bash
npm install
npm run dev
```

- Dev server: `http://localhost:5177`
- Preview: `http://localhost:5178`

## Theme

This panel uses a **green** brand theme via `src/styles/admin.css`.

## Data

All data is stored in the browser:

- DB: `localStorage["mangaafrik_ads_admin:db_v1"]`

