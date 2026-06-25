import '../api/api_client.dart';
import '../auth/auth_controller.dart';

final creatorApi = CreatorApiService(authController.api);

class CreatorStats {
  CreatorStats({
    required this.totalReaders,
    required this.totalMangaViews,
    required this.totalEpisodeViews,
    required this.publishedMangaCount,
    required this.publishedEpisodeCount,
    required this.unreadNotifications,
  });

  final int totalReaders;
  final int totalMangaViews;
  final int totalEpisodeViews;
  final int publishedMangaCount;
  final int publishedEpisodeCount;
  final int unreadNotifications;

  factory CreatorStats.fromJson(Map<String, dynamic> j) => CreatorStats(
        totalReaders: (j['totalReaders'] as num?)?.toInt() ?? 0,
        totalMangaViews: (j['totalMangaViews'] as num?)?.toInt() ?? 0,
        totalEpisodeViews: (j['totalEpisodeViews'] as num?)?.toInt() ?? 0,
        publishedMangaCount: (j['publishedMangaCount'] as num?)?.toInt() ?? 0,
        publishedEpisodeCount: (j['publishedEpisodeCount'] as num?)?.toInt() ?? 0,
        unreadNotifications: (j['unreadNotifications'] as num?)?.toInt() ?? 0,
      );
}

class CreatorApiService {
  CreatorApiService(this._api);
  final ApiClient _api;

  Future<CreatorStats> stats() async {
    final res = await _api.request('/creator/stats') as Map<String, dynamic>;
    return CreatorStats.fromJson(res);
  }

  Future<List<Map<String, dynamic>>> publishedEpisodes() async {
    final res = await _api.request('/creator/episodes/published');
    if (res is List) return res.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
    return [];
  }

  Future<Map<String, dynamic>?> financeDashboard() async {
    final res = await _api.request('/creator/finance/dashboard');
    return res is Map ? Map<String, dynamic>.from(res) : null;
  }
}
