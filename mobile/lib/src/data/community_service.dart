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

/// "Les lecteurs votent la suite": the creator's question at the end of a chapter.
class ChapterPoll {
  ChapterPoll(this.raw);
  final Map<String, dynamic> raw;

  String get id => '${raw['id']}';
  String get question => '${raw['question'] ?? ''}';
  bool get open => raw['status'] == 'open';
  List<Map<String, dynamic>> get options =>
      (raw['options'] as List? ?? []).map((e) => Map<String, dynamic>.from(e as Map)).toList();
  /// Null until the reader voted (results stay hidden before that).
  int? get totalVotes => (raw['totalVotes'] as num?)?.toInt();
  int get myVotes => (raw['myVotes'] as num?)?.toInt() ?? 0;
  String? get myOptionId => raw['myOptionId'] as String?;
  String? get winnerOptionId => raw['winnerOptionId'] as String?;
  int get boostCost => (raw['boostCost'] as num?)?.toInt() ?? 0;
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
      final res = await _c.request('${_chapter(slug, chapter)}/view', method: 'POST', optionalAuth: true) as Map<String, dynamic>;
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
    final res = Map<String, dynamic>.from(await _c.request('${_chapter(slug, chapter)}/comments', optionalAuth: true) as Map);
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

  /* ─── Community translations and cultural notes ─── */

  /// Languages with at least one approved bubble: [{code, name, translated, bubbles}].
  Future<List<Map<String, dynamic>>> fetchChapterLanguages(String slug, int chapter) async {
    final list = await _c.request('${_chapter(slug, chapter)}/languages', auth: false) as List<dynamic>;
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  /// Translated bubbles: page is 1-based, x/y/w/h are percentages of the page image.
  Future<List<Map<String, dynamic>>> fetchBubbles(String slug, int chapter, String lang) async {
    final res = await _c.request('${_chapter(slug, chapter)}/bubbles?lang=${Uri.encodeQueryComponent(lang)}', auth: false)
        as Map<String, dynamic>;
    return (res['bubbles'] as List? ?? []).map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  /// Approved cultural notes, placed like bubbles.
  Future<List<Map<String, dynamic>>> fetchNotes(String slug, int chapter) async {
    final list = await _c.request('${_chapter(slug, chapter)}/notes', auth: false) as List<dynamic>;
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  /* ─── Polls ─── */

  /// Null when the chapter has no poll (the API answers 204).
  Future<ChapterPoll?> fetchPoll(String slug, int chapter) async {
    final res = await _c.request('${_chapter(slug, chapter)}/poll', optionalAuth: true);
    return res is Map ? ChapterPoll(Map<String, dynamic>.from(res)) : null;
  }

  /// extraVotes > 0 buys more votes for the reader's choice with coins.
  Future<ChapterPoll> vote(String pollId, String optionId, {int extraVotes = 0}) async {
    final res = await _c.request('/polls/${Uri.encodeComponent(pollId)}/vote',
        method: 'POST', body: {'optionId': optionId, 'extraVotes': extraVotes});
    return ChapterPoll(Map<String, dynamic>.from(res as Map));
  }

  /* ─── Search ─── */

  /// Server search: accents and case ignored, a typo forgiven, ranked by relevance.
  Future<List<Manga>> search(String query, {int limit = 30}) async {
    final q = query.trim();
    if (q.isEmpty) return [];
    final list = await _c.request('/manga/search?q=${Uri.encodeQueryComponent(q)}&limit=$limit', optionalAuth: true) as List<dynamic>;
    return list.map((e) => Manga.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }
}
