/*
 * mockData.js — Constantes statiques uniquement.
 * Les données manga viennent désormais du backend via src/services/api.js
 * (VITE_API_BASE_URL).
 */

export { useFetch } from '../services/api';

export const genres = [
  "Action", "Adventure", "Comedy", "Drama", "Fantasy",
    "Horror", "Romance", "Sci-Fi", "Thriller", "Isekai",
    "Shonen"
];
