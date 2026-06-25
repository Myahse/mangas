import 'package:flutter/material.dart';

import '../notifications/notification_service.dart';
import 'stats_tab.dart';
import 'episodes_tab.dart';
import 'notifications_tab.dart';
import 'profile_tab.dart';

class CreatorShell extends StatefulWidget {
  const CreatorShell({super.key});

  @override
  State<CreatorShell> createState() => _CreatorShellState();
}

class _CreatorShellState extends State<CreatorShell> {
  int _index = 0;
  int _unread = 0;

  @override
  void initState() {
    super.initState();
    _refreshUnread();
  }

  Future<void> _refreshUnread() async {
    try {
      final res = await notificationService.fetch();
      if (mounted) setState(() => _unread = res.unread);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _index,
        children: [
          StatsTab(onRefreshParent: _refreshUnread),
          const EpisodesTab(),
          NotificationsTab(onChanged: _refreshUnread),
          const ProfileTab(),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: [
          const NavigationDestination(icon: Icon(Icons.analytics_outlined), selectedIcon: Icon(Icons.analytics), label: 'Stats'),
          const NavigationDestination(icon: Icon(Icons.article_outlined), selectedIcon: Icon(Icons.article), label: 'Épisodes'),
          NavigationDestination(
            icon: Badge(isLabelVisible: _unread > 0, label: Text('$_unread'), child: const Icon(Icons.notifications_outlined)),
            selectedIcon: Badge(isLabelVisible: _unread > 0, label: Text('$_unread'), child: const Icon(Icons.notifications)),
            label: 'Alertes',
          ),
          const NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Profil'),
        ],
      ),
    );
  }
}
