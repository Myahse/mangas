# MangAfriq - Plateforme de Mangas Africains

MangAfriq est une plateforme communautaire dédiée aux mangas et webtoons africains. Elle permet aux créateurs de publier leurs œuvres et aux lecteurs de découvrir de nouvelles histoires.

> **Présentation grand public (sans jargon)** : voir **[OVERVIEW.md](./OVERVIEW.md)** pour une explication complète en langage simple.
> **Documentation technique** : voir **[PROJECT.md](./PROJECT.md)** pour l'architecture détaillée, les routes, l'API prévue, l'état du projet et les prochaines étapes.

---

## Tech Stack

| Couche | Technologies |
|--------|-------------|
| **Frontend** | React, TypeScript, Vite, Tailwind CSS |
| **Backend** | Spring Boot, Java |
| **Base de données** | PostgreSQL |
| **Mobile** | Expo, React Native, TypeScript |

---

## Vision

Créer une vraie communauté de mangakas africains et **devenir le Webtoon ivoirien** : une plateforme où créateurs et lecteurs forment un réseau social autour des mangas et webtoons africains — à la fois librairie, espace de création collaborative et lieu d'échanges (publications, commentaires, likes, messagerie).

## Architecture du Projet

```
MangAfriq/
├── front/       # Frontend Web — React + TypeScript + Vite + Tailwind
├── backend/     # Backend API  — Spring Boot + Java + PostgreSQL
└── mobile/      # Application Mobile — Expo + React Native
```

## Installation

### Frontend Web

```bash
cd front
npm install
npm run dev
```

Static assets for the web app live under **`front/public/`** (Vite convention). If you still have a legacy root-level `public/` folder from the Dev branch prototype, run once from the repo root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\move-root-public-to-front.ps1
```

### Backend (Spring Boot)

```bash
cd backend
./mvnw spring-boot:run
```

> Le backend se connecte à une base **PostgreSQL**. Configurez les informations de connexion dans `application.properties` ou `application.yml`.

### Mobile

```bash
cd mobile
npm install
npx expo start
```

## Fonctionnalités

### Pour les Lecteurs
- Bibliothèque de mangas avec recherche et filtres
- Lecture de chapitres
- Suivre des créateurs
- Découvrir de nouveaux mangas

### Pour les Créateurs
- Publier des mangas et gérer les chapitres
- **Créer des équipes** et attribuer des rôles (scénariste, dessinateur, coloriste, etc.)
- **Travailler en temps réel** sur la plateforme (édition collaborative)
- Statistiques de vues
- Communauté de créateurs

### Réseau social (tous les utilisateurs)
- Publier des posts (créateurs et lecteurs)
- Commenter et aimer les œuvres et les publications
- Messagerie entre utilisateurs

## Intégration

Le frontend web et l'application mobile communiquent avec le backend Spring Boot via des APIs REST. Les données sont stockées dans une base **PostgreSQL**.

## Licence

Tous droits réservés © 2025 MangAfriq

## Contribution

Cette plateforme vise à rassembler la communauté de mangakas africains et à promouvoir leurs créations.
