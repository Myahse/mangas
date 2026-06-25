import { ChapterSummary, Manga } from '@/src/types/manga';
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

export async function fetchChapters(slug: string): Promise<ChapterSummary[]> {
  const manga = await fetchMangaBySlug(slug);
  const max = Math.min(manga.totalChapters, 48);
  return Array.from({ length: max }, (_, i) => {
    const number = i + 1;
    const title =
      number === manga.latestChapter.number ? manga.latestChapter.title : `Chapitre ${number}`;
    return { number, title };
  });
}

export async function fetchPages(slug: string, chapter: number): Promise<{ url: string }[]> {
  const manga = await fetchMangaBySlug(slug);
  const fromLocal = manga.localChapters?.[String(chapter)];
  const pageCount = typeof fromLocal === 'number' ? fromLocal : 8;
  return Array.from({ length: pageCount }, (_, i) => ({
    url: `https://picsum.photos/seed/${encodeURIComponent(slug)}-ch${chapter}-p${i + 1}/800/1200`,
  }));
}
