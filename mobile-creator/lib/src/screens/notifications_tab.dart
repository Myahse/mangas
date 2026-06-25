import 'package:flutter/material.dart';

import '../theme/creator_theme.dart';
import '../notifications/notification_service.dart';

class NotificationsTab extends StatefulWidget {
  const NotificationsTab({super.key, required this.onChanged});
  final VoidCallback onChanged;

  @override
  State<NotificationsTab> createState() => _NotificationsTabState();
}

class _NotificationsTabState extends State<NotificationsTab> {
  List<AppNotification> _items = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await notificationService.fetch();
      if (mounted) setState(() {
        _items = res.items;
        _loading = false;
      });
      widget.onChanged();
    } catch (_) {
      if (mounted) setState(() {
        _items = [];
        _loading = false;
      });
    }
  }

  IconData _icon(String type) {
    switch (type) {
      case 'NEW_MANGA':
      case 'NEW_CHAPTER':
        return Icons.auto_stories;
      case 'ANNOUNCEMENT':
        return Icons.campaign;
      case 'PAYMENT':
        return Icons.payments;
      case 'SUBSCRIPTION':
        return Icons.lock_open;
      case 'READERS':
        return Icons.people;
      default:
        return Icons.notifications;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          TextButton(onPressed: () async {
            await notificationService.markAllRead();
            _load();
          }, child: const Text('Tout lire')),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: _items.isEmpty
                  ? ListView(children: [
                      Padding(
                        padding: const EdgeInsets.all(32),
                        child: Center(child: Text('Annonces, paiements, lecteurs…', style: TextStyle(color: CreatorColors.textMuted))),
                      ),
                    ])
                  : ListView.separated(
                      itemCount: _items.length,
                      separatorBuilder: (_, __) => const Divider(height: 1),
                      itemBuilder: (context, i) {
                        final n = _items[i];
                        return ListTile(
                          leading: Icon(_icon(n.type), color: CreatorColors.primary),
                          title: Text(n.title, style: TextStyle(fontWeight: n.read ? FontWeight.w600 : FontWeight.w800)),
                          subtitle: Text(n.body, maxLines: 2, overflow: TextOverflow.ellipsis),
                          trailing: n.read ? null : const Icon(Icons.circle, size: 8, color: CreatorColors.accent),
                        );
                      },
                    ),
            ),
    );
  }
}
