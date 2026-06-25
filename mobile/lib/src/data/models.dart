class LatestChapter {
  const LatestChapter({
    required this.number,
    required this.title,
    required this.date,
  });

  final int number;
  final String title;
  final String date;

  factory LatestChapter.fromJson(Map<String, dynamic>? j) {
    if (j == null) {
      return const LatestChapter(number: 0, title: '', date: '');
    }
    return LatestChapter(
      number: (j['number'] as num?)?.toInt() ?? 0,
      title: '${j['title'] ?? ''}',
      date: '${j['date'] ?? ''}',
    );
  }
}

class Manga {
  const Manga({
    required this.id,
    required this.title,
    required this.slug,
    required this.author,
    required this.cover,
    required this.banner,
    required this.heroCover,
    required this.genres,
    required this.rating,
    required this.totalChapters,
    required this.latestChapter,
    required this.status,
    required this.views,
    required this.synopsis,
    required this.featured,
    required this.year,
    this.localChapters,
  });

  final String id;
  final String title;
  final String slug;
  final String author;
  final String cover;
  final String banner;
  final String heroCover;
  final List<String> genres;
  final double rating;
  final int totalChapters;
  final LatestChapter latestChapter;
  final String status;
  final String views;
  final String synopsis;
  final bool featured;
  final int year;
  final Map<String, int>? localChapters;

  factory Manga.fromJson(Map<String, dynamic> j) {
    final hero = j['heroCover'] ?? j['hero_cover'];
    final heroStr = hero is String && hero.startsWith('http') ? hero : '${j['cover'] ?? ''}';
    return Manga(
      id: '${j['id'] ?? ''}',
      title: '${j['title'] ?? ''}',
      slug: '${j['slug'] ?? ''}',
      author: '${j['author'] ?? ''}',
      cover: '${j['cover'] ?? ''}',
      banner: '${j['banner'] ?? ''}',
      heroCover: heroStr,
      genres: (j['genres'] as List<dynamic>?)?.map((e) => '$e').toList() ?? const [],
      rating: (j['rating'] as num?)?.toDouble() ?? 0,
      totalChapters: (j['totalChapters'] as num?)?.toInt() ?? (j['total_chapters'] as num?)?.toInt() ?? 0,
      latestChapter: LatestChapter.fromJson(j['latestChapter'] as Map<String, dynamic>?),
      status: '${j['status'] ?? ''}',
      views: '${j['views'] ?? ''}',
      synopsis: '${j['synopsis'] ?? ''}',
      featured: j['featured'] == true,
      year: (j['year'] as num?)?.toInt() ?? 0,
      localChapters: j['localChapters'] != null || j['local_chapters'] != null
          ? Map<String, int>.from(
              ((j['localChapters'] ?? j['local_chapters']) as Map).map(
                (k, v) => MapEntry('$k', (v as num).toInt()),
              ),
            )
          : null,
    );
  }
}

class ChapterItem {
  const ChapterItem({required this.number, required this.title, required this.date, required this.pages});

  final int number;
  final String title;
  final String date;
  final int pages;

  factory ChapterItem.fromJson(Map<String, dynamic> j) {
    return ChapterItem(
      number: (j['number'] as num).toInt(),
      title: '${j['title'] ?? ''}',
      date: '${j['date'] ?? ''}',
      pages: (j['pages'] as num?)?.toInt() ?? 0,
    );
  }
}

class PageItem {
  const PageItem({required this.number, required this.url});

  final int number;
  final String url;

  factory PageItem.fromJson(Map<String, dynamic> j) {
    return PageItem(
      number: (j['number'] as num?)?.toInt() ?? 0,
      url: '${j['url'] ?? ''}',
    );
  }
}
