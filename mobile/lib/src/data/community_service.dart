import '../api/api_client.dart';
import '../auth/auth_controller.dart';
import 'models.dart';

final CommunityService communityService = CommunityService();

/// A series the reader started: where to resume (same API as the web "Reprendre la lecture").
class ReadingProgress {
  ReadingProgress({
    required this.slug,
    required this.title,
    required this.cover,
    required this.chapterNumber,
    required this.page,
    required this.pageCount,
    required this.resumeChapter,
    required this.resumePage,
    required this.caughtUp,
  });

  final String slug;
  final String title;
  final String cover;
  final int chapterNumber;
  final int page; // 0-based
  final int pageCount;
  final int resumeChapter;
  final int resumePage; // 0-based
  final bool caughtUp;

  factory ReadingProgress.fromJson(Map<String, dynamic> j) {
    int n(Object? v) => v is num ? v.toInt() : int.tryParse('$v') ?? 0;
    return ReadingProgress(
      slug: '${j['slug'] ?? ''}',
      title: '${j['title'] ?? ''}',
      cover: '${j['cover'] ?? ''}',
      chapterNumber: n(j['chapterNumber']),
      page: n(j['page']),
      pageCount: n(j['pageCount']),
      resumeChapter: n(j['resumeChapter']),
      resumePage: n(j['resumePage']),
      caughtUp: j['caughtUp'] == true,
    );
  }
}

class ChapterComment {
  ChapterComment({
    required this.id,
    required this.author,
    required this.text,
    required this.createdAt,
    required this.likes,
    required this.liked,
    required this.mine,
  });

  final String id;
  final String author;
  final String text;
  final DateTime? createdAt;
  int likes;
  bool liked;
  final bool mine;

  factory ChapterComment.fromJson(Map<String, dynamic> j) => ChapterComment(
        id: '${j['id']}',
        author: '${j['author'] ?? 'Lecteur'}',
        text: '${j['text'] ?? ''}',
        createdAt: DateTime.tryParse('${j['createdAt'] ?? ''}'),
        likes: (j['likes'] as num?)?.toInt() ?? 0,
        liked: j['liked'] == true,
        mine: j['mine'] == true,
      );
}

class CommentsPage {
  CommentsPage(this.enabled, this.canModerate, this.items);
  final bool enabled;
  final bool canModerate;
  final List<ChapterComment> items;
}

/// Reading progress, streaks, follows, comments and server search (same endpoints as the website).
class CommunityService {
  ApiClient get _c => authController.api;

  String _chapter(String slug, int chapter) => '/manga/${Uri.encodeComponent(slug)}/chapters/$chapter';

  /* ─── Reading progress and streak ─── */

  Future<List<ReadingProgress>> fetchProgress({int limit = 8}) async {
    final list = await _c.request('/reading-progress?limit=$limit') as List<dynamic>;
    return list.map((e) => ReadingProgress.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }

  /// page is 0-based. Errors are ignored: a failed save must not interrupt reading.
  Future<void> saveProgress(String slug, int chapter, int page, int pageCount) async {
    try {
      await _c.request('/reading-progress/${Uri.encodeComponent(slug)}',
          method: 'PUT', body: {'chapterNumber': chapter, 'page': page, 'pageCount': pageCount});
    } catch (_) {}
  }

  /// Counts the view and the reading day; returns the coins earned by the streak today (usually 0).
  Future<int> recordView(String slug, int chapter) async {
    try {
      final res = await _c.request('${_chapter(slug, chapter)}/view', method: 'POST') as Map<String, dynamic>;
      return (res['streakReward'] as num?)?.toInt() ?? 0;
    } catch (_) {
      return 0;
    }
  }

  Future<Map<String, dynamic>> fetchStreak() async =>
      Map<String, dynamic>.from(await _c.request('/reading-streak') as Map);

  /* ─── Follows ─── */

  Future<bool> isFollowing(String slug) async {
    final res = await _c.request('/follows/${Uri.encodeComponent(slug)}') as Map<String, dynamic>;
    return res['following'] == true;
  }

  Future<bool> setFollowing(String slug, bool follow) async {
    final res = await _c.request('/follows/${Uri.encodeComponent(slug)}', method: follow ? 'PUT' : 'DELETE')
        as Map<String, dynamic>;
    return res['following'] == true;
  }

  Future<List<Map<String, dynamic>>> fetchFollowed() async {
    final list = await _c.request('/follows') as List<dynamic>;
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  /* ─── Comments ─── */

  Future<CommentsPage> fetchComments(String slug, int chapter) async {
    final res = Map<String, dynamic>.from(await _c.request('${_chapter(slug, chapter)}/comments') as Map);
    final items = (res['items'] as List? ?? [])
        .map((e) => ChapterComment.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
    return CommentsPage(res['enabled'] != false, res['canModerate'] == true, items);
  }

  Future<void> postComment(String slug, int chapter, String text) async {
    await _c.request('${_chapter(slug, chapter)}/comments', method: 'POST', body: {'text': text});
  }

  Future<({bool liked, int likes})> toggleLike(String commentId) async {
    final res = await _c.request('/comments/${Uri.encodeComponent(commentId)}/like', method: 'POST') as Map<String, dynamic>;
    return (liked: res['liked'] == true, likes: (res['likes'] as num?)?.toInt() ?? 0);
  }

  Future<void> deleteComment(String commentId) async {
    await _c.request('/comments/${Uri.encodeComponent(commentId)}', method: 'DELETE');
  }

  /* ─── Search ─── */

  /// Server search: accents and case ignored, a typo forgiven, ranked by relevance.
  Future<List<Manga>> search(String query, {int limit = 30}) async {
    final q = query.trim();
    if (q.isEmpty) return [];
    final list = await _c.request('/manga/search?q=${Uri.encodeQueryComponent(q)}&limit=$limit') as List<dynamic>;
    return list.map((e) => Manga.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }
}
