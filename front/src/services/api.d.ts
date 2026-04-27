export function registerUser(payload: any): Promise<any>;
export function loginUser(payload: any): Promise<any>;
export function changePassword(payload: any): Promise<any>;
export function submitCreatorRequest(payload: any): Promise<any>;

export function fetchAllManga(): Promise<any>;
export function fetchMangaBySlug(slug: string): Promise<any>;
export function fetchFeaturedManga(): Promise<any>;
export function fetchLatestUpdated(count?: number): Promise<any>;
export function fetchPopularManga(count?: number): Promise<any>;
export function fetchSearchManga(args?: any): Promise<any>;
export function fetchGenres(): Promise<any>;
export function fetchChapters(slug: string): Promise<any>;
export function fetchPages(slug: string, chapterNumber: number): Promise<any>;
export function useFetch(fetchFn: any, ...args: any[]): any;

