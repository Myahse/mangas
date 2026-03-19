# WebGas — Documentation complète du projet

Plateforme communautaire dédiée aux mangas et webtoons africains. Elle permet aux créateurs de publier leurs œuvres et aux lecteurs de découvrir de nouvelles histoires.

---

## Table des matières

1. [Vision et objectifs](#vision-et-objectifs)
2. [Architecture du projet](#architecture-du-projet)
3. [Technologies utilisées](#technologies-utilisées)
4. [Installation et démarrage](#installation-et-démarrage)
5. [Structure détaillée](#structure-détaillée)
6. [Fonctionnalités](#fonctionnalités)
7. [Routes et écrans](#routes-et-écrans)
8. [API et backend](#api-et-backend)
9. [État actuel et prochaines étapes](#état-actuel-et-prochaines-étapes)
10. [Licence et contribution](#licence-et-contribution)

---

## Vision et objectifs

- **Vision** : Devenir **le Webtoon ivoirien** — une plateforme communautaire où créateurs et lecteurs forment un vrai réseau social autour des mangas et webtoons africains (bibliothèque, création collaborative, publications, commentaires, likes, messagerie).
- **Objectifs** :
  - Permettre aux créateurs de publier et gérer leurs mangas et chapitres, **créer des équipes**, attribuer des **rôles** (scénariste, dessinateur, coloriste, etc.) et **travailler en temps réel** sur la plateforme.
  - Offrir aux lecteurs une bibliothèque avec recherche, filtres et lecture de chapitres, et les intégrer dans un **réseau social** (posts, commentaires, likes, messagerie).
  - Favoriser la découverte et le suivi de créateurs, et les échanges entre tous les utilisateurs.

---

## Architecture du projet

```
webgas/
├── front/          # Frontend Web (Vite + React + TypeScript + Tailwind)
├── mobile/         # Application mobile (Expo + React Native + TypeScript)
├── backend/        # Backend API (Spring Boot — à développer)
├── README.md       # Présentation rapide
└── PROJECT.md      # Ce document (documentation complète)
```

- **front** : SPA React pour navigateur.
- **mobile** : App Expo (React Native) pour Android / iOS / web.
- **backend** : API REST prévue en Spring Boot ; pour l’instant seul le README et la structure cible sont décrits.

---

## Technologies utilisées

### Frontend Web (`front/`)

| Technologie   | Rôle                          |
|---------------|--------------------------------|
| **Vite**      | Build et dev server           |
| **React 18**  | UI                            |
| **TypeScript**| Typage statique               |
| **Tailwind CSS** | Styles utilitaires        |
| **React Router v6** | Navigation (routes SPA) |

### Mobile (`mobile/`)

| Technologie        | Rôle                          |
|--------------------|--------------------------------|
| **Expo ~54**       | Framework et tooling          |
| **React Native**   | UI native                     |
| **Expo Router**    | Routing (file-based)          |
| **TypeScript**     | Typage                        |

### Backend (`backend/`)

- **Prévu** : Spring Boot, Java, base PostgreSQL.
- **État** : Pas encore de code ; voir `backend/README.md` pour la structure et les endpoints prévus.

---

## Installation et démarrage

### Prérequis

- **Frontend** : Node.js (LTS recommandé), npm
- **Mobile** : Node.js, npm, Expo CLI (ou `npx expo`), appareil ou émulateur
- **Backend** (futur) : JDK 17+, Maven/Gradle, PostgreSQL

### Frontend Web

```bash
cd front
npm install
npm run dev
```

- App : **http://localhost:5173**
- Build : `npm run build`
- Preview build : `npm run preview`
- Lint : `npm run lint`

### Mobile (Expo)

```bash
cd mobile
npm install
npx expo start
```

- Puis : Android, iOS ou Web depuis le menu Expo.
- Scripts : `npm run android`, `npm run ios`, `npm run web`.

### Backend

- À développer. Voir `backend/README.md` pour la structure et les endpoints prévus.

---

## Structure détaillée

### Frontend (`front/`)

```
front/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── src/
    ├── main.tsx           # Point d’entrée
    ├── App.tsx            # Routes principales
    ├── index.css          # Styles globaux + Tailwind
    ├── components/        # Composants réutilisables
    │   ├── Layout.tsx
    │   ├── Navbar.tsx
    │   ├── Footer.tsx
    │   └── MangaCard.tsx
    └── pages/
        ├── Home.tsx
        ├── Library.tsx
        ├── Community.tsx
        ├── Profile.tsx
        ├── MangaDetail.tsx
        └── CreateManga.tsx
```

### Mobile (`mobile/`)

```
mobile/
├── app/                   # Expo Router (file-based)
│   ├── _layout.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   └── explore.tsx
│   └── modal.tsx
├── src/
│   ├── components/        # ex. MangaCard.tsx
│   └── screens/           # ex. HomeScreen.tsx
├── components/            # Composants partagés
├── constants/
├── hooks/
├── package.json
├── app.json
└── README.md
```

### Backend (`backend/`)

- Contient uniquement `README.md` pour l’instant.
- Structure cible décrite dans `backend/README.md` (packages `controller`, `service`, `repository`, `model`, `dto`, etc.).

---

## Fonctionnalités

### Pour les lecteurs

- Bibliothèque de mangas avec recherche et filtres (ex. par genre).
- Lecture de chapitres (pages dédiées).
- Découverte de créateurs et de nouveaux mangas (Home, Library, Community).

### Pour les créateurs

- Publication de mangas (page Create Manga).
- Gestion des chapitres (prévue côté backend).
- **Équipes** : créer des équipes et attribuer des rôles (scénariste, dessinateur, coloriste, etc.) à chaque membre.
- **Travail en temps réel** : édition collaborative sur la plateforme (chapitres, planches, etc.).
- Statistiques de vues (prévues).

### Réseau social (créateurs et lecteurs)

- **Publications** : tous les utilisateurs peuvent poster (actualités, coulisses, réactions).
- **Commentaires et likes** : sur les œuvres, chapitres et publications.
- **Messagerie** : échanges en direct entre utilisateurs (créateurs et lecteurs).

### Implémentation actuelle

- **Frontend** : UI complète avec données en dur (mock). Pas encore d’appels API.
- **Mobile** : Structure Expo + écrans de base (à brancher sur l’API).
- **Backend** : Non implémenté ; API décrite dans `backend/README.md`.

---

## Routes et écrans

### Frontend Web (React Router)

| Route        | Page         | Description                    |
|-------------|--------------|--------------------------------|
| `/`         | Home         | Accueil, hero, mangas vedette / nouveautés |
| `/library`  | Library      | Bibliothèque, recherche, filtres, grille de mangas |
| `/community`| Community    | Communauté / créateurs        |
| `/profile`  | Profile      | Profil utilisateur            |
| `/manga/:id`| MangaDetail  | Détail d’un manga              |
| `/create`   | CreateManga  | Création / publication d’un manga |

### Mobile (Expo Router)

- Onglets et modales définis sous `app/` (ex. `(tabs)/index`, `(tabs)/explore`, `modal`).
- Détail des écrans dans `mobile/README.md` ou à compléter selon l’avancement.

---

## API et backend

Les endpoints prévus (à implémenter) sont décrits dans **`backend/README.md`**. Résumé :

### Mangas

- `GET /api/mangas` — Liste
- `GET /api/mangas/{id}` — Détail
- `POST /api/mangas` — Création
- `PUT /api/mangas/{id}` — Mise à jour
- `DELETE /api/mangas/{id}` — Suppression

### Chapitres

- `GET /api/mangas/{mangaId}/chapters` — Liste des chapitres
- `GET /api/chapters/{id}` — Détail chapitre
- `POST /api/mangas/{mangaId}/chapters` — Création chapitre

### Utilisateurs / Auth

- `POST /api/auth/register` — Inscription
- `POST /api/auth/login` — Connexion
- `GET /api/users/{id}` — Profil
- `PUT /api/users/{id}` — Mise à jour profil

### Communauté

- `GET /api/creators` — Liste créateurs
- `GET /api/creators/{id}` — Profil créateur
- `POST /api/users/{id}/follow` — Suivre un créateur

### Équipes créateurs (prévu)

- Création d’équipes, attribution de rôles (scénariste, dessinateur, coloriste, etc.) par manga/œuvre.
- Collaboration temps réel (WebSocket ou équivalent) pour l’édition collaborative des chapitres.

### Réseau social (prévu)

- **Posts** : publication, liste, commentaires et likes.
- **Commentaires / likes** : sur œuvres, chapitres et posts.
- **Messagerie** : conversations entre utilisateurs (créateurs et lecteurs).

Sécurité prévue : JWT, Spring Security, CORS pour front et mobile.

---

## État actuel et prochaines étapes

### Fait

- Frontend web : pages, layout, navigation, composants (données mock).
- Mobile : structure Expo + React Native, routing de base.
- Documentation : README racine, README par sous-projet, ce PROJECT.md.

### À faire

1. **Backend** : Implémenter l’API Spring Boot (modèles, repos, services, contrôleurs, auth).
2. **Frontend** : Remplacer les mocks par des appels API (configurer l’URL de base et les services).
3. **Mobile** : Connecter les écrans à l’API et aligner les flux (bibliothèque, détail manga, profil).
4. **Auth** : Inscription / connexion (JWT) côté backend et gestion du token côté front/mobile.
5. **Données** : Base PostgreSQL, schéma, éventuellement seeds pour dev.
6. **Équipes créateurs** : modèles équipes/rôles, API, édition collaborative temps réel (WebSocket).
7. **Réseau social** : posts, commentaires, likes, messagerie (API + temps réel pour les messages).

---

## Licence et contribution

- **Licence** : Tous droits réservés © 2024 WebGas (à confirmer selon le dépôt).
- **Contribution** : La plateforme vise à rassembler la communauté de mangakas africains et à promouvoir leurs créations. Modalités de contribution à définir (CONTRIBUTING.md, code de conduite, etc.).

---

*Dernière mise à jour de cette documentation : janvier 2025.*
