import '../api/api_client.dart';
import '../auth/auth_controller.dart';
import 'notification_models.dart';

final notificationService = NotificationService(authController.api);

class NotificationService {
  NotificationService(this._api);

  final ApiClient _api;

  Future<({List<AppNotification> items, int unreadCount})> fetch({int limit = 50}) async {
    final res = await _api.request('/notifications?limit=$limit', auth: true) as Map<String, dynamic>;
    final raw = res['items'];
    final items = raw is List
        ? raw.whereType<Map>().map((e) => AppNotification.fromJson(Map<String, dynamic>.from(e))).toList()
        : <AppNotification>[];
    final unread = (res['unreadCount'] as num?)?.toInt() ?? 0;
    return (items: items, unreadCount: unread);
  }

  Future<int> unreadCount() async {
    final res = await _api.request('/notifications/unread-count', auth: true) as Map<String, dynamic>;
    return (res['count'] as num?)?.toInt() ?? 0;
  }

  Future<void> markRead(String id) async {
    await _api.request('/notifications/$id/read', method: 'POST', auth: true);
  }

  Future<void> markAllRead() async {
    await _api.request('/notifications/read-all', method: 'POST', auth: true);
  }
}
