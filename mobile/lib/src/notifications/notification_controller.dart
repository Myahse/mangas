import 'dart:async';

import 'package:flutter/foundation.dart';

import '../auth/auth_controller.dart';
import 'notification_models.dart';
import 'notification_service.dart';

final notificationController = NotificationController();

class NotificationController extends ChangeNotifier {
  List<AppNotification> _items = [];
  int _unread = 0;
  bool _loading = false;
  Timer? _pollTimer;

  List<AppNotification> get items => _items;
  int get unreadCount => _unread;
  bool get loading => _loading;

  void startPolling() {
    authController.addListener(_onAuth);
    _onAuth();
  }

  void disposePolling() {
    _pollTimer?.cancel();
    authController.removeListener(_onAuth);
  }

  void _onAuth() {
    _pollTimer?.cancel();
    if (!authController.isAuthenticated) {
      _items = [];
      _unread = 0;
      notifyListeners();
      return;
    }
    refresh();
    _pollTimer = Timer.periodic(const Duration(seconds: 45), (_) => refresh(silent: true));
  }

  Future<void> refresh({bool silent = false}) async {
    if (!authController.isAuthenticated) return;
    if (!silent) {
      _loading = true;
      notifyListeners();
    }
    try {
      final res = await notificationService.fetch();
      _items = res.items;
      _unread = res.unreadCount;
    } catch (_) {
      if (!silent) {
        _items = [];
        _unread = 0;
      }
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> markRead(AppNotification n) async {
    if (n.read) return;
    try {
      await notificationService.markRead(n.id);
      _unread = (_unread - 1).clamp(0, 9999);
      _items = _items.map((x) => x.id == n.id ? AppNotification(
        id: x.id,
        type: x.type,
        title: x.title,
        body: x.body,
        read: true,
        createdAt: x.createdAt,
        data: x.data,
      ) : x).toList();
      notifyListeners();
    } catch (_) {}
  }

  Future<void> markAllRead() async {
    try {
      await notificationService.markAllRead();
      _unread = 0;
      _items = _items
          .map((x) => AppNotification(
                id: x.id,
                type: x.type,
                title: x.title,
                body: x.body,
                read: true,
                createdAt: x.createdAt,
                data: x.data,
              ))
          .toList();
      notifyListeners();
    } catch (_) {}
  }
}
