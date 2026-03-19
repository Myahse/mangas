<<<<<<< HEAD
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
=======
# WebGas - Plateforme de Mangas Africains

WebGas est une plateforme communautaire dédiée aux mangas et webtoons africains. Elle permet aux créateurs de publier leurs œuvres et aux lecteurs de découvrir de nouvelles histoires.

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
webgas/
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

Tous droits réservés © 2025 WebGas

## Contribution

Cette plateforme vise à rassembler la communauté de mangakas africains et à promouvoir leurs créations.
>>>>>>> efdd90c48ca037d587bac2b0d671236c91816aa6
