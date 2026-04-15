import { Manga } from '@/src/types/manga';
import dbData from '@/assets/db.json';

const FAKE_DELAY = 300;

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function getDB() {
  const [db] = await Promise.all([Promise.resolve(dbData), delay(FAKE_DELAY)]);
  return db as { manga: Manga[]; genres: string[] };
}

export async function fetchAllManga(): Promise<Manga[]> {
  const db = await getDB();
  return db.manga;
}

export async function fetchMangaBySlug(slug: string): Promise<Manga> {
  const db = await getDB();
  const manga = db.manga.find((m) => m.slug === slug);
  if (!manga) throw new Error(`Manga introuvable : ${slug}`);
  return manga;
}

export async function fetchGenres(): Promise<string[]> {
  const db = await getDB();
  return db.genres;
}

export async function fetchFeaturedManga(): Promise<Manga[]> {
  const db = await getDB();
  return db.manga.filter((m) => m.featured);
}

export async function fetchPopularManga(count = 10): Promise<Manga[]> {
  const db = await getDB();
  return [...db.manga]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, count);
}

export async function fetchLatestUpdated(count = 12): Promise<Manga[]> {
  const db = await getDB();
  return [...db.manga]
    .sort((a, b) => b.latestChapter.number - a.latestChapter.number)
    .slice(0, count);
}
