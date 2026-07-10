import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../api/auth_errors.dart';
import '../auth/auth_controller.dart';
import '../data/catalog_service.dart';
import '../notifications/notification_controller.dart';
import '../data/models.dart';
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
  int? _walletBalance;

  @override
  void initState() {
    super.initState();
    authController.addListener(_onAuthChanged);
    notificationController.startPolling();
    _refreshWallet();
  }

  @override
  void dispose() {
    authController.removeListener(_onAuthChanged);
    notificationController.disposePolling();
    super.dispose();
  }

  void _onAuthChanged() => _refreshWallet();

  Future<void> _refreshWallet() async {
    if (!authController.isAuthenticated) {
      if (mounted) setState(() => _walletBalance = null);
      return;
    }
    try {
      final w = await catalogService.fetchWallet();
      final b = (w['balance'] as num?)?.toInt();
      if (mounted) setState(() => _walletBalance = b);
    } catch (e) {
      if (isAuthError(e)) await handleApiAuthError(e);
      if (mounted) setState(() => _walletBalance = null);
    }
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
    return ListenableBuilder(
      listenable: authController,
      builder: (context, _) {
        final authed = authController.isAuthenticated;
        final tab = widget.navigationShell.currentIndex;

        return Scaffold(
          backgroundColor: Theme.of(context).scaffoldBackgroundColor,
          body: Column(
            children: [
              AppNavbar(
                onSearch: _openSearch,
                onHome: _goHome,
              ),
              if (authed && _walletBalance != null && tab != 3)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
                  color: AppColors.bgWhite,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      InkWell(
                        onTap: () => _onBottomNavTap(3),
                        borderRadius: BorderRadius.circular(20),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: AppColors.primary.withValues(alpha: 0.25)),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.monetization_on, size: 15, color: AppColors.primary),
                              const SizedBox(width: 4),
                              Text(
                                '$_walletBalance coins',
                                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12, color: AppColors.primary),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
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
      },
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
