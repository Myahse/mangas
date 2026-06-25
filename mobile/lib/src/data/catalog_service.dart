import '../api/api_client.dart';
import '../auth/auth_controller.dart';
import 'models.dart';

final CatalogService catalogService = CatalogService();

class CatalogService {
  ApiClient get _c => authController.api;

  Future<List<Manga>> fetchAllManga() async {
    final list = await _c.request('/manga') as List<dynamic>;
    return list.map((e) => Manga.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }

  Future<Manga> fetchMangaBySlug(String slug) async {
    final j = await _c.request('/manga/${Uri.encodeComponent(slug)}') as Map<String, dynamic>;
    return Manga.fromJson(j);
  }

  Future<List<Manga>> fetchFeaturedManga() async {
    final list = await _c.request('/manga/featured') as List<dynamic>;
    return list.map((e) => Manga.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }

  Future<List<Manga>> fetchPopularManga({int count = 10}) async {
    final list = await _c.request('/manga/popular?count=$count') as List<dynamic>;
    return list.map((e) => Manga.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }

  Future<List<Manga>> fetchLatestUpdated({int count = 12}) async {
    final list = await _c.request('/manga/latest?count=$count') as List<dynamic>;
    return list.map((e) => Manga.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }

  Future<List<String>> fetchGenres() async {
    final list = await _c.request('/genres') as List<dynamic>;
    return list.map((e) => '$e').toList();
  }

  Future<List<ChapterItem>> fetchChapters(String slug) async {
    final list = await _c.request('/manga/${Uri.encodeComponent(slug)}/chapters') as List<dynamic>;
    final out = list.map((e) => ChapterItem.fromJson(Map<String, dynamic>.from(e as Map))).toList();
    out.sort((a, b) => a.number.compareTo(b.number));
    return out;
  }

  Future<List<PageItem>> fetchPages(String slug, int chapterNumber) async {
    final list = await _c.request(
      '/manga/${Uri.encodeComponent(slug)}/chapters/$chapterNumber/pages',
    ) as List<dynamic>;
    return list.map((e) => PageItem.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }

  Future<void> pingHealth() async {
    await _c.request('/health', auth: false);
  }

  Future<Map<String, dynamic>> fetchWallet() async {
    final j = await _c.request('/wallet') as Map<String, dynamic>;
    return j;
  }

  Future<List<Manga>> fetchNewestSeries({int count = 8}) async {
    final list = await fetchSearchManga(sort: 'new');
    return list.take(count).toList();
  }

  /// Same filtering rules as [fetchSearchManga] in `front/src/services/api.js`.
  Future<List<Manga>> fetchSearchManga({
    String query = '',
    String genre = '',
    String status = '',
    String sort = 'popular',
  }) async {
    var list = await fetchAllManga();
    final q = query.trim().toLowerCase();
    if (q.isNotEmpty) {
      list = list
          .where(
            (m) =>
                m.title.toLowerCase().contains(q) ||
                m.author.toLowerCase().contains(q) ||
                m.genres.any((g) => g.toLowerCase().contains(q)),
          )
          .toList();
    }
    if (genre.isNotEmpty) list = list.where((m) => m.genres.contains(genre)).toList();
    if (status.isNotEmpty && status != 'Tous') list = list.where((m) => m.status == status).toList();

    switch (sort) {
      case 'rating':
        list = [...list]..sort((a, b) => b.rating.compareTo(a.rating));
        break;
      case 'latest':
        list = [...list]..sort((a, b) => b.latestChapter.number.compareTo(a.latestChapter.number));
        break;
      case 'new':
        list = [...list]..sort((a, b) => b.year.compareTo(a.year));
        break;
      case 'az':
        list = [...list]..sort((a, b) => a.title.compareTo(b.title));
        break;
      default:
        list = [...list]..sort((a, b) => b.rating.compareTo(a.rating));
    }
    return list;
  }
}
