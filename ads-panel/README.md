# MangaAfrik Ads & Notifications Admin (Green)

Independent admin UI for managing:

- **Hero ads** (main app hero panel)
- **Notifications** (mobile push + in-app)
- **System notices** (maintenance + platform notices)

This panel runs in **API mode** and talks to the backend.

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

- Backend: `GET/POST/PATCH/DELETE /api/v1/ads/*`

