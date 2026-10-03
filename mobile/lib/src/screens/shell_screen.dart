import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../data/catalog_service.dart';
import '../data/models.dart';
import '../notifications/notification_controller.dart';
import '../widgets/app_bottom_nav.dart';
import '../widgets/app_navbar.dart';
import '../widgets/info_bar.dart';
import '../theme.dart';

class ReaderShellScreen extends StatefulWidget {
  const ReaderShellScreen({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  @override
  State<ReaderShellScreen> createState() => _ReaderShellScreenState();
}

class _ReaderShellScreenState extends State<ReaderShellScreen> {
  @override
  void initState() {
    super.initState();
    notificationController.startPolling();
  }

  @override
  void dispose() {
    notificationController.disposePolling();
    super.dispose();
  }

  Future<void> _openSearch() async {
    final slug = await showSearch<String>(
      context: context,
      delegate: _MangaSearchDelegate(),
    );
    if (!mounted || slug == null || slug.isEmpty) return;
    context.push('/manga/$slug');
  }

  void _goHome() {
    widget.navigationShell.goBranch(0, initialLocation: true);
    context.go('/home');
  }

  void _onBottomNavTap(int index) {
    widget.navigationShell.goBranch(index, initialLocation: index == widget.navigationShell.currentIndex);
    switch (index) {
      case 0:
        context.go('/home');
      case 1:
        context.go('/explore');
      case 2:
        context.go('/compte');
      case 3:
        context.go('/store');
      case 4:
        context.go('/contact');
    }
  }

  @override
  Widget build(BuildContext context) {
    final tab = widget.navigationShell.currentIndex;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: Column(
        children: [
          AppNavbar(
            compact: true,
            onSearch: _openSearch,
            onHome: _goHome,
          ),
          if (tab <= 1) const InfoBar(),
          Expanded(child: widget.navigationShell),
        ],
      ),
      bottomNavigationBar: AppBottomNav(
        currentIndex: tab,
        onTap: _onBottomNavTap,
      ),
    );
  }
}

class _MangaSearchDelegate extends SearchDelegate<String> {
  _MangaSearchDelegate() : _catalog = catalogService.fetchAllManga();

  final Future<List<Manga>> _catalog;

  @override
  String get searchFieldLabel => 'Rechercher…';

  @override
  ThemeData appBarTheme(BuildContext context) {
    final theme = Theme.of(context);
    return theme.copyWith(
      appBarTheme: theme.appBarTheme.copyWith(backgroundColor: AppColors.bgWhite),
    );
  }

  @override
  List<Widget>? buildActions(BuildContext context) {
    return [
      if (query.isNotEmpty)
        IconButton(
          icon: const Icon(Icons.clear),
          onPressed: () {
            query = '';
            showSuggestions(context);
          },
        ),
    ];
  }

  @override
  Widget? buildLeading(BuildContext context) {
    return IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => Navigator.of(context).pop());
  }

  @override
  Widget buildResults(BuildContext context) => buildSuggestions(context);

  @override
  Widget buildSuggestions(BuildContext context) {
    if (query.trim().isEmpty) {
      return const Center(child: Text('Tapez un titre ou un auteur'));
    }
    return FutureBuilder<List<Manga>>(
      future: _catalog,
      builder: (context, snap) {
        if (!snap.hasData) {
          return const Center(child: CircularProgressIndicator());
        }
        final q = query.toLowerCase().trim();
        final list = snap.data!
            .where((m) => m.title.toLowerCase().contains(q) || m.author.toLowerCase().contains(q))
            .take(12)
            .toList();
        if (list.isEmpty) {
          return const Center(child: Text('Aucun résultat'));
        }
        return ListView.builder(
          itemCount: list.length,
          itemBuilder: (context, i) {
            final m = list[i];
            return ListTile(
              title: Text(m.title, style: const TextStyle(fontWeight: FontWeight.w700)),
              subtitle: Text(m.author),
              onTap: () => close(context, m.slug),
            );
          },
        );
      },
    );
  }
}
