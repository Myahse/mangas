export type MangaStatus = 'Ongoing' | 'Completed' | 'Hiatus';

export interface LatestChapter {
  number: number;
  title: string;
  date: string;
}

export interface Manga {
  id: number;
  title: string;
  slug: string;
  author: string;
  artist: string;
  cover: string;
  banner: string;
  heroCover?: string;
  genres: string[];
  rating: number;
  totalChapters: number;
  latestChapter: LatestChapter;
  status: MangaStatus;
  views: string;
  synopsis: string;
  featured: boolean;
  year: number;
  localChapters?: Record<string, number>;
}

export interface MangaDB {
  manga: Manga[];
  genres: string[];
}
