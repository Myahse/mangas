/*
 * mockData.js — Constantes statiques uniquement.
 * Toutes les données manga viennent désormais de /public/db.json
 * via src/services/api.js
 */

export { useFetch } from '../services/api';

export const genres = [
  "Action", "Adventure", "Comedy", "Drama", "Fantasy",
    "Horror", "Romance", "Sci-Fi", "Thriller", "Isekai",
    "Shonen"
];
