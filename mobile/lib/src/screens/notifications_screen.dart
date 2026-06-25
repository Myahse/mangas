import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../notifications/notification_controller.dart';
import '../notifications/notification_models.dart';
import '../theme.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  @override
  void initState() {
    super.initState();
    notificationController.refresh();
  }

  IconData _icon(AppNotification n) {
    switch (n.iconHint) {
      case IconHint.manga:
        return Icons.auto_stories_outlined;
      case IconHint.announce:
        return Icons.campaign_outlined;
      case IconHint.payment:
        return Icons.payments_outlined;
      case IconHint.subscription:
        return Icons.lock_open_outlined;
      case IconHint.readers:
        return Icons.people_outline;
      case IconHint.info:
        return Icons.notifications_outlined;
    }
  }

  Color _accent(AppNotification n) {
    switch (n.iconHint) {
      case IconHint.payment:
        return const Color(0xFF16A34A);
      case IconHint.announce:
        return const Color(0xFF2563EB);
      case IconHint.readers:
        return const Color(0xFF9333EA);
      default:
        return AppColors.primary;
    }
  }

  void _openNotification(AppNotification n) async {
    await notificationController.markRead(n);
    if (!mounted) return;
    final slug = n.mangaSlug;
    if (slug != null && slug.isNotEmpty) {
      final ch = n.chapter;
      if (ch != null && ch > 0) {
        context.push('/manga/$slug/chapter/$ch');
      } else {
        context.push('/manga/$slug');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          TextButton(
            onPressed: () => notificationController.markAllRead(),
            child: const Text('Tout lire'),
          ),
        ],
      ),
      body: ListenableBuilder(
        listenable: notificationController,
        builder: (context, _) {
          if (notificationController.loading && notificationController.items.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }
          final items = notificationController.items;
          if (items.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.notifications_none, size: 48, color: AppColors.textMuted),
                    const SizedBox(height: 12),
                    Text(
                      'Aucune notification',
                      style: TextStyle(color: AppColors.textMuted, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Nouveaux mangas, annonces, paiements et abonnements apparaîtront ici.',
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: () => notificationController.refresh(),
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(vertical: 8),
              itemCount: items.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (context, i) {
                final n = items[i];
                return ListTile(
                  leading: CircleAvatar(
                    backgroundColor: _accent(n).withValues(alpha: 0.12),
                    child: Icon(_icon(n), color: _accent(n), size: 22),
                  ),
                  title: Text(
                    n.title,
                    style: TextStyle(fontWeight: n.read ? FontWeight.w600 : FontWeight.w800),
                  ),
                  subtitle: Text(n.body, maxLines: 2, overflow: TextOverflow.ellipsis),
                  trailing: n.read
                      ? null
                      : Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle),
                        ),
                  onTap: () => _openNotification(n),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
