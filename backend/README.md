# WebGas Backend

Backend Spring Boot pour la plateforme WebGas - Plateforme de Mangas Africains.

## 🚀 Technologies

- **Spring Boot** - Framework Java
- **Java** - Langage de programmation

## 📦 Prérequis

- Java JDK 17 ou supérieur
- Maven ou Gradle
- Base de données (PostgreSQL recommandé)

## 🏗️ Structure du Projet

```
src/
├── main/
│   ├── java/
│   │   └── com/webgas/
│   │       ├── WebgasApplication.java
│   │       ├── controller/     # Contrôleurs REST
│   │       ├── service/        # Services métier
│   │       ├── repository/    # Repositories JPA
│   │       ├── model/          # Entités JPA
│   │       └── dto/            # Data Transfer Objects
│   └── resources/
│       ├── application.properties
│       └── application.yml
└── test/
```

## 🔌 API Endpoints

Les endpoints suivants seront implémentés :

### Mangas
- `GET /api/mangas` - Liste des mangas
- `GET /api/mangas/{id}` - Détails d'un manga
- `POST /api/mangas` - Créer un manga
- `PUT /api/mangas/{id}` - Mettre à jour un manga
- `DELETE /api/mangas/{id}` - Supprimer un manga

### Chapitres
- `GET /api/mangas/{mangaId}/chapters` - Liste des chapitres
- `GET /api/chapters/{id}` - Détails d'un chapitre
- `POST /api/mangas/{mangaId}/chapters` - Créer un chapitre

### Utilisateurs
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `GET /api/users/{id}` - Profil utilisateur
- `PUT /api/users/{id}` - Mettre à jour le profil

### Communauté
- `GET /api/creators` - Liste des créateurs
- `GET /api/creators/{id}` - Profil d'un créateur
- `POST /api/users/{id}/follow` - Suivre un créateur

## 🔐 Sécurité

- Authentification JWT
- Spring Security
- CORS configuré pour le frontend et mobile

## 📝 Notes

Ce backend sera développé séparément et fournira les APIs nécessaires pour le frontend web et l'application mobile.
