# WebGas Frontend

Frontend web de la plateforme WebGas - Plateforme de Mangas Africains.

## 🚀 Technologies

- **Vite** - Build tool rapide
- **React** - Bibliothèque UI
- **TypeScript** - Typage statique
- **Tailwind CSS** - Framework CSS utilitaire
- **React Router** - Navigation

## 📦 Installation

```bash
npm install
```

## 🏃 Développement

```bash
npm run dev
```

L'application sera accessible sur [http://localhost:5173](http://localhost:5173)

## 🏗️ Build

```bash
npm run build
```

## 📁 Structure

```
src/
├── components/     # Composants réutilisables
│   ├── Layout.tsx
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   └── MangaCard.tsx
├── pages/          # Pages de l'application
│   ├── Home.tsx
│   ├── Library.tsx
│   ├── Community.tsx
│   ├── Profile.tsx
│   ├── MangaDetail.tsx
│   └── CreateManga.tsx
├── App.tsx         # Composant principal avec routes
└── main.tsx        # Point d'entrée
```

## 🔗 Intégration Backend

Les appels API vers le backend Spring Boot seront implémentés dans les composants. L'URL de base de l'API sera configurée dans un fichier de configuration.
