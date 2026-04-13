# WebGas — Panneau créateur

Application **Vite + React** déployée **indépendamment** du site lecteur (`front/`).

## Démarrage

```bash
cd creator-panel
npm install
npm run dev
```

Le serveur écoute sur le port **5174** pour éviter le conflit avec le lecteur (5173).

## Lien depuis le site lecteur

Dans `front/.env` :

```env
VITE_CREATOR_PANEL_URL=http://localhost:5174
```

En production, utilisez l’URL publique du déploiement de ce dossier (ex. `https://studio.votredomaine.com`).

## Build

```bash
npm run build
```

Sortie : `dist/`. Hébergez ce dossier comme pour toute SPA (réécriture vers `index.html`).
