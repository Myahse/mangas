# MangaAfrik Support Panel

Independent support app for MangaAfrik (Vite + React Router).

Right now the backend API is **not implemented**, so this support panel runs in **local mock mode** using `localStorage`.

## Run locally

```bash
cd support-panel
npm install
npm run dev
```

- App: `http://localhost:5185`

## What you can do (mock mode)

- **Inbox**: see issues + requests, validate or reject, search/filter
- **Chat**: chat with the user for a selected ticket (mocked)

## Notes

- Data persists in the browser in `localStorage` (key prefix: `MangAfric_support:`).
- The UI uses the backend API (`/api/v1/support/*`).

