import '../api/api_client.dart';
import '../auth/auth_controller.dart';

class AppNotification {
  AppNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    required this.read,
    this.createdAt,
    this.data = const {},
  });

  final String id;
  final String type;
  final String title;
  final String body;
  final bool read;
  final DateTime? createdAt;
  final Map<String, dynamic> data;

  factory AppNotification.fromJson(Map<String, dynamic> j) {
    DateTime? at;
    try {
      if (j['createdAt'] != null) at = DateTime.parse('${j['createdAt']}');
    } catch (_) {}
    return AppNotification(
      id: '${j['id'] ?? ''}',
      type: '${j['type'] ?? ''}',
      title: '${j['title'] ?? ''}',
      body: '${j['body'] ?? ''}',
      read: j['read'] == true,
      createdAt: at,
      data: j['data'] is Map ? Map<String, dynamic>.from(j['data'] as Map) : const {},
    );
  }
}

final notificationService = _NotificationService(authController.api);

class _NotificationService {
  _NotificationService(this._api);
  final ApiClient _api;

  Future<({List<AppNotification> items, int unread})> fetch() async {
    final res = await _api.request('/notifications?limit=50') as Map<String, dynamic>;
    final items = (res['items'] as List? ?? [])
        .whereType<Map>()
        .map((e) => AppNotification.fromJson(Map<String, dynamic>.from(e)))
        .toList();
    return (items: items, unread: (res['unreadCount'] as num?)?.toInt() ?? 0);
  }

  Future<void> markAllRead() async {
    await _api.request('/notifications/read-all', method: 'POST');
  }
}
